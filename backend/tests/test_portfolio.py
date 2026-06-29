"""
Tests for portfolio management, copy trading, and P&L calculations.

No API keys or external services required.
"""

from __future__ import annotations

import pytest

from markets.portfolio_manager import PortfolioManager
from markets.copy_trade_engine import CopyTradeEngine


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def pm() -> PortfolioManager:
    return PortfolioManager(agent_id="test-agent", starting_value=100_000.0)


@pytest.fixture
def mock_decision():
    """Create a mock TradingDecision-like object."""
    class MockDecision:
        def __init__(self, action, symbol, confidence, price, stop_loss=None, take_profit=None):
            self.action = action
            self.symbol = symbol
            self.confidence = confidence
            self.entry_price = price
            self.stop_loss = stop_loss
            self.take_profit = take_profit
            self.reasoning = "test trade"
    return MockDecision


# ---------------------------------------------------------------------------
# Portfolio manager tests
# ---------------------------------------------------------------------------

class TestPortfolioManager:
    def test_initial_state(self, pm: PortfolioManager) -> None:
        assert pm.cash == 100_000.0
        assert pm.positions_value == 0.0
        assert pm.total_value == 100_000.0
        assert pm.total_pnl == 0.0

    @pytest.mark.asyncio
    async def test_open_position_reduces_cash(
        self, pm: PortfolioManager, mock_decision
    ) -> None:
        from models.decision_engine import TradeAction

        dec = mock_decision(TradeAction.BUY, "AAPL", 0.75, 150.0)
        trade = await pm.execute_trade("test-agent", dec)

        assert trade["action"] == "BUY"
        assert pm.cash < 100_000.0
        assert "AAPL" in pm.positions

    @pytest.mark.asyncio
    async def test_close_position_realises_pnl(
        self, pm: PortfolioManager, mock_decision
    ) -> None:
        from models.decision_engine import TradeAction

        # Open
        dec_buy = mock_decision(TradeAction.BUY, "AAPL", 0.75, 150.0)
        await pm.execute_trade("test-agent", dec_buy)

        # Update price (profit)
        pm.positions["AAPL"].current_price = 165.0

        # Close
        dec_sell = mock_decision(TradeAction.SELL, "AAPL", 0.8, 165.0)
        trade = await pm.execute_trade("test-agent", dec_sell)

        assert trade["action"] == "SELL"
        assert trade["pnl"] > 0
        assert trade["pnl_pct"] > 0
        assert "AAPL" not in pm.positions

    @pytest.mark.asyncio
    async def test_no_duplicate_position(
        self, pm: PortfolioManager, mock_decision
    ) -> None:
        from models.decision_engine import TradeAction

        dec = mock_decision(TradeAction.BUY, "MSFT", 0.70, 300.0)
        await pm.execute_trade("test-agent", dec)
        initial_cash = pm.cash

        # Second BUY on same symbol → should be ignored
        dec2 = mock_decision(TradeAction.BUY, "MSFT", 0.70, 305.0)
        result = await pm.execute_trade("test-agent", dec2)

        assert result == {}
        assert pm.cash == initial_cash

    @pytest.mark.asyncio
    async def test_position_sizing_scales_with_confidence(
        self, pm: PortfolioManager, mock_decision
    ) -> None:
        from models.decision_engine import TradeAction

        # High confidence position
        dec_high = mock_decision(TradeAction.BUY, "AAPL", 0.90, 150.0)
        pm2 = PortfolioManager(agent_id="pm2", starting_value=100_000.0)
        await pm2.execute_trade("pm2", dec_high)
        high_size = pm2.positions.get("AAPL", MagicMock()).cost_basis if "AAPL" in pm2.positions else 0

        # Low confidence position
        dec_low = mock_decision(TradeAction.BUY, "GOOG", 0.56, 150.0)
        pm3 = PortfolioManager(agent_id="pm3", starting_value=100_000.0)
        await pm3.execute_trade("pm3", dec_low)
        low_size = pm3.positions.get("GOOG", MagicMock()).cost_basis if "GOOG" in pm3.positions else 0

        assert high_size > low_size

    @pytest.mark.asyncio
    async def test_stop_loss_triggers(
        self, pm: PortfolioManager, mock_decision
    ) -> None:
        from models.decision_engine import TradeAction

        dec = mock_decision(TradeAction.BUY, "TSLA", 0.70, 200.0, stop_loss=180.0)
        await pm.execute_trade("test-agent", dec)
        assert "TSLA" in pm.positions

        # Price drops to stop-loss level
        await pm.update_prices({"TSLA": 179.0})
        # Stop-loss should have closed the position
        assert "TSLA" not in pm.positions

    @pytest.mark.asyncio
    async def test_pnl_summary_structure(self, pm: PortfolioManager) -> None:
        summary = await pm.get_pnl_summary("test-agent")
        required_keys = {
            "agent_id", "total_value", "total_pnl", "total_pnl_pct",
            "daily_pnl_pct", "drawdown_30d_pct", "cash", "positions_value",
            "open_positions", "newly_closed_trades", "timestamp",
        }
        assert required_keys.issubset(summary.keys())


# ---------------------------------------------------------------------------
# Copy trade engine tests
# ---------------------------------------------------------------------------

class TestCopyTradeEngine:
    @pytest.fixture
    def engine(self) -> CopyTradeEngine:
        return CopyTradeEngine()

    def test_enable_creates_subscription(self, engine: CopyTradeEngine) -> None:
        sub = engine.enable("user-1", "luna", copy_ratio=0.5, user_portfolio_value=10_000)
        assert sub.is_active is True
        assert sub.agent_id == "luna"
        assert sub.copy_ratio == 0.5

    def test_disable_deactivates_subscription(self, engine: CopyTradeEngine) -> None:
        engine.enable("user-1", "shadow")
        result = engine.disable("user-1", "shadow")
        assert result is True
        subs = engine.get_subscriptions("user-1")
        assert len(subs) == 0  # no active subs

    def test_multiple_agents_per_user(self, engine: CopyTradeEngine) -> None:
        engine.enable("user-2", "luna")
        engine.enable("user-2", "shadow")
        engine.enable("user-2", "cipher")
        subs = engine.get_subscriptions("user-2")
        assert len(subs) == 3

    def test_copy_ratio_clamped(self, engine: CopyTradeEngine) -> None:
        sub = engine.enable("user-3", "nova", copy_ratio=5.0)  # too high
        assert sub.copy_ratio <= 1.0

        sub2 = engine.enable("user-3", "mochi", copy_ratio=0.001)  # too low
        assert sub2.copy_ratio >= 0.05

    @pytest.mark.asyncio
    async def test_drawdown_pauses_subscriptions(self, engine: CopyTradeEngine) -> None:
        engine.enable("user-4", "blaze")
        assert engine.get_subscriptions("user-4")[0].is_active is True

        await engine.check_drawdown("blaze", drawdown_pct=20.0)
        subs = engine.get_subscriptions("user-4")
        # All subscriptions for this agent should be paused
        assert len(subs) == 0  # is_active=False → filtered out

    @pytest.mark.asyncio
    async def test_no_pause_below_threshold(self, engine: CopyTradeEngine) -> None:
        engine.enable("user-5", "echo")
        await engine.check_drawdown("echo", drawdown_pct=10.0)  # below 15%
        subs = engine.get_subscriptions("user-5")
        assert len(subs) == 1  # still active


# Add MagicMock import at module level for sizing test
from unittest.mock import MagicMock  # noqa: E402
