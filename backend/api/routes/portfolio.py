"""
Home for AI — Portfolio API Routes

GET /portfolio                → Aggregate portfolio across all agents
GET /portfolio/{agent_id}     → Single agent portfolio detail
GET /portfolio/history        → P&L chart history (time-series)
GET /portfolio/{agent_id}/positions → Open positions for an agent
"""

from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, Request, status

from agents.agent_registry import get_agent_by_id, get_all_agents
from security.auth import get_current_user
from security.input_validator import validate_agent_id
from security.rate_limiter import limiter

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


@router.get("", response_model=Dict[str, Any])
@limiter.limit("100/minute")
async def get_aggregate_portfolio(
    request: Request,
    _user_id: str = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Return aggregated portfolio statistics across all 8 agents.

    Includes combined P&L, open positions count, and per-agent snapshots.
    """
    agents = get_all_agents()
    agent_snapshots = []
    total_value = 0.0
    total_starting = 0.0

    for agent in agents:
        pm = agent._portfolio_manager
        if pm:
            snap = pm.snapshot()
            agent_snapshots.append({**snap, "name": agent.identity.name, "emoji": agent.identity.emoji})
            total_value += snap.get("total_value", 0)
            total_starting += pm.starting_value

    combined_pnl = total_value - total_starting
    combined_pnl_pct = combined_pnl / total_starting * 100 if total_starting else 0.0

    return {
        "total_value": round(total_value, 2),
        "combined_pnl": round(combined_pnl, 2),
        "combined_pnl_pct": round(combined_pnl_pct, 3),
        "agents": agent_snapshots,
        "agent_count": len(agents),
    }


@router.get("/history", response_model=List[Dict[str, Any]])
@limiter.limit("60/minute")
async def get_portfolio_history(
    request: Request,
    agent_id: str | None = None,
    _user_id: str = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    """
    Return P&L history snapshots for charting.

    Optionally filter by agent_id. Returns snapshots in ascending time order.
    In production this queries the Portfolio DB table; here returns in-memory
    snapshots from the PortfolioManager.
    """
    if agent_id:
        safe_id = validate_agent_id(agent_id)
        agent = get_agent_by_id(safe_id)
        if not agent or not agent._portfolio_manager:
            return []
        return [
            {"timestamp": t.isoformat(), "value": v, "agent_id": safe_id}
            for t, v in agent._portfolio_manager._pnl_snapshots
        ]

    # Aggregate across all agents
    all_snapshots: List[Dict[str, Any]] = []
    for agent in get_all_agents():
        pm = agent._portfolio_manager
        if pm:
            for t, v in pm._pnl_snapshots:
                all_snapshots.append({
                    "timestamp": t.isoformat(),
                    "value": v,
                    "agent_id": agent.identity.id,
                })

    all_snapshots.sort(key=lambda x: x["timestamp"])
    return all_snapshots


@router.get("/{agent_id}", response_model=Dict[str, Any])
@limiter.limit("100/minute")
async def get_agent_portfolio(
    request: Request,
    agent_id: str,
    _user_id: str = Depends(get_current_user),
) -> Dict[str, Any]:
    """Return full portfolio P&L summary for a specific agent."""
    safe_id = validate_agent_id(agent_id)
    agent = get_agent_by_id(safe_id)
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found.")

    pm = agent._portfolio_manager
    if not pm:
        return {"agent_id": safe_id, "status": "portfolio not initialised"}

    return await pm.get_pnl_summary(agent_id=safe_id)


@router.get("/{agent_id}/positions", response_model=Dict[str, Any])
@limiter.limit("100/minute")
async def get_agent_positions(
    request: Request,
    agent_id: str,
    _user_id: str = Depends(get_current_user),
) -> Dict[str, Any]:
    """Return all open positions for an agent with current mark-to-market values."""
    safe_id = validate_agent_id(agent_id)
    agent = get_agent_by_id(safe_id)
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found.")

    pm = agent._portfolio_manager
    if not pm:
        return {"agent_id": safe_id, "positions": {}}

    return {
        "agent_id": safe_id,
        "positions": {s: p.to_dict() for s, p in pm.positions.items()},
        "cash": round(pm.cash, 2),
        "total_value": round(pm.total_value, 2),
    }
