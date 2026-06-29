"""
Tests for the fusion LLM router.

All external HTTP calls are mocked — no API keys or network required.
"""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from models.fusion_llm import FusionLLM, LLMUnavailableError


@pytest.fixture
def llm() -> FusionLLM:
    return FusionLLM()


# ---------------------------------------------------------------------------
# Rule-based fallback tests (no LLM required)
# ---------------------------------------------------------------------------

class TestRuleBasedFallback:
    def test_momentum_buy_on_positive_move(self, llm: FusionLLM) -> None:
        result = llm.rule_based_decision("AAPL", price_change_pct=2.5, personality="momentum")
        assert result["action"] == "BUY"
        assert result["confidence"] > 0.5
        assert result["fallback"] is True

    def test_momentum_sell_on_negative_move(self, llm: FusionLLM) -> None:
        result = llm.rule_based_decision("AAPL", price_change_pct=-2.5, personality="momentum")
        assert result["action"] == "SELL"

    def test_contrarian_sell_on_big_rally(self, llm: FusionLLM) -> None:
        result = llm.rule_based_decision("BTC-USD", price_change_pct=3.5, personality="contrarian")
        assert result["action"] == "SELL"

    def test_contrarian_buy_on_big_drop(self, llm: FusionLLM) -> None:
        result = llm.rule_based_decision("ETH-USD", price_change_pct=-3.5, personality="contrarian")
        assert result["action"] == "BUY"

    def test_conservative_below_threshold(self, llm: FusionLLM) -> None:
        result = llm.rule_based_decision("TLT", price_change_pct=0.5, personality="conservative")
        assert result["confidence"] < 0.55  # should not trade

    def test_hold_on_small_move_momentum(self, llm: FusionLLM) -> None:
        result = llm.rule_based_decision("AAPL", price_change_pct=0.5, personality="momentum")
        assert result["action"] == "HOLD"


# ---------------------------------------------------------------------------
# Fusion (mocked HTTP)
# ---------------------------------------------------------------------------

class TestFusionLLMCalls:
    @pytest.mark.asyncio
    async def test_call_deepseek_success(self, llm: FusionLLM) -> None:
        """DeepSeek call returns expected content string."""
        llm._api_key = "test_key"
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [{"message": {"content": '{"action": "BUY", "confidence": 0.75}'}}]
        }
        mock_response.raise_for_status = MagicMock()

        with patch.object(llm, "_get_client") as mock_get_client:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_get_client.return_value = mock_client

            result = await llm.call_deepseek(
                messages=[{"role": "user", "content": "Should I buy AAPL?"}]
            )
            assert "BUY" in result

    @pytest.mark.asyncio
    async def test_call_raises_on_no_api_key(self, llm: FusionLLM) -> None:
        """Raises LLMUnavailableError if no API key is configured."""
        llm._api_key = ""
        with pytest.raises(LLMUnavailableError):
            await llm.call_deepseek(messages=[{"role": "user", "content": "test"}])

    @pytest.mark.asyncio
    async def test_fused_analysis_fallback_on_both_fail(self, llm: FusionLLM) -> None:
        """fused_analysis returns fallback method when both calls fail."""
        llm._api_key = "test_key"

        with patch.object(llm, "call_kimi", new_callable=AsyncMock) as mock_kimi, \
             patch.object(llm, "call_deepseek", new_callable=AsyncMock) as mock_ds:
            mock_kimi.side_effect = LLMUnavailableError("Kimi down")
            mock_ds.side_effect = LLMUnavailableError("DeepSeek down")

            result = await llm.fused_analysis(
                kimi_messages=[{"role": "user", "content": "analyze"}],
                deepseek_messages=[{"role": "user", "content": "decide"}],
            )
            assert result["method"] == "fallback"
            assert result["kimi_output"] is None
            assert result["deepseek_output"] is None

    @pytest.mark.asyncio
    async def test_fused_analysis_deepseek_only(self, llm: FusionLLM) -> None:
        """fused_analysis uses deepseek_only when Kimi fails."""
        llm._api_key = "test_key"

        with patch.object(llm, "call_kimi", new_callable=AsyncMock) as mock_kimi, \
             patch.object(llm, "call_deepseek", new_callable=AsyncMock) as mock_ds:
            mock_kimi.side_effect = LLMUnavailableError("Kimi down")
            mock_ds.return_value = '{"action": "BUY"}'

            result = await llm.fused_analysis(
                kimi_messages=[{"role": "user", "content": "analyze"}],
                deepseek_messages=[{"role": "user", "content": "decide"}],
            )
            assert result["method"] == "deepseek_only"
            assert result["deepseek_output"] is not None

    @pytest.mark.asyncio
    async def test_arbitrate_applies_confidence_penalty(self, llm: FusionLLM) -> None:
        """Arbitration should reduce confidence slightly."""
        kimi_decision = {"action": "BUY", "confidence": 0.80, "reasoning": "bullish"}
        ds_decision = {"action": "SELL", "confidence": 0.75, "reasoning": "bearish"}

        with patch.object(llm, "call_deepseek", new_callable=AsyncMock) as mock_ds:
            mock_ds.return_value = json.dumps({
                "action": "BUY",
                "confidence": 0.70,
                "reasoning": "arbitrated",
                "stop_loss": None,
                "take_profit": None,
            })

            result = await llm.arbitrate(kimi_decision, ds_decision, context="test")
            assert result["confidence"] < 0.70  # penalty applied
            assert result.get("arbitrated") is True
