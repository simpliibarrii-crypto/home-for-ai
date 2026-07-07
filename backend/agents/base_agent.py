"""
Home for AI — Base Agent

Abstract base class for all trading agents. Defines the agent identity
dataclass, state machine, and the core async decision loop.
"""

from __future__ import annotations

import asyncio
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable, Coroutine, Dict, List, Optional

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# State machine
# ---------------------------------------------------------------------------

class AgentState(str, Enum):
    """Lifecycle states for a trading agent."""

    IDLE = "IDLE"
    ANALYZING = "ANALYZING"
    TRADING = "TRADING"
    WAITING = "WAITING"
    SLEEPING = "SLEEPING"
    ERROR = "ERROR"


# ---------------------------------------------------------------------------
# Identity dataclass
# ---------------------------------------------------------------------------

@dataclass
class AgentIdentity:
    """
    Immutable (mostly) identity record for a trading agent.

    Personality drives the agent's prompt persona.
    specialty_market determines which data feeds are prioritised.
    skills grow over time as the agent learns from trade outcomes.
    """

    id: str
    name: str
    emoji: str
    personality: str          # e.g. "aggressive", "conservative", "momentum"
    specialty_market: str     # "Stocks" | "Crypto" | "Forex" | "Bonds" | "Commodities"
    salary: float             # simulated daily salary in USD
    home_address: str
    working_hours: str
    email: str
    skills: List[str] = field(default_factory=list)
    win_count: int = 0
    loss_count: int = 0

    # ---- derived stats ----
    @property
    def win_rate(self) -> float:
        """Fraction of trades that are wins, 0.0 if no history."""
        total = self.win_count + self.loss_count
        return self.win_count / total if total > 0 else 0.0

    def to_dict(self) -> Dict[str, Any]:
        """Serialise to a plain dict (for JSON responses)."""
        return {
            "id": self.id,
            "name": self.name,
            "emoji": self.emoji,
            "personality": self.personality,
            "specialty_market": self.specialty_market,
            "salary": self.salary,
            "home_address": self.home_address,
            "working_hours": self.working_hours,
            "email": self.email,
            "skills": self.skills,
            "win_count": self.win_count,
            "loss_count": self.loss_count,
            "win_rate": round(self.win_rate, 3),
        }


# ---------------------------------------------------------------------------
# Base agent
# ---------------------------------------------------------------------------

# Event callback type: async (event_name: str, payload: dict) -> None
EventCallback = Callable[[str, Dict[str, Any]], Coroutine[Any, Any, None]]


