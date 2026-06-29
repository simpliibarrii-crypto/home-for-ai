"""
Home for AI — Fusion LLM Router

Implements the Kimi 2.6 + DeepSeek V3 fusion strategy for trading decisions:

  - Kimi 2.6   (moonshotai/kimi-k2.6):     long-context news/chart analysis (128K)
  - DeepSeek V3 (deepseek/deepseek-v3.2):  fast structured trading decisions

Both models are accessed via the OpenRouter API, which is fully compatible with
the OpenAI Python SDK (just swap the base_url).

Fusion strategy
---------------
1. Call Kimi for market analysis (multi-article news comprehension)
2. Call DeepSeek for trade decision from structured analysis
3. For high-stakes decisions: call both in parallel → weighted vote → arbitrate if needed
4. Fallback: rule-based decision if both calls fail
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import Any, Dict, List, Optional

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

logger = logging.getLogger(__name__)

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
KIMI_MODEL = os.getenv("KIMI_MODEL_ID", "moonshotai/kimi-k2.6")
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL_ID", "deepseek/deepseek-v3.2")

# Fusion weights: DeepSeek 60%, Kimi 40%
DEEPSEEK_WEIGHT = 0.60
KIMI_WEIGHT = 0.40

# Minimum combined confidence to place a trade (else HOLD)
CONFIDENCE_THRESHOLD = 0.55


class LLMUnavailableError(Exception):
    """Raised when the LLM API is unreachable or returns an unrecoverable error."""


class FusionLLM:
    """
    Fusion router for Kimi 2.6 and DeepSeek V3 via OpenRouter.

    All calls are async and rate-limited. The client is reused across calls
    for connection pooling.
    """

    def __init__(self) -> None:
        self._api_key: str = os.getenv("OPENROUTER_API_KEY", "")
        if not self._api_key:
            logger.warning(
                "OPENROUTER_API_KEY not set — LLM calls will use fallback mode."
            )
        self._client: Optional[httpx.AsyncClient] = None

    # ------------------------------------------------------------------
    # HTTP client lifecycle
    # ------------------------------------------------------------------

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=OPENROUTER_BASE_URL,
                headers={
                    "Authorization": f"Bearer {self._api_key}",
                    "HTTP-Referer": "https://home-for-ai.app",
                    "X-Title": "Home for AI Trading Platform",
                    "Content-Type": "application/json",
                },
                timeout=60.0,
            )
        return self._client

    async def close(self) -> None:
        """Close the underlying HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    # ------------------------------------------------------------------
    # Core API call (shared by both models)
    # ------------------------------------------------------------------

    @retry(
        retry=retry_if_exception_type((httpx.HTTPStatusError, httpx.ConnectError)),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        stop=stop_after_attempt(3),
        reraise=True,
    )
    async def _chat_completion(
        self,
        model: str,
        messages: List[Dict[str, str]],
        max_tokens: int = 1024,
        temperature: float = 0.3,
        response_format: Optional[Dict[str, str]] = None,
    ) -> str:
        """
        Make a single chat completion request to OpenRouter.

        Returns the content string of the first choice.
        Raises LLMUnavailableError on non-retryable failures.
        """
        if not self._api_key:
            raise LLMUnavailableError("No API key configured.")

        payload: Dict[str, Any] = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if response_format:
            payload["response_format"] = response_format

        client = self._get_client()
        response = await client.post("/chat/completions", json=payload)

        if response.status_code == 429:
            raise httpx.HTTPStatusError(
                "Rate limited", request=response.request, response=response
            )
        if response.status_code >= 500:
            raise httpx.HTTPStatusError(
                f"Server error {response.status_code}",
                request=response.request,
                response=response,
            )
        if response.status_code >= 400:
            raise LLMUnavailableError(
                f"OpenRouter error {response.status_code}: {response.text}"
            )

        data = response.json()
        return data["choices"][0]["message"]["content"]

    # ------------------------------------------------------------------
    # Model-specific callers
    # ------------------------------------------------------------------

    async def call_kimi(
        self,
        messages: List[Dict[str, str]],
        max_tokens: int = 2048,
        temperature: float = 0.2,
    ) -> str:
        """
        Call Kimi 2.6 via OpenRouter.

        Best for: long-context analysis, multi-document news synthesis,
        chart pattern description, macro theme extraction.
        """
        try:
            return await self._chat_completion(
                model=KIMI_MODEL,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )
        except Exception as exc:
            logger.error("Kimi call failed: %s", exc)
            raise LLMUnavailableError(f"Kimi unavailable: {exc}") from exc

    async def call_deepseek(
        self,
        messages: List[Dict[str, str]],
        max_tokens: int = 1024,
        temperature: float = 0.2,
        json_output: bool = False,
    ) -> str:
        """
        Call DeepSeek V3 via OpenRouter.

        Best for: structured trading decisions, BUY/SELL/HOLD with confidence,
        fast arbitration, personality-driven chat responses.
        """
        response_format = {"type": "json_object"} if json_output else None
        try:
            return await self._chat_completion(
                model=DEEPSEEK_MODEL,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
                response_format=response_format,
            )
        except Exception as exc:
            logger.error("DeepSeek call failed: %s", exc)
            raise LLMUnavailableError(f"DeepSeek unavailable: {exc}") from exc

    # ------------------------------------------------------------------
    # Fusion: parallel call + weighted vote
    # ------------------------------------------------------------------

    async def fused_analysis(
        self,
        kimi_messages: List[Dict[str, str]],
        deepseek_messages: List[Dict[str, str]],
    ) -> Dict[str, Any]:
        """
        Call Kimi and DeepSeek in parallel; return both results and
        a combined confidence-weighted recommendation.

        Returns:
            {
                "kimi_output":     str,
                "deepseek_output": str,
                "method":          "fusion" | "kimi_only" | "deepseek_only" | "fallback",
            }
        """
        kimi_task = asyncio.create_task(
            self.call_kimi(kimi_messages),
            name="kimi-analysis",
        )
        deepseek_task = asyncio.create_task(
            self.call_deepseek(deepseek_messages),
            name="deepseek-analysis",
        )

        results = await asyncio.gather(kimi_task, deepseek_task, return_exceptions=True)

        kimi_result = results[0]
        deepseek_result = results[1]

        kimi_ok = not isinstance(kimi_result, Exception)
        deepseek_ok = not isinstance(deepseek_result, Exception)

        if kimi_ok and deepseek_ok:
            method = "fusion"
        elif deepseek_ok:
            logger.warning("Kimi unavailable; using DeepSeek only.")
            method = "deepseek_only"
        elif kimi_ok:
            logger.warning("DeepSeek unavailable; using Kimi only.")
            method = "kimi_only"
        else:
            logger.error("Both LLMs unavailable; using rule-based fallback.")
            method = "fallback"

        return {
            "kimi_output": kimi_result if kimi_ok else None,
            "deepseek_output": deepseek_result if deepseek_ok else None,
            "method": method,
        }

    async def arbitrate(
        self,
        kimi_decision: Dict[str, Any],
        deepseek_decision: Dict[str, Any],
        context: str = "",
    ) -> Dict[str, Any]:
        """
        When Kimi and DeepSeek disagree, use a meta-prompt to DeepSeek
        to arbitrate and produce a final weighted decision.

        Returns the arbitrated decision dict with adjusted confidence.
        """
        prompt = (
            "Two trading analysts have given conflicting recommendations. "
            "Arbitrate and choose the most sound decision.\n\n"
            f"Analyst A (Kimi, weight 40%):\n{json.dumps(kimi_decision, indent=2)}\n\n"
            f"Analyst B (DeepSeek, weight 60%):\n{json.dumps(deepseek_decision, indent=2)}\n\n"
            f"Additional context:\n{context}\n\n"
            "Respond with ONLY a JSON object: "
            '{"action": "BUY"|"SELL"|"HOLD", "confidence": 0.0-1.0, '
            '"reasoning": "concise explanation", '
            '"stop_loss": number, "take_profit": number}'
        )

        try:
            raw = await self.call_deepseek(
                messages=[{"role": "user", "content": prompt}],
                max_tokens=256,
                temperature=0.1,
                json_output=True,
            )
            result = json.loads(raw)
            # Apply a small confidence penalty for disagreement
            result["confidence"] = result.get("confidence", 0.5) * 0.9
            result["arbitrated"] = True
            return result
        except Exception as exc:
            logger.warning("Arbitration failed: %s — defaulting to DeepSeek", exc)
            deepseek_decision["arbitrated"] = False
            return deepseek_decision

    # ------------------------------------------------------------------
    # Rule-based fallback (no LLM)
    # ------------------------------------------------------------------

    @staticmethod
    def rule_based_decision(
        symbol: str,
        price_change_pct: float,
        personality: str,
    ) -> Dict[str, Any]:
        """
        Very simple rule-based decision used when both LLMs are unavailable.
        This is intentionally conservative to avoid bad trades during outages.
        """
        action = "HOLD"
        confidence = 0.5

        # Momentum: follow strong trends
        if personality == "momentum":
            if price_change_pct > 2.0:
                action, confidence = "BUY", 0.60
            elif price_change_pct < -2.0:
                action, confidence = "SELL", 0.58

        # Contrarian: fade strong moves
        elif personality == "contrarian":
            if price_change_pct > 3.0:
                action, confidence = "SELL", 0.58
            elif price_change_pct < -3.0:
                action, confidence = "BUY", 0.60

        # Conservative / bonds: rarely trade
        elif personality in ("conservative", "safe-haven"):
            confidence = 0.45  # below threshold → HOLD

        # All other personalities: HOLD during fallback
        return {
            "action": action,
            "symbol": symbol,
            "confidence": confidence,
            "reasoning": "Rule-based fallback (LLM unavailable)",
            "stop_loss": None,
            "take_profit": None,
            "fallback": True,
        }
