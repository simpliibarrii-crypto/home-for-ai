"""
Home for AI — Decision Engine

Converts market analysis into a final TradingDecision using the fusion LLM.

Flow:
1. Build a decision prompt from analysis + agent personality + open positions
2. Call DeepSeek V3 for primary decision (fast structured output)
3. Call Kimi 2.6 for validation (optional, for high-stakes decisions)
4. If both agree → high-confidence trade
5. If they disagree → arbitrate via FusionLLM.arbitrate()
6. Apply position sizing rules from PortfolioManager
7. Fallback to rule-based decision if LLMs unavailable
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import TYPE_CHECKING, Any, Dict, List, Optional

if TYPE_CHECKING:
    from agents.base_agent import AgentIdentity
    from models.fusion_llm import FusionLLM

logger = logging.getLogger(__name__)

# Confidence below this → action forced to HOLD
MIN_CONFIDENCE = 0.55

# Confidence above this → call both models for validation
HIGH_STAKES_THRESHOLD = 0.80


class TradeAction(str, Enum):
    BUY = "BUY"
    SELL = "SELL"
    HOLD = "HOLD"


@dataclass
class TradingDecision:
    """
    Structured output from the decision engine.

    Fields
    ------
    action:        BUY | SELL | HOLD
    symbol:        Ticker symbol (e.g. "AAPL", "BTC-USD")
    confidence:    0.0–1.0 combined weighted confidence
    reasoning:     Human-readable explanation
    entry_price:   Suggested entry price (None → market order)
    stop_loss:     Stop-loss price (None → no stop)
    take_profit:   Take-profit target price (None → no target)
    model_votes:   Raw votes from each model for transparency
    fallback:      True if rule-based fallback was used
    """

    action: TradeAction = TradeAction.HOLD
    symbol: str = "SPY"
    confidence: float = 0.0
    reasoning: str = ""
    entry_price: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    model_votes: Dict[str, Any] = field(default_factory=dict)
    fallback: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "action": self.action.value,
            "symbol": self.symbol,
            "confidence": round(self.confidence, 3),
            "reasoning": self.reasoning,
            "entry_price": self.entry_price,
            "stop_loss": self.stop_loss,
            "take_profit": self.take_profit,
            "model_votes": self.model_votes,
            "fallback": self.fallback,
        }


class DecisionEngine:
    """
    Converts analysis output into a TradingDecision via the fusion LLM.
    """

    def __init__(self, fusion_llm: "FusionLLM") -> None:
        self.fusion_llm = fusion_llm

    async def make_decision(
        self,
        agent_identity: "AgentIdentity",
        analysis: Dict[str, Any],
        open_positions: Optional[Dict[str, Any]] = None,
    ) -> TradingDecision:
        """
        Produce a TradingDecision from analysis output.

        Parameters
        ----------
        agent_identity:  Agent making the decision.
        analysis:        Output dict from MarketAnalyzer.analyze().
        open_positions:  Currently open positions (used for context + SELL logic).
        """
        open_positions = open_positions or {}
        symbol = analysis.get("top_symbol", "SPY")
        current_price = (
            analysis.get("raw_prices", {}).get(symbol)
            or analysis.get("technical", {}).get(symbol, {}).get("price")
        )

        # Build DeepSeek decision prompt
        deepseek_prompt = self._build_decision_prompt(
            agent_identity=agent_identity,
            analysis=analysis,
            symbol=symbol,
            current_price=current_price,
            open_positions=open_positions,
        )

        deepseek_decision: Optional[Dict[str, Any]] = None
        kimi_decision: Optional[Dict[str, Any]] = None

        # Primary call: DeepSeek V3
        try:
            raw = await self.fusion_llm.call_deepseek(
                messages=[{"role": "user", "content": deepseek_prompt}],
                max_tokens=512,
                temperature=0.2,
                json_output=True,
            )
            deepseek_decision = self._parse_decision(raw)
        except Exception as exc:
            logger.warning("DeepSeek decision failed: %s", exc)

        # High-stakes validation: call Kimi too
        if (
            deepseek_decision
            and deepseek_decision.get("confidence", 0) >= HIGH_STAKES_THRESHOLD
        ):
            kimi_prompt = self._build_validation_prompt(
                agent_identity=agent_identity,
                analysis=analysis,
                primary_decision=deepseek_decision,
            )
            try:
                raw_kimi = await self.fusion_llm.call_kimi(
                    messages=[{"role": "user", "content": kimi_prompt}],
                    max_tokens=256,
                    temperature=0.1,
                )
                kimi_decision = self._parse_decision(raw_kimi)
            except Exception as exc:
                logger.warning("Kimi validation failed: %s", exc)

        # --- Decide on final decision ---

        if deepseek_decision is None and kimi_decision is None:
            # Full fallback
            fallback = self.fusion_llm.rule_based_decision(
                symbol=symbol,
                price_change_pct=analysis.get("technical", {})
                    .get(symbol, {})
                    .get("change_24h", 0.0),
                personality=agent_identity.personality,
            )
            return self._dict_to_decision(fallback, symbol, current_price, fallback=True)

        if deepseek_decision is not None and kimi_decision is None:
            final = deepseek_decision
        elif kimi_decision is not None and deepseek_decision is None:
            final = kimi_decision
        else:
            # Both available: check for agreement
            assert deepseek_decision is not None
            assert kimi_decision is not None
            if deepseek_decision.get("action") == kimi_decision.get("action"):
                # Agreement: weighted average confidence
                final = deepseek_decision.copy()
                final["confidence"] = (
                    deepseek_decision.get("confidence", 0.5) * 0.60
                    + kimi_decision.get("confidence", 0.5) * 0.40
                )
                final["model_votes"] = {
                    "deepseek": deepseek_decision,
                    "kimi": kimi_decision,
                }
            else:
                # Disagreement: arbitrate
                logger.info(
                    "Agent %s: model disagreement — arbitrating", agent_identity.name
                )
                final = await self.fusion_llm.arbitrate(
                    kimi_decision=kimi_decision,
                    deepseek_decision=deepseek_decision,
                    context=analysis.get("news_summary", ""),
                )
                final["model_votes"] = {
                    "deepseek": deepseek_decision,
                    "kimi": kimi_decision,
                    "arbitrated": True,
                }

        # Apply minimum confidence guard
        if final.get("confidence", 0) < MIN_CONFIDENCE:
            final["action"] = "HOLD"
            final["reasoning"] = (
                f"Confidence {final.get('confidence', 0):.2f} below threshold {MIN_CONFIDENCE}. "
                + final.get("reasoning", "")
            )

        return self._dict_to_decision(final, symbol, current_price, fallback=False)

    # ------------------------------------------------------------------
    # Prompt builders
    # ------------------------------------------------------------------

    @staticmethod
    def _build_decision_prompt(
        agent_identity: "AgentIdentity",
        analysis: Dict[str, Any],
        symbol: str,
        current_price: Optional[float],
        open_positions: Dict[str, Any],
    ) -> str:
        tech = analysis.get("technical", {}).get(symbol, {})
        open_pos_str = (
            json.dumps(
                {s: {"entry": p.get("entry_price"), "qty": p.get("quantity")}
                 for s, p in open_positions.items()},
                indent=2,
            )
            if open_positions
            else "None"
        )

        return (
            f"You are {agent_identity.name}, a {agent_identity.personality} trading agent "
            f"specialising in {agent_identity.specialty_market}.\n\n"
            f"MARKET ANALYSIS:\n"
            f"  Symbol: {symbol}\n"
            f"  Current price: {current_price}\n"
            f"  Sentiment: {analysis.get('sentiment_label')} "
            f"(score: {analysis.get('sentiment_score', 0):.2f})\n"
            f"  Key themes: {', '.join(analysis.get('key_themes', []))}\n"
            f"  RSI: {tech.get('rsi')}\n"
            f"  Bollinger position: {tech.get('bb_position')}\n"
            f"  MACD: {tech.get('macd_signal')}\n"
            f"  24h change: {tech.get('change_24h', 0):.2f}%\n\n"
            f"NEWS SUMMARY:\n{analysis.get('news_summary', '')}\n\n"
            f"CURRENT OPEN POSITIONS:\n{open_pos_str}\n\n"
            f"Make a trading decision. Respond with ONLY a JSON object:\n"
            '{"action": "BUY"|"SELL"|"HOLD", "confidence": 0.0-1.0, '
            '"reasoning": "<concise rationale>", '
            '"stop_loss": <price or null>, "take_profit": <price or null>}'
        )

    @staticmethod
    def _build_validation_prompt(
        agent_identity: "AgentIdentity",
        analysis: Dict[str, Any],
        primary_decision: Dict[str, Any],
    ) -> str:
        return (
            f"A DeepSeek analyst recommends: {json.dumps(primary_decision, indent=2)}\n\n"
            f"Given the following context, do you agree? Rate your own confidence.\n"
            f"Market: {analysis.get('sentiment_label')}, themes: {analysis.get('key_themes')}\n"
            f"News: {analysis.get('news_summary', '')[:500]}\n\n"
            "Respond with ONLY a JSON object:\n"
            '{"action": "BUY"|"SELL"|"HOLD", "confidence": 0.0-1.0, '
            '"reasoning": "<your view>", "stop_loss": <price or null>, "take_profit": <price or null>}'
        )

    # ------------------------------------------------------------------
    # Parsers
    # ------------------------------------------------------------------

    @staticmethod
    def _parse_decision(raw: str) -> Dict[str, Any]:
        """
        Parse JSON from LLM output. Strips markdown fences if present.
        Raises ValueError on parse failure.
        """
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            parts = cleaned.split("```")
            cleaned = parts[1] if len(parts) > 1 else cleaned
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        return json.loads(cleaned.strip())

    @staticmethod
    def _dict_to_decision(
        d: Dict[str, Any],
        symbol: str,
        current_price: Optional[float],
        fallback: bool = False,
    ) -> TradingDecision:
        """Convert a raw dict to a typed TradingDecision."""
        action_str = d.get("action", "HOLD").upper()
        try:
            action = TradeAction(action_str)
        except ValueError:
            action = TradeAction.HOLD

        return TradingDecision(
            action=action,
            symbol=d.get("symbol", symbol),
            confidence=float(d.get("confidence", 0.5)),
            reasoning=d.get("reasoning", ""),
            entry_price=current_price,
            stop_loss=d.get("stop_loss"),
            take_profit=d.get("take_profit"),
            model_votes=d.get("model_votes", {}),
            fallback=fallback or d.get("fallback", False),
        )
