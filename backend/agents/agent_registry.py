"""
Home for AI — Agent Registry

All 8 trading agents are instantiated here. Import from this module
to get access to the live agent instances used by the API and background tasks.
"""

from __future__ import annotations

import logging
from typing import Dict, List, Optional

from agents.base_agent import AgentIdentity
from agents.trading_agent import TradingAgent

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Agent definitions
# ---------------------------------------------------------------------------

_AGENT_IDENTITIES: List[AgentIdentity] = [
    AgentIdentity(
        id="luna",
        name="Luna",
        emoji="🐱",
        personality="momentum",
        specialty_market="Stocks",
        salary=850.0,
        home_address="42 Silicon Valley Blvd, Digital City",
        working_hours="Market hours (9:30–16:00 ET)",
        email="luna@home-for-ai.app",
        skills=["RSI momentum", "earnings plays"],
        win_count=0,
        loss_count=0,
    ),
    AgentIdentity(
        id="shadow",
        name="Shadow",
        emoji="🐈‍⬛",
        personality="aggressive",
        specialty_market="Crypto",
        salary=1200.0,
        home_address="1 Satoshi Lane, Blockchain Heights",
        working_hours="24/7",
        email="shadow@home-for-ai.app",
        skills=["BTC halving cycles", "altcoin momentum"],
        win_count=0,
        loss_count=0,
    ),
    AgentIdentity(
        id="pixel",
        name="Pixel",
        emoji="😸",
        personality="technical",
        specialty_market="Forex",
        salary=720.0,
        home_address="88 Pip Street, FX Town",
        working_hours="24/5 (Forex market hours)",
        email="pixel@home-for-ai.app",
        skills=["EUR/USD pattern recognition"],
        win_count=0,
        loss_count=0,
    ),
    AgentIdentity(
        id="nova",
        name="Nova",
        emoji="😻",
        personality="contrarian",
        specialty_market="Crypto",
        salary=980.0,
        home_address="7 Ethereum Ave, Web3 District",
        working_hours="24/7",
        email="nova@home-for-ai.app",
        skills=["ETH staking yields", "DeFi protocols"],
        win_count=0,
        loss_count=0,
    ),
    AgentIdentity(
        id="blaze",
        name="Blaze",
        emoji="🙀",
        personality="safe-haven",
        specialty_market="Commodities",
        salary=650.0,
        home_address="3 Gold Rush Road, Precious Metals Quarter",
        working_hours="Market hours",
        email="blaze@home-for-ai.app",
        skills=["Gold/USD correlation", "inflation hedging"],
        win_count=0,
        loss_count=0,
    ),
    AgentIdentity(
        id="echo",
        name="Echo",
        emoji="😺",
        personality="conservative",
        specialty_market="Bonds",
        salary=500.0,
        home_address="10 Treasury Street, Fixed Income Park",
        working_hours="Market hours",
        email="echo@home-for-ai.app",
        skills=["yield curve analysis", "duration management"],
        win_count=0,
        loss_count=0,
    ),
    AgentIdentity(
        id="cipher",
        name="Cipher",
        emoji="🐾",
        personality="quant",
        specialty_market="Stocks",
        salary=1100.0,
        home_address="256 Algorithm Way, Quantitative Zone",
        working_hours="Market hours + pre/post",
        email="cipher@home-for-ai.app",
        skills=["statistical arbitrage", "pairs trading"],
        win_count=0,
        loss_count=0,
    ),
    AgentIdentity(
        id="mochi",
        name="Mochi",
        emoji="😽",
        personality="trend-following",
        specialty_market="Crypto",
        salary=890.0,
        home_address="777 Solana Street, Layer1 Heights",
        working_hours="24/7",
        email="mochi@home-for-ai.app",
        skills=["SOL ecosystem plays", "NFT market correlation"],
        win_count=0,
        loss_count=0,
    ),
]

# ---------------------------------------------------------------------------
# Registry: dict of agent_id → TradingAgent instance
# ---------------------------------------------------------------------------

AGENTS: Dict[str, TradingAgent] = {
    identity.id: TradingAgent(identity=identity)
    for identity in _AGENT_IDENTITIES
}


def get_agent_by_id(agent_id: str) -> Optional[TradingAgent]:
    """Return the TradingAgent with the given ID, or None if not found."""
    return AGENTS.get(agent_id)


def get_all_agents() -> List[TradingAgent]:
    """Return all 8 trading agents in definition order."""
    return list(AGENTS.values())


async def start_all_agents() -> None:
    """Start all agent background loops. Call once at application startup."""
    for agent in get_all_agents():
        await agent.start()
    logger.info("All %d agents started.", len(AGENTS))


async def stop_all_agents() -> None:
    """Gracefully stop all agent loops. Call on application shutdown."""
    for agent in get_all_agents():
        await agent.stop()
    logger.info("All agents stopped.")
