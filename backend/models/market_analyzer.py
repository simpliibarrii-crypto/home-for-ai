"""
Home for AI — Market Analyzer

Builds structured analysis prompts and interprets LLM outputs into
a normalised analysis dict consumed by the DecisionEngine.

Analysis pipeline:
1. News sentiment via Kimi 2.6 (long-context: up to 30 headlines at once)
2. Technical indicators computed locally (RSI, MACD signal, Bollinger Band position)
3. Merged analysis dict with sentiment score, trend direction, key themes
"""

from __future__ import annotations

import json
import logging
import math
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Dict, List, Optional

if TYPE_CHECKING:
    from agents.base_agent import AgentIdentity
    from models.fusion_llm import FusionLLM

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Technical indicator helpers (pure Python, no pandas required)
# ---------------------------------------------------------------------------

def _rsi(prices: List[float], period: int = 14) -> Optional[float]:
    """Compute Relative Strength Index from a list of closing prices."""
    if len(prices) < period + 1:
        return None
    deltas = [prices[i] - prices[i - 1] for i in range(1, len(prices))]
    gains = [max(d, 0) for d in deltas]
    losses = [abs(min(d, 0)) for d in deltas]

    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period

    for i in range(period, len(deltas)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period

    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return round(100 - 100 / (1 + rs), 2)


def _bollinger_position(prices: List[float], period: int = 20) -> Optional[float]:
    """
    Return where the latest price sits within the Bollinger Band as a
    fraction in [-1, 1]:  -1 = at lower band, 0 = at SMA, +1 = at upper band.
    """
    if len(prices) < period:
        return None
    window = prices[-period:]
    sma = sum(window) / period
    variance = sum((p - sma) ** 2 for p in window) / period
    std = math.sqrt(variance)
    if std == 0:
        return 0.0
    upper = sma + 2 * std
    lower = sma - 2 * std
    latest = prices[-1]
    band_range = upper - lower
    return round((latest - sma) / (band_range / 2), 3)


def _macd_signal(prices: List[float]) -> Optional[str]:
    """Return 'bullish', 'bearish', or 'neutral' based on MACD crossover."""
    if len(prices) < 26:
        return None

    def ema(data: List[float], span: int) -> float:
        k = 2 / (span + 1)
        e = data[0]
        for p in data[1:]:
            e = p * k + e * (1 - k)
        return e

    ema12 = ema(prices[-12:], 12)
    ema26 = ema(prices[-26:], 26)
    macd = ema12 - ema26

    # Previous MACD
    if len(prices) >= 27:
        ema12_prev = ema(prices[-13:-1], 12)
        ema26_prev = ema(prices[-27:-1], 26)
        macd_prev = ema12_prev - ema26_prev
        if macd > 0 and macd_prev <= 0:
            return "bullish"
        if macd < 0 and macd_prev >= 0:
            return "bearish"
    return "neutral" if macd > 0 else "bearish"


# ---------------------------------------------------------------------------
# MarketAnalyzer
# ---------------------------------------------------------------------------

class MarketAnalyzer:
    """
    Produces a structured market analysis dict from raw price + news data.

    Uses Kimi 2.6 for long-context news sentiment analysis (up to 30 articles
    in one pass using its 128K context window). Technical indicators are
    computed locally for speed and reliability.
    """

    def __init__(self, fusion_llm: "FusionLLM") -> None:
        self.fusion_llm = fusion_llm

    async def analyze(
        self,
        agent_identity: "AgentIdentity",
        market_data: Dict[str, Any],
        skills_context: str = "",
        memory_context: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Run the full analysis pipeline.

        Returns:
            {
                "sentiment_score":   float in [-1, 1],
                "sentiment_label":   "bullish" | "bearish" | "neutral",
                "key_themes":        [str, ...],
                "top_symbol":        str,
                "technical":         {symbol: {rsi, bb_position, macd_signal}},
                "news_summary":      str,
                "summary":           str (one-liner for memory),
                "raw_prices":        dict,
                "timestamp":         ISO str,
            }
        """
        prices: Dict[str, Any] = market_data.get("prices", {})
        news: List[Any] = market_data.get("news", [])

        # -- Technical analysis (local) --
        technical = self._compute_technicals(prices)

        # -- News sentiment (Kimi 2.6) --
        sentiment_data = await self._analyze_news_sentiment(
            agent_identity=agent_identity,
            news=news,
            technical=technical,
            skills_context=skills_context,
        )

        # -- Merge --
        top_symbol = self._pick_top_symbol(technical, sentiment_data)

        summary = (
            f"{agent_identity.name} analysis: "
            f"{sentiment_data.get('sentiment_label', 'neutral')} market, "
            f"top pick: {top_symbol}"
        )

        return {
            "sentiment_score": sentiment_data.get("sentiment_score", 0.0),
            "sentiment_label": sentiment_data.get("sentiment_label", "neutral"),
            "key_themes": sentiment_data.get("key_themes", []),
            "top_symbol": top_symbol,
            "technical": technical,
            "news_summary": sentiment_data.get("news_summary", ""),
            "summary": summary,
            "raw_prices": {
                sym: md.get("price") if isinstance(md, dict) else md
                for sym, md in prices.items()
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    def _compute_technicals(
        self, prices: Dict[str, Any]
    ) -> Dict[str, Dict[str, Any]]:
        """Compute RSI, Bollinger Band position, and MACD signal per symbol."""
        result: Dict[str, Dict[str, Any]] = {}
        for symbol, market_data in prices.items():
            history: List[float] = []
            if isinstance(market_data, dict):
                history = market_data.get("history", [])
                current = market_data.get("price", 0)
                change_24h = market_data.get("change_24h", 0)
            else:
                current = float(market_data) if market_data else 0
                change_24h = 0

            result[symbol] = {
                "price": current,
                "change_24h": change_24h,
                "rsi": _rsi(history) if history else None,
                "bb_position": _bollinger_position(history) if history else None,
                "macd_signal": _macd_signal(history) if history else None,
            }
        return result

    async def _analyze_news_sentiment(
        self,
        agent_identity: "AgentIdentity",
        news: List[Any],
        technical: Dict[str, Any],
        skills_context: str,
    ) -> Dict[str, Any]:
        """
        Use Kimi 2.6 to analyse up to 30 news items and return structured sentiment.
        Falls back to a rule-based sentiment if Kimi is unavailable.
        """
        if not news:
            return {
                "sentiment_score": 0.0,
                "sentiment_label": "neutral",
                "key_themes": [],
                "news_summary": "No recent news available.",
            }

        # Format headlines for Kimi (up to 30, using its 128K context)
        formatted_news = "\n".join(
            f"[{i+1}] {item.get('headline', item) if isinstance(item, dict) else item}"
            for i, item in enumerate(news[:30])
        )

        # Technical summary for context injection
        tech_summary = json.dumps(
            {s: {k: v for k, v in d.items() if v is not None}
             for s, d in list(technical.items())[:5]},
            indent=2,
        )

        kimi_prompt = (
            f"You are a market analyst for {agent_identity.name}, a {agent_identity.personality} "
            f"trader specialising in {agent_identity.specialty_market}.\n\n"
            f"AGENT SKILLS:\n{skills_context}\n\n"
            f"RECENT NEWS HEADLINES:\n{formatted_news}\n\n"
            f"TECHNICAL SNAPSHOT:\n{tech_summary}\n\n"
            "Analyse the above and respond with ONLY a JSON object:\n"
            '{"sentiment_score": <-1.0 to 1.0>, "sentiment_label": "bullish|bearish|neutral", '
            '"key_themes": ["<theme1>", "<theme2>", "<theme3>"], '
            '"news_summary": "<2-sentence synthesis>", '
            '"actionable_symbol": "<best symbol to trade given themes>"}'
        )

        try:
            raw = await self.fusion_llm.call_kimi(
                messages=[{"role": "user", "content": kimi_prompt}],
                max_tokens=512,
                temperature=0.2,
            )
            # Parse JSON from Kimi response
            # Strip markdown fences if present
            cleaned = raw.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("```")[1]
                if cleaned.startswith("json"):
                    cleaned = cleaned[4:]
            return json.loads(cleaned.strip())

        except Exception as exc:
            logger.warning("Kimi sentiment analysis failed: %s — using fallback", exc)
            return self._rule_based_sentiment(news)

    @staticmethod
    def _rule_based_sentiment(news: List[Any]) -> Dict[str, Any]:
        """
        Simple keyword-based sentiment fallback.
        Returns neutral with a basic summary if LLM is unavailable.
        """
        bullish_words = {"surge", "rally", "gain", "bull", "growth", "breakout", "record"}
        bearish_words = {"crash", "drop", "decline", "bear", "loss", "plunge", "recession"}

        score = 0.0
        for item in news[:10]:
            headline = (item.get("headline", "") if isinstance(item, dict) else str(item)).lower()
            for word in bullish_words:
                if word in headline:
                    score += 0.1
            for word in bearish_words:
                if word in headline:
                    score -= 0.1

        score = max(-1.0, min(1.0, score))
        label = "bullish" if score > 0.1 else "bearish" if score < -0.1 else "neutral"

        return {
            "sentiment_score": round(score, 2),
            "sentiment_label": label,
            "key_themes": ["rule-based sentiment"],
            "news_summary": f"Rule-based fallback: {len(news)} headlines processed, {label} overall.",
        }

    @staticmethod
    def _pick_top_symbol(
        technical: Dict[str, Any],
        sentiment_data: Dict[str, Any],
    ) -> str:
        """
        Pick the most actionable symbol based on RSI extremes and sentiment.
        Oversold (RSI < 30) in bullish market → buy candidate.
        Overbought (RSI > 70) in bearish market → sell candidate.
        Falls back to the first symbol in the technical dict.
        """
        sentiment = sentiment_data.get("sentiment_label", "neutral")
        actionable = sentiment_data.get("actionable_symbol", "")
        if actionable and actionable in technical:
            return actionable

        for symbol, data in technical.items():
            rsi = data.get("rsi")
            if rsi is None:
                continue
            if sentiment == "bullish" and rsi < 35:
                return symbol
            if sentiment == "bearish" and rsi > 65:
                return symbol

        return next(iter(technical), "SPY")
