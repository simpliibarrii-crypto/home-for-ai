"""
Home for AI — Agents Package

Autonomous AI trading agents, each with a unique cat identity.
"""

from agents.base_agent import BaseAgent, AgentIdentity, AgentState
from agents.trading_agent import TradingAgent
from agents.agent_registry import AGENTS, get_agent_by_id, get_all_agents

__all__ = [
    "BaseAgent",
    "AgentIdentity",
    "AgentState",
    "TradingAgent",
    "AGENTS",
    "get_agent_by_id",
    "get_all_agents",
]
