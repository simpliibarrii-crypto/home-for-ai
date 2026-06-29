"""
Home for AI — Agents API Routes

GET  /agents          → List all 8 agents with state + portfolio snapshot
GET  /agents/{id}     → Single agent detail
GET  /agents/{id}/trades → Agent trade history (paginated)
GET  /agents/{id}/skills → Agent learned skills
POST /agents/{id}/start  → Start agent loop (admin)
POST /agents/{id}/stop   → Stop agent loop (admin)
"""

from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, Request, status

from agents.agent_registry import get_agent_by_id, get_all_agents
from security.auth import get_current_user
from security.input_validator import validate_agent_id
from security.rate_limiter import limiter

router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("", response_model=List[Dict[str, Any]])
@limiter.limit("100/minute")
async def list_agents(
    request: Request,
    _user_id: str = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    """Return a summary list of all 8 trading agents."""
    return [agent.to_dict() for agent in get_all_agents()]


@router.get("/{agent_id}", response_model=Dict[str, Any])
@limiter.limit("100/minute")
async def get_agent(
    request: Request,
    agent_id: str,
    _user_id: str = Depends(get_current_user),
) -> Dict[str, Any]:
    """Return detailed state for a single agent."""
    safe_id = validate_agent_id(agent_id)
    agent = get_agent_by_id(safe_id)
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found.")
    return agent.to_dict()


@router.get("/{agent_id}/trades", response_model=List[Dict[str, Any]])
@limiter.limit("100/minute")
async def get_agent_trades(
    request: Request,
    agent_id: str,
    limit: int = 50,
    offset: int = 0,
    _user_id: str = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    """Return paginated trade history for an agent."""
    safe_id = validate_agent_id(agent_id)
    agent = get_agent_by_id(safe_id)
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found.")

    limit = max(1, min(limit, 200))
    offset = max(0, offset)

    trades = agent.trade_history[offset: offset + limit]
    return trades


@router.get("/{agent_id}/skills", response_model=Dict[str, Any])
@limiter.limit("100/minute")
async def get_agent_skills(
    request: Request,
    agent_id: str,
    _user_id: str = Depends(get_current_user),
) -> Dict[str, Any]:
    """Return the agent's current learned skill set."""
    safe_id = validate_agent_id(agent_id)
    agent = get_agent_by_id(safe_id)
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found.")

    identity = agent.identity
    return {
        "agent_id": safe_id,
        "name": identity.name,
        "skills": identity.skills,
        "win_count": identity.win_count,
        "loss_count": identity.loss_count,
        "win_rate": round(identity.win_rate, 3),
    }


@router.post("/{agent_id}/start", response_model=Dict[str, str])
async def start_agent(
    request: Request,
    agent_id: str,
    _user_id: str = Depends(get_current_user),
) -> Dict[str, str]:
    """Start an agent's decision loop (admin operation)."""
    safe_id = validate_agent_id(agent_id)
    agent = get_agent_by_id(safe_id)
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found.")
    await agent.start()
    return {"status": "started", "agent_id": safe_id}


@router.post("/{agent_id}/stop", response_model=Dict[str, str])
async def stop_agent(
    request: Request,
    agent_id: str,
    _user_id: str = Depends(get_current_user),
) -> Dict[str, str]:
    """Stop an agent's decision loop (admin operation)."""
    safe_id = validate_agent_id(agent_id)
    agent = get_agent_by_id(safe_id)
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found.")
    await agent.stop()
    return {"status": "stopped", "agent_id": safe_id}