class BaseAgent(ABC):
    """
    Abstract base class for autonomous trading agents.

    Subclasses must implement:
        - fetch_market_data() → dict of raw market data
        - analyze()           → structured analysis result
        - decide()            → TradingDecision
        - execute()           → trade execution / simulation

    The ``run()`` coroutine drives the main 5-minute decision loop.
    """

    def __init__(
        self,
        identity: AgentIdentity,
        loop_interval: int = 300,
        pnl_interval: int = 3600,
    ) -> None:
        self.identity = identity
        self.loop_interval = loop_interval    # seconds between decision cycles
        self.pnl_interval = pnl_interval      # seconds between P&L updates

        self.state: AgentState = AgentState.IDLE
        self.last_decision_at: Optional[datetime] = None
        self.last_pnl_at: Optional[datetime] = None

        # Memory: rolling log of the last N thoughts / trade summaries
        self.memory: List[Dict[str, Any]] = []
        self.memory_limit: int = 50

        # Event bus: external subscribers can listen for agent events
        self._event_callbacks: List[EventCallback] = []

        # Control flag
        self._running: bool = False
        self._loop_task: Optional[asyncio.Task] = None  # type: ignore[type-arg]
        self._pnl_task: Optional[asyncio.Task] = None   # type: ignore[type-arg]

        logger.info(
            "Agent %s (%s) initialised — personality: %s, market: %s",
            identity.name,
            identity.id,
            identity.personality,
            identity.specialty_market,
        )

    # ------------------------------------------------------------------
    # Abstract interface
    # ------------------------------------------------------------------

    @abstractmethod
    async def fetch_market_data(self) -> Dict[str, Any]:
        """Fetch all market data relevant to this agent's specialty."""
        ...

    @abstractmethod
    async def analyze(self, market_data: Dict[str, Any]) -> Dict[str, Any]:
        """Run market analysis using the fusion LLM stack."""
        ...

    @abstractmethod
    async def decide(self, analysis: Dict[str, Any]) -> Any:
        """Produce a TradingDecision from analysis output."""
        ...

    @abstractmethod
    async def execute(self, decision: Any) -> Dict[str, Any]:
        """Execute or simulate the trade; returns trade record."""
        ...

    @abstractmethod
    async def update_pnl(self) -> Dict[str, Any]:
        """Recalculate P&L and check drawdown limits."""
        ...

    # ------------------------------------------------------------------
    # Event bus
    # ------------------------------------------------------------------

    def subscribe(self, callback: EventCallback) -> None:
        """Register an async callback for all agent events."""
        self._event_callbacks.append(callback)

    def unsubscribe(self, callback: EventCallback) -> None:
        """Remove a previously registered callback."""
        self._event_callbacks = [cb for cb in self._event_callbacks if cb is not callback]

    async def emit(self, event: str, payload: Dict[str, Any]) -> None:
        """Broadcast an event to all subscribers (fire-and-forget)."""
        payload.setdefault("agent_id", self.identity.id)
        payload.setdefault("timestamp", datetime.now(timezone.utc).isoformat())
        for callback in self._event_callbacks:
            try:
                await callback(event, payload)
            except Exception as exc:
                logger.warning("Event callback failed for %s: %s", event, exc)

    # ------------------------------------------------------------------
    # Memory
    # ------------------------------------------------------------------

    def remember(self, entry: Dict[str, Any]) -> None:
        """Append to rolling agent memory, trimming oldest entries."""
        entry["timestamp"] = datetime.now(timezone.utc).isoformat()
        self.memory.append(entry)
        if len(self.memory) > self.memory_limit:
            self.memory = self.memory[-self.memory_limit :]

    def get_memory_context(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Return the most recent memory entries for LLM context injection."""
        return self.memory[-limit:]

    # ------------------------------------------------------------------
    # State transitions
    # ------------------------------------------------------------------

    async def set_state(self, new_state: AgentState) -> None:
        """Transition to a new state and emit the status event."""
        old_state = self.state
        self.state = new_state
        logger.debug(
            "Agent %s: %s → %s", self.identity.name, old_state.value, new_state.value
        )
        await self.emit(
            "agent:status",
            {"previous_state": old_state.value, "state": new_state.value},
        )

    # ------------------------------------------------------------------
    # Core decision loop
    # ------------------------------------------------------------------

    async def _decision_loop(self) -> None:
        """5-minute decision loop: fetch → analyze → decide → execute."""
        while self._running:
            try:
                await self.set_state(AgentState.ANALYZING)

                # Fetch
                market_data = await self.fetch_market_data()
                symbols = list(market_data.get("prices", {}).keys()) if isinstance(market_data, dict) else []
                self.remember({"type": "market_fetch", "symbols": symbols})

                # Analyze
                analysis = await self.analyze(market_data)
                self.remember({"type": "analysis", "summary": analysis.get("summary", "")})

                # Decide
                await self.set_state(AgentState.TRADING)
                decision = await self.decide(analysis)

                # Execute
                trade_record = await self.execute(decision)
                if trade_record:
                    self.remember({"type": "trade", **trade_record})
                    await self.emit("agent:trade", trade_record)

                self.last_decision_at = datetime.now(timezone.utc)
                await self.set_state(AgentState.WAITING)

            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.exception("Agent %s decision loop error: %s", self.identity.name, exc)
                await self.set_state(AgentState.ERROR)
                await asyncio.sleep(30)  # brief back-off before retry
                await self.set_state(AgentState.IDLE)

            await asyncio.sleep(self.loop_interval)

    async def _pnl_loop(self) -> None:
        """Hourly P&L update loop."""
        while self._running:
            try:
                pnl_data = await self.update_pnl()
                self.last_pnl_at = datetime.now(timezone.utc)
                await self.emit("agent:pnl", pnl_data)
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.exception("Agent %s P&L loop error: %s", self.identity.name, exc)

            await asyncio.sleep(self.pnl_interval)

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def start(self) -> None:
        """Start both the decision loop and P&L loop as background tasks."""
        if self._running:
            logger.warning("Agent %s already running.", self.identity.name)
            return

        self._running = True
        await self.set_state(AgentState.IDLE)
        self._loop_task = asyncio.create_task(
            self._decision_loop(), name=f"agent-loop-{self.identity.id}"
        )
        self._pnl_task = asyncio.create_task(
            self._pnl_loop(), name=f"agent-pnl-{self.identity.id}"
        )
        logger.info("Agent %s started.", self.identity.name)

    async def stop(self) -> None:
        """Gracefully stop the agent."""
        self._running = False
        for task in (self._loop_task, self._pnl_task):
            if task and not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
        await self.set_state(AgentState.SLEEPING)
        logger.info("Agent %s stopped.", self.identity.name)

    def to_dict(self) -> Dict[str, Any]:
        """Serialise agent runtime state for API responses."""
        return {
            "identity": self.identity.to_dict(),
            "state": self.state.value,
            "last_decision_at": (
                self.last_decision_at.isoformat() if self.last_decision_at else None
            ),
            "last_pnl_at": (
                self.last_pnl_at.isoformat() if self.last_pnl_at else None
            ),
            "memory_entries": len(self.memory),
        }
