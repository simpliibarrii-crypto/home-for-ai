"""
Home for AI — Skill Engine

Agents learn from trade outcomes. After a significant win or loss,
the skill engine generates a natural-language lesson using the fusion LLM
and appends it to the agent's skills list.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any, Dict, List, Optional

if TYPE_CHECKING:
    from agents.base_agent import AgentIdentity

logger = logging.getLogger(__name__)

# Thresholds for triggering skill learning (percentage of position value)
WIN_THRESHOLD_PCT = 2.0
LOSS_THRESHOLD_PCT = 2.0

# Maximum skills an agent can hold (oldest pruned)
MAX_SKILLS = 20


async def evaluate_trade_outcome(
    identity: "AgentIdentity",
    trade_record: Dict[str, Any],
    fusion_llm: Optional[Any] = None,
) -> Optional[str]:
    """
    Evaluate a completed trade and optionally generate a new skill lesson.

    Parameters
    ----------
    identity:     The agent's identity (skills list is mutated in-place).
    trade_record: Dict containing at least: symbol, action, entry_price,
                  exit_price, pnl_pct, market_conditions (optional).
    fusion_llm:   FusionLLM instance for generating lessons. If None,
                  falls back to rule-based lesson generation.

    Returns
    -------
    The new skill string if one was added, otherwise None.
    """
    pnl_pct: float = trade_record.get("pnl_pct", 0.0)
    symbol: str = trade_record.get("symbol", "UNKNOWN")
    action: str = trade_record.get("action", "BUY")
    market_conditions: str = trade_record.get("market_conditions", "")

    is_win = pnl_pct >= WIN_THRESHOLD_PCT
    is_loss = pnl_pct <= -LOSS_THRESHOLD_PCT

    if not (is_win or is_loss):
        return None

    # Update win/loss counters
    if is_win:
        identity.win_count += 1
    else:
        identity.loss_count += 1

    new_skill: Optional[str] = None

    if fusion_llm is not None:
        try:
            new_skill = await _generate_skill_with_llm(
                identity=identity,
                trade_record=trade_record,
                is_win=is_win,
                fusion_llm=fusion_llm,
            )
        except Exception as exc:
            logger.warning("Skill LLM generation failed, using fallback: %s", exc)

    if new_skill is None:
        new_skill = _generate_skill_rule_based(
            symbol=symbol,
            action=action,
            pnl_pct=pnl_pct,
            market_conditions=market_conditions,
            is_win=is_win,
        )

    _add_skill(identity, new_skill)
    logger.info("Agent %s learned new skill: %s", identity.name, new_skill)
    return new_skill


async def _generate_skill_with_llm(
    identity: "AgentIdentity",
    trade_record: Dict[str, Any],
    is_win: bool,
    fusion_llm: Any,
) -> str:
    """Generate a concise skill lesson via the fusion LLM."""
    outcome = "profitable" if is_win else "losing"
    prompt = (
        f"You are {identity.name}, a {identity.personality} trading agent specialising in "
        f"{identity.specialty_market}. You just completed a {outcome} trade:\n"
        f"- Symbol: {trade_record.get('symbol')}\n"
        f"- Action: {trade_record.get('action')}\n"
        f"- P&L: {trade_record.get('pnl_pct', 0):.2f}%\n"
        f"- Market conditions: {trade_record.get('market_conditions', 'N/A')}\n"
        f"- Reasoning used: {trade_record.get('reasoning', 'N/A')}\n\n"
        f"In ONE concise sentence (max 15 words), what did you {'master' if is_win else 'learn to avoid'}? "
        f"Write it as a skill in first-person: 'mastered ...' or 'learned to avoid ...'."
    )

    # Use DeepSeek for fast structured output
    response = await fusion_llm.call_deepseek(
        messages=[{"role": "user", "content": prompt}],
        max_tokens=60,
        temperature=0.4,
    )
    return response.strip().strip('"').strip("'")


def _generate_skill_rule_based(
    symbol: str,
    action: str,
    pnl_pct: float,
    market_conditions: str,
    is_win: bool,
) -> str:
    """Rule-based fallback skill generation without LLM."""
    if is_win:
        templates: List[str] = [
            f"mastered {action.lower()} entries on {symbol} in trending conditions",
            f"learned to capitalise on momentum in {symbol}",
            f"mastered timing {symbol} {action.lower()} for +{abs(pnl_pct):.1f}% gains",
        ]
    else:
        templates = [
            f"learned to avoid {action.lower()} {symbol} in high-volatility conditions",
            f"identified stop-loss discipline gaps in {symbol} trades",
            f"learned to exit {symbol} positions before {abs(pnl_pct):.1f}% drawdown",
        ]

    import hashlib
    idx = int(hashlib.md5(symbol.encode()).hexdigest(), 16) % len(templates)
    return templates[idx]


def _add_skill(identity: "AgentIdentity", skill: str) -> None:
    """Append a skill and enforce the MAX_SKILLS cap."""
    if skill not in identity.skills:
        identity.skills.append(skill)
    if len(identity.skills) > MAX_SKILLS:
        identity.skills = identity.skills[-MAX_SKILLS:]


def get_skills_context(identity: "AgentIdentity", limit: int = 5) -> str:
    """Return a formatted string of the agent's most recent skills for LLM injection."""
    recent = identity.skills[-limit:] if identity.skills else []
    if not recent:
        return "No learned skills yet."
    return "\n".join(f"- {s}" for s in recent)
