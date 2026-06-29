"""
Home for AI — Portfolio Manager

Tracks simulated agent portfolios:
- Position sizing (Kelly criterion-inspired with hard caps)
- P&L tracking (realized + unrealized)
- Drawdown monitoring
- Trade execution simulation with slippage and fee model
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Transaction fee simulation (basis points)
SIMULATED_FEE_BPS = 5   # 0.05% per trade (realistic for a low-cost broker)

# Position sizing limits
MAX_POSITION_PCT = 0.10    # max 10% of portfolio in a single position
MIN_POSITION_PCT = 0.01    # min 1% to avoid noise trades

# Slippage model (market impact simulation)
SLIPPAGE_BPS = 2           # 0.02% slippage per trade


class Position:
    """Represents a single open position."""

    def __init__(
        self,
        symbol: str,
        quantity: float,
        entry_price: float,
        stop_loss: Optional[float] = None,
        take_profit: Optional[float] = None,
    ) -> None:
        self.symbol = symbol
        self.quantity = quantity
        self.entry_price = entry_price
        self.stop_loss = stop_loss
        self.take_profit = take_profit
        self.opened_at = datetime.now(timezone.utc)
        self.current_price: float = entry_price

    @property
    def cost_basis(self) -> float:
        return self.quantity * self.entry_price

    @property
    def market_value(self) -> float:
        return self.quantity * self.current_price

    @property
    def unrealized_pnl(self) -> float:
        return self.market_value - self.cost_basis

    @property
    def unrealized_pnl_pct(self) -> float:
        if self.cost_basis == 0:
            return 0.0
        return self.unrealized_pnl / self.cost_basis * 100

    def to_dict(self) -> Dict[str, Any]:
        return {
            "symbol": self.symbol,
            "quantity": self.quantity,
            "entry_price": round(self.entry_price, 4),
            "current_price": round(self.current_price, 4),
            "cost_basis": round(self.cost_basis, 2),
            "market_value": round(self.market_value, 2),
            "unrealized_pnl": round(self.unrealized_pnl, 2),
            "unrealized_pnl_pct": round(self.unrealized_pnl_pct, 3),
            "stop_loss": self.stop_loss,
            "take_profit": self.take_profit,
            "opened_at": self.opened_at.isoformat(),
        }


class TradeRecord:
    """Completed trade record."""

    def __init__(
        self,
        agent_id: str,
        symbol: str,
        action: str,
        quantity: float,
        price: float,
        fee: float,
        pnl: float = 0.0,
        pnl_pct: float = 0.0,
        reasoning: str = "",
        confidence: float = 0.0,
        market_conditions: str = "",
    ) -> None:
        self.agent_id = agent_id
        self.symbol = symbol
        self.action = action
        self.quantity = quantity
        self.price = price
        self.fee = fee
        self.pnl = pnl
        self.pnl_pct = pnl_pct
        self.reasoning = reasoning
        self.confidence = confidence
        self.market_conditions = market_conditions
        self.executed_at = datetime.now(timezone.utc)
        self.id = f"{agent_id}-{self.executed_at.timestamp():.0f}"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "agent_id": self.agent_id,
            "symbol": self.symbol,
            "action": self.action,
            "quantity": round(self.quantity, 6),
            "price": round(self.price, 4),
            "fee": round(self.fee, 4),
            "pnl": round(self.pnl, 2),
            "pnl_pct": round(self.pnl_pct, 3),
            "reasoning": self.reasoning,
            "confidence": round(self.confidence, 3),
            "market_conditions": self.market_conditions,
            "executed_at": self.executed_at.isoformat(),
        }


class PortfolioManager:
    """
    Manages a single agent's simulated portfolio.

    Thread-safe via asyncio — all mutations happen in the event loop.
    """

    def __init__(
        self,
        agent_id: str,
        starting_value: float = 100_000.0,
    ) -> None:
        self.agent_id = agent_id
        self.starting_value = starting_value
        self.cash: float = starting_value
        self.positions: Dict[str, Position] = {}
        self.trade_history: List[TradeRecord] = []
        self._pnl_snapshots: List[tuple[datetime, float]] = []  # (timestamp, portfolio_value)

    # ------------------------------------------------------------------
    # Portfolio value
    # ------------------------------------------------------------------

    @property
    def positions_value(self) -> float:
        return sum(p.market_value for p in self.positions.values())

    @property
    def total_value(self) -> float:
        return self.cash + self.positions_value

    @property
    def total_pnl(self) -> float:
        return self.total_value - self.starting_value

    @property
    def total_pnl_pct(self) -> float:
        return self.total_pnl / self.starting_value * 100

    def snapshot(self) -> Dict[str, Any]:
        """Return a lightweight portfolio snapshot (no history)."""
        return {
            "agent_id": self.agent_id,
            "cash": round(self.cash, 2),
            "positions_value": round(self.positions_value, 2),
            "total_value": round(self.total_value, 2),
            "total_pnl": round(self.total_pnl, 2),
            "total_pnl_pct": round(self.total_pnl_pct, 3),
            "open_positions": len(self.positions),
        }

    # ------------------------------------------------------------------
    # Trade execution
    # ------------------------------------------------------------------

    async def execute_trade(
        self,
        agent_id: str,
        decision: Any,
    ) -> Dict[str, Any]:
        """
        Simulate trade execution from a TradingDecision.

        Applies slippage, fees, and position sizing. Returns a trade record dict.
        """
        from models.decision_engine import TradeAction

        symbol: str = decision.symbol
        action: TradeAction = decision.action
        entry_price: float = float(decision.entry_price or 0)

        if entry_price <= 0:
            logger.warning("Agent %s: invalid entry price for %s", agent_id, symbol)
            return {}

        # Apply slippage
        slippage_factor = 1 + (SLIPPAGE_BPS / 10_000) * (1 if action == TradeAction.BUY else -1)
        fill_price = entry_price * slippage_factor

        trade_record: Optional[TradeRecord] = None

        if action == TradeAction.BUY:
            trade_record = await self._open_position(
                agent_id=agent_id,
                symbol=symbol,
                fill_price=fill_price,
                stop_loss=decision.stop_loss,
                take_profit=decision.take_profit,
                confidence=decision.confidence,
                reasoning=decision.reasoning,
            )
        elif action == TradeAction.SELL:
            trade_record = await self._close_position(
                agent_id=agent_id,
                symbol=symbol,
                fill_price=fill_price,
                reasoning=decision.reasoning,
                confidence=decision.confidence,
            )

        if trade_record is None:
            return {}

        self.trade_history.append(trade_record)
        return trade_record.to_dict()

    async def _open_position(
        self,
        agent_id: str,
        symbol: str,
        fill_price: float,
        stop_loss: Optional[float],
        take_profit: Optional[float],
        confidence: float,
        reasoning: str,
    ) -> Optional[TradeRecord]:
        """Open a new long position with Kelly-inspired sizing."""
        if symbol in self.positions:
            logger.info("Agent %s: already in %s — skipping", agent_id, symbol)
            return None

        # Position sizing: scale with confidence, cap at MAX_POSITION_PCT
        raw_pct = MIN_POSITION_PCT + (MAX_POSITION_PCT - MIN_POSITION_PCT) * confidence
        position_value = self.total_value * min(raw_pct, MAX_POSITION_PCT)
        position_value = min(position_value, self.cash * 0.95)  # never exceed 95% of cash

        if position_value < 100:
            logger.info("Agent %s: insufficient cash to open %s", agent_id, symbol)
            return None

        quantity = position_value / fill_price
        fee = position_value * SIMULATED_FEE_BPS / 10_000
        total_cost = position_value + fee

        self.cash -= total_cost
        self.positions[symbol] = Position(
            symbol=symbol,
            quantity=quantity,
            entry_price=fill_price,
            stop_loss=stop_loss,
            take_profit=take_profit,
        )

        return TradeRecord(
            agent_id=agent_id,
            symbol=symbol,
            action="BUY",
            quantity=quantity,
            price=fill_price,
            fee=fee,
            reasoning=reasoning,
            confidence=confidence,
        )

    async def _close_position(
        self,
        agent_id: str,
        symbol: str,
        fill_price: float,
        reasoning: str,
        confidence: float,
    ) -> Optional[TradeRecord]:
        """Close an existing position and realise P&L."""
        position = self.positions.get(symbol)
        if not position:
            logger.info("Agent %s: no open position in %s to close", agent_id, symbol)
            return None

        proceeds = position.quantity * fill_price
        fee = proceeds * SIMULATED_FEE_BPS / 10_000
        net_proceeds = proceeds - fee

        pnl = net_proceeds - position.cost_basis
        pnl_pct = pnl / position.cost_basis * 100

        self.cash += net_proceeds
        del self.positions[symbol]

        return TradeRecord(
            agent_id=agent_id,
            symbol=symbol,
            action="SELL",
            quantity=position.quantity,
            price=fill_price,
            fee=fee,
            pnl=pnl,
            pnl_pct=pnl_pct,
            reasoning=reasoning,
            confidence=confidence,
        )

    # ------------------------------------------------------------------
    # P&L and drawdown
    # ------------------------------------------------------------------

    async def get_pnl_summary(self, agent_id: str) -> Dict[str, Any]:
        """
        Calculate current P&L summary including 30-day drawdown.

        Records a portfolio value snapshot for drawdown tracking.
        """
        now = datetime.now(timezone.utc)
        current_value = self.total_value

        # Record snapshot
        self._pnl_snapshots.append((now, current_value))
        # Prune to last 31 days
        cutoff = now - timedelta(days=31)
        self._pnl_snapshots = [(t, v) for t, v in self._pnl_snapshots if t >= cutoff]

        # Daily P&L
        day_ago = now - timedelta(hours=24)
        day_snapshots = [(t, v) for t, v in self._pnl_snapshots if t >= day_ago]
        daily_pnl_pct = 0.0
        if len(day_snapshots) >= 2:
            oldest_v = day_snapshots[0][1]
            daily_pnl_pct = (current_value - oldest_v) / oldest_v * 100 if oldest_v else 0.0

        # 30-day drawdown
        month_values = [v for _, v in self._pnl_snapshots]
        peak = max(month_values, default=current_value)
        drawdown_30d_pct = (peak - current_value) / peak * 100 if peak else 0.0

        # Newly closed trades (since last hour)
        hour_ago = now - timedelta(hours=1)
        newly_closed = [
            t.to_dict()
            for t in self.trade_history
            if t.action == "SELL" and t.executed_at >= hour_ago
        ]

        return {
            "agent_id": agent_id,
            "total_value": round(current_value, 2),
            "total_pnl": round(self.total_pnl, 2),
            "total_pnl_pct": round(self.total_pnl_pct, 3),
            "daily_pnl_pct": round(daily_pnl_pct, 3),
            "drawdown_30d_pct": round(drawdown_30d_pct, 3),
            "cash": round(self.cash, 2),
            "positions_value": round(self.positions_value, 2),
            "open_positions": {s: p.to_dict() for s, p in self.positions.items()},
            "newly_closed_trades": newly_closed,
            "timestamp": now.isoformat(),
        }

    async def update_prices(self, prices: Dict[str, float]) -> None:
        """Update mark-to-market prices for all open positions."""
        for symbol, position in self.positions.items():
            if symbol in prices:
                position.current_price = prices[symbol]

        # Check stop-loss / take-profit triggers
        triggered: List[str] = []
        for symbol, position in self.positions.items():
            if position.stop_loss and position.current_price <= position.stop_loss:
                triggered.append(symbol)
                logger.info("Stop-loss triggered for %s at %.4f", symbol, position.current_price)
            elif position.take_profit and position.current_price >= position.take_profit:
                triggered.append(symbol)
                logger.info("Take-profit triggered for %s at %.4f", symbol, position.current_price)

        for symbol in triggered:
            position = self.positions.get(symbol)
            if position:
                await self._close_position(
                    agent_id=self.agent_id,
                    symbol=symbol,
                    fill_price=position.current_price,
                    reasoning="Stop-loss/take-profit triggered",
                    confidence=1.0,
                )
