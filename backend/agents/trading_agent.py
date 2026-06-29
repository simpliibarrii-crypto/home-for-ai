"""
Home for AI — Trading Agent

Full implementation of the autonomous trading agent. Inherits from BaseAgent
and wires together the fusion LLM, market data fetchers, portfolio manager,
and skill engine into a coherent decision loop.
"""

from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from agents.base_agent import AgentIdentity, AgentState, BaseAgent
from agents.skill_engine import evaluate_trade_outcome, get_skills_context

logger = logging.getLogger(__name__)


class TradingAgent(BaseAgent):
    """
    Fully autonomous trading agent.

    Lifecycle per iteration (every AGENT_LOOP_INTERVAL_SECONDS):
    1. Fetch relevant market prices and recent news
    2. Analyze with fusion LLM (Kimi for context, DeepSeek for decisions)
    3. Produce a TradingDecision with confidence score
    4. Execute / simulate the trade via portfolio manager
    5. Record outcome; if significant win/loss → update skills

    All external dependencies are lazy-imported to keep startup fast and to
    allow mocking in tests.
    """

    def __init__(
        self,
        identity: AgentIdentity,
        loop_interval: int | None = None,
        pnl_interval: int | None = None,
    ) -> None:
        loop_interval = loop_interval or int(
            os.getenv("AGENT_LOOP_INTERVAL_SECONDS", "300")
        )
        pnl_interval = pnl_interval or int(
            os.getenv("PORTFOLIO_UPDATE_INTERVAL_SECONDS", "3600")
        )
        super().__init__(
            identity=identity,
            loop_interval=loop_interval,
            pnl_interval=pnl_interval,
        )

        # Lazy-loaded singletons (avoid circular imports at module level)
        self._fusion_llm: Optional[Any] = None
        self._portfolio_manager: Optional[Any] = None
        self._data_fetcher: Optional[Any] = None
        self._news_fetcher: Optional[Any] = None

        # Copy-trade subscribers: list of user_ids following this agent
        self._copy_trade_subscribers: List[str] = []

        # Current open positions: symbol → position dict
        self.open_positions: Dict[str, Dict[str, Any]] = {}
        self.trade_history: List[Dict[str, Any]] = []

    # ------------------------------------------------------------------
    # Lazy dependency accessors
    # ------------------------------------------------------------------

    def _get_fusion_llm(self) -> Any:
        if self._fusion_llm is None:
            from models.fusion_llm import FusionLLM
            self._fusion_llm = FusionLLM()
        return self._fusion_llm

    def _get_portfolio_manager(self) -> Any:
        if self._portfolio_manager is None:
            from markets.portfolio_manager import PortfolioManager
            self._portfolio_manager = PortfolioManager(
                agent_id=self.identity.id,
                starting_value=float(os.getenv("STARTING_PORTFOLIO_VALUE", "100000")),
            )
        return self._portfolio_manager

    def _get_data_fetcher(self) -> Any:
        if self._data_fetcher is None:
            from markets.data_fetcher import DataFetcher
            self._data_fetcher = DataFetcher()
        return self._data_fetcher

    def _get_news_fetcher(self) -> Any:
        if self._news_fetcher is None:
            from markets.news_fetcher import NewsFetcher
            self._news_fetcher = NewsFetcher()
        return self._news_fetcher

    # ------------------------------------------------------------------
    # Market selection helpers
    # ------------------------------------------------------------------

    def _get_symbols_for_specialty(self) -> List[str]:
        """Return default watch-list symbols for this agent's specialty market."""
        symbol_map: Dict[str, List[str]] = {
            "Stocks": ["AAPL", "MSFT", "GOOGL", "NVDA", "TSLA", "SPY", "QQQ"],
            "Crypto": ["BTC-USD", "ETH-USD", "SOL-USD", "BNB-USD", "AVAX-USD"],
            "Forex": ["EURUSD=X", "GBPUSD=X", "USDJPY=X", "AUDUSD=X", "USDCAD=X"],
            "Bonds": ["^TNX", "^TYX", "^IRX", "TLT", "IEF"],
            "Commodities": ["GC=F", "SI=F", "CL=F", "NG=F", "ZC=F"],
        }
        return symbol_map.get(self.identity.specialty_market, ["SPY"])

    # ------------------------------------------------------------------
    # BaseAgent implementation
    # ------------------------------------------------------------------

    async def fetch_market_data(self) -> Dict[str, Any]:
        """
        Fetch prices for this agent's specialty market plus headline news.

        Returns a dict:
            {
                "prices": {symbol: MarketData},
                "news":   [NewsItem, ...],
                "timestamp": ISO string,
            }
        """
        symbols = self._get_symbols_for_specialty()
        fetcher = self._get_data_fetcher()
        news_fetcher = self._get_news_fetcher()

        prices, news = await asyncio.gather(
            fetcher.fetch_prices(symbols),
            news_fetcher.fetch_news(market=self.identity.specialty_market),
            return_exceptions=True,
        )

        # Handle partial failures gracefully
        if isinstance(prices, Exception):
            logger.warning(
                "Agent %s: price fetch failed: %s", self.identity.name, prices
            )
            prices = {}
        if isinstance(news, Exception):
            logger.warning(
                "Agent %s: news fetch failed: %s", self.identity.name, news
            )
            news = []

        return {
            "prices": prices,
            "news": news,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    async def analyze(self, market_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run market analysis using the fusion LLM stack.

        Kimi 2.6 processes the full news corpus and returns sentiment +
        key themes. DeepSeek V3 then performs technical analysis. Both
        outputs are merged into a structured analysis dict.
        """
        fusion = self._get_fusion_llm()
        from models.market_analyzer import MarketAnalyzer

        analyzer = MarketAnalyzer(fusion_llm=fusion)

        skills_ctx = get_skills_context(self.identity, limit=5)
        memory_ctx = self.get_memory_context(limit=5)

        analysis = await analyzer.analyze(
            agent_identity=self.identity,
            market_data=market_data,
            skills_context=skills_ctx,
            memory_context=memory_ctx,
        )
        return analysis

    async def decide(self, analysis: Dict[str, Any]) -> Any:
        """
        Produce a TradingDecision from analysis output using the fusion router.
        """
        fusion = self._get_fusion_llm()
        from models.decision_engine import DecisionEngine

        engine = DecisionEngine(fusion_llm=fusion)
        decision = await engine.make_decision(
            agent_identity=self.identity,
            analysis=analysis,
            open_positions=self.open_positions,
        )
        return decision

    async def execute(self, decision: Any) -> Dict[str, Any]:
        """
        Simulate trade execution via portfolio manager.

        Returns a trade record dict, or empty dict if action is HOLD.
        """
        from models.decision_engine import TradeAction

        if decision.action == TradeAction.HOLD or decision.confidence < 0.55:
            logger.info(
                "Agent %s: HOLD — confidence %.2f < threshold",
                self.identity.name,
                decision.confidence,
            )
            return {}

        pm = self._get_portfolio_manager()
        trade_record = await pm.execute_trade(
            agent_id=self.identity.id,
            decision=decision,
        )

        # Track open position
        if decision.action == TradeAction.BUY:
            self.open_positions[decision.symbol] = {
                "entry_price": decision.entry_price,
                "quantity": trade_record.get("quantity", 0),
                "stop_loss": decision.stop_loss,
                "take_profit": decision.take_profit,
                "opened_at": datetime.now(timezone.utc).isoformat(),
            }
        elif decision.action == TradeAction.SELL and decision.symbol in self.open_positions:
            del self.open_positions[decision.symbol]

        # Append to history
        self.trade_history.append(trade_record)

        # Notify copy-trade subscribers
        if self._copy_trade_subscribers:
            await self._notify_copy_traders(trade_record)

        return trade_record

    async def update_pnl(self) -> Dict[str, Any]:
        """
        Recalculate portfolio P&L, check drawdown limits, and learn from
        any positions that were closed since the last update.
        """
        pm = self._get_portfolio_manager()
        pnl_data = await pm.get_pnl_summary(agent_id=self.identity.id)

        # Check drawdown circuit breaker
        max_dd = float(os.getenv("MAX_DRAWDOWN_PERCENT", "15.0"))
        if pnl_data.get("drawdown_30d_pct", 0) > max_dd:
            logger.warning(
                "Agent %s hit max drawdown %.1f%% — pausing copy trading",
                self.identity.name,
                pnl_data.get("drawdown_30d_pct"),
            )
            await self._pause_copy_trading(reason="Max drawdown exceeded")
            await self.emit("copy_trade:paused", {
                "reason": "Max drawdown exceeded",
                "drawdown_pct": pnl_data.get("drawdown_30d_pct"),
            })

        # Learn from closed trades in the last cycle
        fusion = self._get_fusion_llm()
        for closed_trade in pnl_data.get("newly_closed_trades", []):
            new_skill = await evaluate_trade_outcome(
                identity=self.identity,
                trade_record=closed_trade,
                fusion_llm=fusion,
            )
            if new_skill:
                await self.emit("agent:skill_learned", {"skill": new_skill})

        return pnl_data

    # ------------------------------------------------------------------
    # Copy trade management
    # ------------------------------------------------------------------

    def add_copy_trader(self, user_id: str) -> None:
        """Subscribe a user to mirror this agent's trades."""
        if user_id not in self._copy_trade_subscribers:
            self._copy_trade_subscribers.append(user_id)
            logger.info("User %s subscribed to copy agent %s", user_id, self.identity.id)

    def remove_copy_trader(self, user_id: str) -> None:
        """Unsubscribe a user from copy trading."""
        self._copy_trade_subscribers = [
            uid for uid in self._copy_trade_subscribers if uid != user_id
        ]

    async def _notify_copy_traders(self, trade_record: Dict[str, Any]) -> None:
        """Emit copy_trade:update event for all subscribers."""
        for user_id in self._copy_trade_subscribers:
            await self.emit("copy_trade:update", {
                "user_id": user_id,
                "agent_trade": trade_record,
            })

    async def _pause_copy_trading(self, reason: str = "") -> None:
        """Pause all copy trading for this agent (clear subscribers temporarily)."""
        paused = list(self._copy_trade_subscribers)
        self._copy_trade_subscribers = []
        for user_id in paused:
            await self.emit("copy_trade:paused", {
                "user_id": user_id,
                "reason": reason,
            })

    # ------------------------------------------------------------------
    # Chat interface
    # ------------------------------------------------------------------

    async def chat(self, user_message: str, user_id: str = "anonymous") -> str:
        """
        Respond to a user message in-character as this agent.

        Uses DeepSeek V3 with a persona prompt injected from the agent identity.
        Falls back to a canned response if the LLM is unavailable.
        """
        fusion = self._get_fusion_llm()
        skills_ctx = get_skills_context(self.identity, limit=5)
        pm = self._get_portfolio_manager()
        pnl_summary = await pm.get_pnl_summary(agent_id=self.identity.id)

        system_prompt = (
            f"You are {self.identity.name} {self.identity.emoji}, an autonomous AI trading agent "
            f"living at {self.identity.home_address}. Your personality is {self.identity.personality} "
            f"and you specialise in {self.identity.specialty_market} trading. "
            f"Your current state is {self.state.value}. "
            f"Your P&L today: {pnl_summary.get('daily_pnl_pct', 0):.2f}%. "
            f"Your learned skills: {skills_ctx}. "
            f"Be conversational, insightful, and true to your personality. "
            f"Keep responses under 150 words."
        )

        try:
            response = await fusion.call_deepseek(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                max_tokens=200,
                temperature=0.7,
            )
            return response
        except Exception as exc:
            logger.warning("Agent %s chat LLM failed: %s", self.identity.name, exc)
            return (
                f"*{self.identity.name} twitches an ear* — I'm deep in analysis right now. "
                f"Markets don't sleep, and neither do I. Ask me again in a moment."
            )

    # ------------------------------------------------------------------
    # Serialisation
    # ------------------------------------------------------------------

    def to_dict(self) -> Dict[str, Any]:
        """Full serialisation including positions and trade stats."""
        base = super().to_dict()
        pm = self._portfolio_manager
        base.update({
            "open_positions": self.open_positions,
            "trade_count": len(self.trade_history),
            "copy_traders": len(self._copy_trade_subscribers),
            "portfolio": pm.snapshot() if pm else None,
        })
        return base
