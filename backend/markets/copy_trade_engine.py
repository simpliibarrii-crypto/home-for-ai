"""
Home for AI — Copy Trade Engine

Allows users to mirror an agent's trades proportionally.

Rules:
- User position size = agent position × (user_value / agent_value) × copy_ratio
- Platform fee: 15% on net profits only (never charged on losses)
- Drawdown circuit breaker: if agent down >15% in 30 days → pause + notify
- Users can set a copy_ratio (0.0–1.0) to reduce exposure

Copy trade flow:
1. User enables copy trading for agent X via POST /copy-trade/enable
2. CopyTradeEngine subscribes to agent X's trade events
3. On each agent trade → calculate proportional user position
4. Execute user trade via their own PortfolioManager (simulated)
5. Track user P&L separately from agent P&L
6. Deduct platform fee on profitable close
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable, Coroutine, Dict, List, Optional

logger = logging.getLogger(__name__)

PLATFORM_FEE_PCT = 0.15       # 15% of net profits
MAX_COPY_RATIO = 1.0
MIN_COPY_RATIO = 0.05
DEFAULT_COPY_RATIO = 0.5
DRAWDOWN_PAUSE_THRESHOLD = 15.0  # percent

# Callback type for notifying user via WebSocket
UserNotifyCallback = Callable[[str, str, Dict[str, Any]], Coroutine[Any, Any, None]]


@dataclass
class CopyTradeSubscription:
    """
    Represents a user's active copy trade subscription to one agent.
    """
    user_id: str
    agent_id: str
    copy_ratio: float = DEFAULT_COPY_RATIO
    is_active: bool = True
    enabled_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    total_pnl: float = 0.0
    total_fees_paid: float = 0.0
    trade_count: int = 0
    paused_reason: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "agent_id": self.agent_id,
            "copy_ratio": self.copy_ratio,
            "is_active": self.is_active,
            "enabled_at": self.enabled_at,
            "total_pnl": round(self.total_pnl, 2),
            "total_fees_paid": round(self.total_fees_paid, 2),
            "trade_count": self.trade_count,
            "paused_reason": self.paused_reason,
        }


class CopyTradeEngine:
    """
    Central engine managing all user copy-trade subscriptions.

    Wired into agent event bus: subscribes to agent trade events
    and fans them out to subscribed users.
    """

    def __init__(self) -> None:
        # user_id → {agent_id → CopyTradeSubscription}
        self._subscriptions: Dict[str, Dict[str, CopyTradeSubscription]] = {}
        # user portfolios (user_id → PortfolioManager)
        self._user_portfolios: Dict[str, Any] = {}
        # notification callback (WebSocket broadcast)
        self._notify_callback: Optional[UserNotifyCallback] = None

    def set_notify_callback(self, callback: UserNotifyCallback) -> None:
        """Register the WebSocket broadcast function for user notifications."""
        self._notify_callback = callback

    # ------------------------------------------------------------------
    # Subscription management
    # ------------------------------------------------------------------

    def enable(
        self,
        user_id: str,
        agent_id: str,
        copy_ratio: float = DEFAULT_COPY_RATIO,
        user_portfolio_value: float = 10_000.0,
    ) -> CopyTradeSubscription:
        """
        Enable copy trading for a user → agent pair.

        Creates a user portfolio if one doesn't exist yet.
        """
        copy_ratio = max(MIN_COPY_RATIO, min(MAX_COPY_RATIO, copy_ratio))

        sub = CopyTradeSubscription(
            user_id=user_id,
            agent_id=agent_id,
            copy_ratio=copy_ratio,
        )

        if user_id not in self._subscriptions:
            self._subscriptions[user_id] = {}
        self._subscriptions[user_id][agent_id] = sub

        # Create user portfolio if needed
        if user_id not in self._user_portfolios:
            from markets.portfolio_manager import PortfolioManager
            self._user_portfolios[user_id] = PortfolioManager(
                agent_id=f"user-{user_id}",
                starting_value=user_portfolio_value,
            )

        logger.info(
            "Copy trade enabled: user %s → agent %s (ratio=%.2f)",
            user_id, agent_id, copy_ratio,
        )
        return sub

    def disable(self, user_id: str, agent_id: str) -> bool:
        """Disable copy trading for a user → agent pair."""
        if user_id in self._subscriptions and agent_id in self._subscriptions[user_id]:
            self._subscriptions[user_id][agent_id].is_active = False
            logger.info("Copy trade disabled: user %s → agent %s", user_id, agent_id)
            return True
        return False

    def get_subscriptions(self, user_id: str) -> List[CopyTradeSubscription]:
        """Return all active subscriptions for a user."""
        return [
            sub
            for sub in self._subscriptions.get(user_id, {}).values()
            if sub.is_active
        ]

    def get_subscription(self, user_id: str, agent_id: str) -> Optional[CopyTradeSubscription]:
        return self._subscriptions.get(user_id, {}).get(agent_id)

    # ------------------------------------------------------------------
    # Trade mirroring
    # ------------------------------------------------------------------

    async def handle_agent_trade(
        self,
        event: str,
        payload: Dict[str, Any],
        agent_portfolio_value: float,
    ) -> None:
        """
        Called when an agent executes a trade.

        Fans the trade out to all subscribed users, proportionally sized.
        """
        agent_id = payload.get("agent_id", "")
        action = payload.get("action", "HOLD")
        symbol = payload.get("symbol", "")
        price = float(payload.get("price", 0))
        confidence = float(payload.get("confidence", 0.5))
        reasoning = payload.get("reasoning", "Copy trade mirror")

        for user_id, subs in self._subscriptions.items():
            sub = subs.get(agent_id)
            if not sub or not sub.is_active:
                continue

            user_pm = self._user_portfolios.get(user_id)
            if not user_pm:
                continue

            # Proportional sizing
            user_value = user_pm.total_value
            size_ratio = (
                (user_value / agent_portfolio_value) * sub.copy_ratio
                if agent_portfolio_value > 0
                else sub.copy_ratio
            )

            try:
                await self._mirror_trade(
                    user_id=user_id,
                    sub=sub,
                    user_pm=user_pm,
                    action=action,
                    symbol=symbol,
                    price=price,
                    size_ratio=size_ratio,
                    confidence=confidence,
                    reasoning=reasoning,
                )
            except Exception as exc:
                logger.exception("Copy trade failed for user %s: %s", user_id, exc)

    async def _mirror_trade(
        self,
        user_id: str,
        sub: CopyTradeSubscription,
        user_pm: Any,
        action: str,
        symbol: str,
        price: float,
        size_ratio: float,
        confidence: float,
        reasoning: str,
    ) -> None:
        """Execute a mirrored trade in the user's portfolio."""
        from models.decision_engine import TradingDecision, TradeAction

        try:
            trade_action = TradeAction(action.upper())
        except ValueError:
            return

        # Build a synthetic decision scaled to user's portfolio
        decision = TradingDecision(
            action=trade_action,
            symbol=symbol,
            confidence=confidence * size_ratio,
            reasoning=f"[Copy from agent] {reasoning}",
            entry_price=price,
        )

        trade_record = await user_pm.execute_trade(
            agent_id=f"user-{user_id}",
            decision=decision,
        )

        if trade_record:
            sub.trade_count += 1
            # Deduct platform fee on profitable closes
            if action == "SELL":
                gross_pnl = trade_record.get("pnl", 0)
                if gross_pnl > 0:
                    fee = gross_pnl * PLATFORM_FEE_PCT
                    sub.total_pnl += gross_pnl - fee
                    sub.total_fees_paid += fee
                    logger.info(
                        "Copy trade fee: user %s paid $%.2f (%.0f%% of $%.2f profit)",
                        user_id, fee, PLATFORM_FEE_PCT * 100, gross_pnl,
                    )
                else:
                    sub.total_pnl += gross_pnl  # losses pass through without fee

            # Notify user via WebSocket
            await self._notify_user(user_id, "copy_trade:update", {
                "agent_id": sub.agent_id,
                "symbol": symbol,
                "action": action,
                "price": price,
                "user_trade": trade_record,
                "subscription": sub.to_dict(),
            })

    # ------------------------------------------------------------------
    # Drawdown circuit breaker
    # ------------------------------------------------------------------

    async def check_drawdown(
        self,
        agent_id: str,
        drawdown_pct: float,
    ) -> None:
        """
        Called periodically with the agent's 30-day drawdown.

        If drawdown exceeds threshold → pause all subscriptions for this agent.
        """
        if drawdown_pct < DRAWDOWN_PAUSE_THRESHOLD:
            return

        paused_users: List[str] = []
        for user_id, subs in self._subscriptions.items():
            sub = subs.get(agent_id)
            if sub and sub.is_active:
                sub.is_active = False
                sub.paused_reason = (
                    f"Agent drawdown of {drawdown_pct:.1f}% exceeded "
                    f"{DRAWDOWN_PAUSE_THRESHOLD:.0f}% threshold"
                )
                paused_users.append(user_id)

        for user_id in paused_users:
            await self._notify_user(user_id, "copy_trade:paused", {
                "agent_id": agent_id,
                "drawdown_pct": drawdown_pct,
                "reason": f"Agent drawdown exceeded {DRAWDOWN_PAUSE_THRESHOLD:.0f}%",
            })

        if paused_users:
            logger.warning(
                "Paused copy trading for %d users (agent %s drawdown %.1f%%)",
                len(paused_users), agent_id, drawdown_pct,
            )

    # ------------------------------------------------------------------
    # User portfolio access
    # ------------------------------------------------------------------

    async def get_user_portfolio_summary(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Return the P&L summary for a user's copy-trade portfolio."""
        pm = self._user_portfolios.get(user_id)
        if not pm:
            return None
        return await pm.get_pnl_summary(agent_id=f"user-{user_id}")

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    async def _notify_user(
        self, user_id: str, event: str, payload: Dict[str, Any]
    ) -> None:
        if self._notify_callback:
            try:
                await self._notify_callback(user_id, event, payload)
            except Exception as exc:
                logger.warning("Failed to notify user %s: %s", user_id, exc)
