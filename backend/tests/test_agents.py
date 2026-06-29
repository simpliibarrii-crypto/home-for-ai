"""
Tests for the agent module.

All LLM calls are mocked — no API keys required.
"""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from agents.base_agent import AgentIdentity, AgentState
from agents.skill_engine import evaluate_trade_outcome, get_skills_context
from agents.trading_agent import TradingAgent


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def sample_identity() -> AgentIdentity:
    return AgentIdentity(
        id="luna",
        name="Luna",
        emoji="🐱",
        personality="momentum",
        specialty_market="Stocks",
        salary=850.0,
        home_address="42 Silicon Valley Blvd",
        working_hours="Market hours",
        email="luna@home-for-ai.app",
        skills=["RSI momentum"],
        win_count=0,
        loss_count=0,
    )


@pytest.fixture
def trading_agent(sample_identity: AgentIdentity) -> TradingAgent:
    agent = TradingAgent(identity=sample_identity, loop_interval=9999, pnl_interval=9999)
    return agent


# ---------------------------------------------------------------------------
# AgentIdentity tests
# ---------------------------------------------------------------------------

class TestAgentIdentity:
    def test_win_rate_zero_on_no_trades(self, sample_identity: AgentIdentity) -> None:
        assert sample_identity.win_rate == 0.0

    def test_win_rate_calculation(self, sample_identity: AgentIdentity) -> None:
        sample_identity.win_count = 7
        sample_identity.loss_count = 3
        assert sample_identity.win_rate == pytest.approx(0.7)

    def test_to_dict_contains_required_keys(self, sample_identity: AgentIdentity) -> None:
        d = sample_identity.to_dict()
        required = {"id", "name", "emoji", "personality", "specialty_market",
                    "skills", "win_count", "loss_count", "win_rate"}
        assert required.issubset(d.keys())


# ---------------------------------------------------------------------------
# AgentState machine tests
# ---------------------------------------------------------------------------

class TestAgentStateMachine:
    @pytest.mark.asyncio
    async def test_state_transitions_emit_events(
        self, trading_agent: TradingAgent
    ) -> None:
        events_received = []

        async def capture(event: str, payload: dict) -> None:
            events_received.append((event, payload))

        trading_agent.subscribe(capture)
        await trading_agent.set_state(AgentState.ANALYZING)

        assert any(e[0] == "agent:status" for e in events_received)
        state_event = next(e for e in events_received if e[0] == "agent:status")
        assert state_event[1]["state"] == "ANALYZING"

    @pytest.mark.asyncio
    async def test_memory_limit_enforced(self, trading_agent: TradingAgent) -> None:
        trading_agent.memory_limit = 5
        for i in range(10):
            trading_agent.remember({"entry": i})
        assert len(trading_agent.memory) == 5

    @pytest.mark.asyncio
    async def test_start_stop(self, trading_agent: TradingAgent) -> None:
        """Agent should start cleanly and stop without hanging."""
        # Mock the heavy dependencies
        with patch.object(trading_agent, "fetch_market_data", new_callable=AsyncMock) as mock_fetch, \
             patch.object(trading_agent, "analyze", new_callable=AsyncMock) as mock_analyze, \
             patch.object(trading_agent, "decide", new_callable=AsyncMock) as mock_decide, \
             patch.object(trading_agent, "execute", new_callable=AsyncMock) as mock_exec, \
             patch.object(trading_agent, "update_pnl", new_callable=AsyncMock) as mock_pnl:

            mock_fetch.return_value = {}
            mock_analyze.return_value = {}
            mock_decide.return_value = MagicMock(action="HOLD", confidence=0.3)
            mock_exec.return_value = {}
            mock_pnl.return_value = {}

            await trading_agent.start()
            assert trading_agent._running is True
            await asyncio.sleep(0.05)
            await trading_agent.stop()
            assert trading_agent._running is False


# ---------------------------------------------------------------------------
# Skill engine tests
# ---------------------------------------------------------------------------

class TestSkillEngine:
    @pytest.mark.asyncio
    async def test_skill_added_on_big_win(self, sample_identity: AgentIdentity) -> None:
        trade = {
            "symbol": "AAPL",
            "action": "BUY",
            "pnl_pct": 3.5,
            "market_conditions": "bullish",
        }
        skill = await evaluate_trade_outcome(sample_identity, trade, fusion_llm=None)
        assert skill is not None
        assert sample_identity.win_count == 1
        assert len(sample_identity.skills) >= 2  # original + new

    @pytest.mark.asyncio
    async def test_no_skill_on_small_move(self, sample_identity: AgentIdentity) -> None:
        trade = {
            "symbol": "AAPL",
            "action": "BUY",
            "pnl_pct": 0.5,  # below threshold
            "market_conditions": "flat",
        }
        skill = await evaluate_trade_outcome(sample_identity, trade, fusion_llm=None)
        assert skill is None

    @pytest.mark.asyncio
    async def test_skill_added_on_big_loss(self, sample_identity: AgentIdentity) -> None:
        trade = {
            "symbol": "TSLA",
            "action": "BUY",
            "pnl_pct": -4.2,
            "market_conditions": "volatile",
        }
        skill = await evaluate_trade_outcome(sample_identity, trade, fusion_llm=None)
        assert skill is not None
        assert sample_identity.loss_count == 1

    def test_get_skills_context_empty(self, sample_identity: AgentIdentity) -> None:
        sample_identity.skills = []
        ctx = get_skills_context(sample_identity)
        assert "No learned skills" in ctx

    def test_get_skills_context_with_skills(self, sample_identity: AgentIdentity) -> None:
        sample_identity.skills = ["skill one", "skill two", "skill three"]
        ctx = get_skills_context(sample_identity, limit=2)
        assert "skill two" in ctx
        assert "skill three" in ctx


# ---------------------------------------------------------------------------
# Agent registry tests
# ---------------------------------------------------------------------------

class TestAgentRegistry:
    def test_all_8_agents_present(self) -> None:
        from agents.agent_registry import AGENTS
        assert len(AGENTS) == 8

    def test_get_agent_by_id(self) -> None:
        from agents.agent_registry import get_agent_by_id
        agent = get_agent_by_id("luna")
        assert agent is not None
        assert agent.identity.name == "Luna"

    def test_get_agent_invalid_id(self) -> None:
        from agents.agent_registry import get_agent_by_id
        assert get_agent_by_id("nonexistent") is None

    def test_all_agents_have_unique_ids(self) -> None:
        from agents.agent_registry import AGENTS
        ids = list(AGENTS.keys())
        assert len(ids) == len(set(ids))

    def test_all_agents_have_unique_emails(self) -> None:
        from agents.agent_registry import get_all_agents
        emails = [a.identity.email for a in get_all_agents()]
        assert len(emails) == len(set(emails))
