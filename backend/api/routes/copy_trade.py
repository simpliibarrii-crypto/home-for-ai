"""
Home for AI — Copy Trade API Routes

POST /copy-trade/enable     → Enable copy trading for an agent
POST /copy-trade/disable    → Disable copy trading
GET  /copy-trade/status     → All active subscriptions for the current user
GET  /copy-trade/portfolio  → User's copy-trade portfolio P&L
"""

from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter, Depends, Request, status
from pydantic import BaseModel, field_validator

from markets.copy_trade_engine import CopyTradeEngine
from security.auth import get_current_user
from security.input_validator import validate_agent_id, validate_copy_ratio
from security.rate_limiter import limiter

router = APIRouter(prefix="/copy-trade", tags=["copy-trade"])

# Module-level engine singleton (shared with main.py)
_copy_trade_engine: CopyTradeEngine | None = None


def get_copy_trade_engine() -> CopyTradeEngine:
    global _copy_trade_engine
    if _copy_trade_engine is None:
        _copy_trade_engine = CopyTradeEngine()
    return _copy_trade_engine


class EnableCopyTradeRequest(BaseModel):
    agent_id: str
    copy_ratio: float = 0.5
    starting_capital: float = 10_000.0

    @field_validator("agent_id")
    @classmethod
    def validate_aid(cls, v: str) -> str:
        return validate_agent_id(v)

    @field_validator("copy_ratio")
    @classmethod
    def validate_ratio(cls, v: float) -> float:
        return validate_copy_ratio(v)


class DisableCopyTradeRequest(BaseModel):
    agent_id: str

    @field_validator("agent_id")
    @classmethod
    def validate_aid(cls, v: str) -> str:
        return validate_agent_id(v)


@router.post("/enable", response_model=Dict[str, Any])
@limiter.limit("20/minute")
async def enable_copy_trade(
    request: Request,
    body: EnableCopyTradeRequest,
    user_id: str = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Enable copy trading: subscribe the current user to mirror an agent's trades.

    Position sizes are scaled proportionally:
    user_position = agent_position × (user_value / agent_value) × copy_ratio
    """
    engine = get_copy_trade_engine()

    # Also register in the agent's copy-trader list
    from agents.agent_registry import get_agent_by_id
    agent = get_agent_by_id(body.agent_id)
    if agent:
        agent.add_copy_trader(user_id)

    sub = engine.enable(
        user_id=user_id,
        agent_id=body.agent_id,
        copy_ratio=body.copy_ratio,
        user_portfolio_value=body.starting_capital,
    )

    return {
        "status": "enabled",
        "subscription": sub.to_dict(),
    }


@router.post("/disable", response_model=Dict[str, Any])
@limiter.limit("20/minute")
async def disable_copy_trade(
    request: Request,
    body: DisableCopyTradeRequest,
    user_id: str = Depends(get_current_user),
) -> Dict[str, Any]:
    """Disable copy trading for a specific agent."""
    engine = get_copy_trade_engine()

    from agents.agent_registry import get_agent_by_id
    agent = get_agent_by_id(body.agent_id)
    if agent:
        agent.remove_copy_trader(user_id)

    success = engine.disable(user_id=user_id, agent_id=body.agent_id)
    return {
        "status": "disabled" if success else "not_found",
        "agent_id": body.agent_id,
    }


@router.get("/status", response_model=List[Dict[str, Any]])
@limiter.limit("100/minute")
async def get_copy_trade_status(
    request: Request,
    user_id: str = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    """Return all active copy-trade subscriptions for the current user."""
    engine = get_copy_trade_engine()
    subs = engine.get_subscriptions(user_id)
    return [sub.to_dict() for sub in subs]


@router.get("/portfolio", response_model=Dict[str, Any])
@limiter.limit("60/minute")
async def get_copy_trade_portfolio(
    request: Request,
    user_id: str = Depends(get_current_user),
) -> Dict[str, Any]:
    """Return the current user's copy-trade portfolio P&L."""
    engine = get_copy_trade_engine()
    summary = await engine.get_user_portfolio_summary(user_id)
    if not summary:
        return {
            "user_id": user_id,
            "status": "no_active_subscriptions",
            "total_value": 0,
        }
    return {**summary, "user_id": user_id}
