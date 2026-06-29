"""
Home for AI — SQLAlchemy ORM Models

Tables:
- users           — registered users with hashed passwords
- trades          — all simulated trades by agents and copy traders
- portfolios      — portfolio value snapshots for charting history
- agent_skill_log — audit log of learned skills per agent
- copy_trade_configs — user copy-trade subscription settings
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

class User(Base):
    """Platform user account."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)
    api_key_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )

    # Relationships
    trades: Mapped[list["Trade"]] = relationship("Trade", back_populates="user", lazy="select")
    copy_trade_configs: Mapped[list["CopyTradeConfig"]] = relationship(
        "CopyTradeConfig", back_populates="user", lazy="select"
    )

    def __repr__(self) -> str:
        return f"<User {self.username!r} ({self.email!r})>"


# ---------------------------------------------------------------------------
# Trades
# ---------------------------------------------------------------------------

class Trade(Base):
    """Record of a single executed (simulated) trade."""

    __tablename__ = "trades"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    trade_ref: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    agent_id: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True, index=True
    )
    is_copy_trade: Mapped[bool] = mapped_column(Boolean, default=False)

    symbol: Mapped[str] = mapped_column(String(30), index=True, nullable=False)
    action: Mapped[str] = mapped_column(String(10), nullable=False)  # BUY | SELL | HOLD
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    fee: Mapped[float] = mapped_column(Float, default=0.0)
    pnl: Mapped[float] = mapped_column(Float, default=0.0)
    pnl_pct: Mapped[float] = mapped_column(Float, default=0.0)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    reasoning: Mapped[str] = mapped_column(Text, default="")
    market_conditions: Mapped[str] = mapped_column(Text, default="")
    platform_fee: Mapped[float] = mapped_column(Float, default=0.0)  # 15% on profits (copy trades)

    executed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, index=True
    )

    # Relationships
    user: Mapped["User | None"] = relationship("User", back_populates="trades")

    def __repr__(self) -> str:
        return f"<Trade {self.action} {self.symbol} @{self.price} by {self.agent_id!r}>"


# ---------------------------------------------------------------------------
# Portfolio snapshots
# ---------------------------------------------------------------------------

class Portfolio(Base):
    """
    Hourly portfolio value snapshots for charting.

    One row per agent per hour. Used for P&L history charts on the frontend.
    """

    __tablename__ = "portfolios"
    __table_args__ = (
        UniqueConstraint("agent_id", "snapshot_at", name="uq_portfolio_agent_time"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    agent_id: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True, index=True
    )

    total_value: Mapped[float] = mapped_column(Float, nullable=False)
    cash: Mapped[float] = mapped_column(Float, nullable=False)
    positions_value: Mapped[float] = mapped_column(Float, default=0.0)
    total_pnl: Mapped[float] = mapped_column(Float, default=0.0)
    total_pnl_pct: Mapped[float] = mapped_column(Float, default=0.0)
    daily_pnl_pct: Mapped[float] = mapped_column(Float, default=0.0)
    drawdown_30d_pct: Mapped[float] = mapped_column(Float, default=0.0)
    snapshot_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, index=True
    )

    def __repr__(self) -> str:
        return f"<Portfolio agent={self.agent_id!r} value={self.total_value:.2f}>"


# ---------------------------------------------------------------------------
# Agent skill log
# ---------------------------------------------------------------------------

class AgentSkillLog(Base):
    """
    Audit trail of skills learned by each agent over time.

    Enables the frontend to show a skill timeline.
    """

    __tablename__ = "agent_skill_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    agent_id: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    skill: Mapped[str] = mapped_column(Text, nullable=False)
    trigger_trade_ref: Mapped[str | None] = mapped_column(String(100), nullable=True)
    trigger_pnl_pct: Mapped[float] = mapped_column(Float, default=0.0)
    is_win: Mapped[bool] = mapped_column(Boolean, default=True)
    learned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, index=True
    )

    def __repr__(self) -> str:
        return f"<AgentSkillLog {self.agent_id!r}: {self.skill[:40]!r}>"


# ---------------------------------------------------------------------------
# Copy trade config
# ---------------------------------------------------------------------------

class CopyTradeConfig(Base):
    """
    User's copy trade subscription to an agent.

    Persists subscription state across restarts.
    """

    __tablename__ = "copy_trade_configs"
    __table_args__ = (
        UniqueConstraint("user_id", "agent_id", name="uq_copy_trade_user_agent"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    agent_id: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    copy_ratio: Mapped[float] = mapped_column(Float, default=0.5)
    total_pnl: Mapped[float] = mapped_column(Float, default=0.0)
    total_fees_paid: Mapped[float] = mapped_column(Float, default=0.0)
    trade_count: Mapped[int] = mapped_column(Integer, default=0)
    paused_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    enabled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="copy_trade_configs")

    def __repr__(self) -> str:
        return (
            f"<CopyTradeConfig user={self.user_id} agent={self.agent_id!r} "
            f"active={self.is_active}>"
        )
