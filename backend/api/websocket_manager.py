"""
Home for AI — WebSocket Connection Manager

Manages all active WebSocket connections and routes events from
agent loops to the appropriate connected clients.

Event schema (JSON over WebSocket):
    {
        "event":   "agent:trade",
        "payload": { ... event-specific data ... },
        "ts":      "2026-06-29T16:00:00Z"
    }

Supported events (server → client):
    agent:status         Agent state changed (IDLE → TRADING)
    agent:trade          New trade executed
    agent:pnl            P&L update (hourly)
    agent:skill_learned  Agent learned a new skill
    market:tick          Price update for subscribed symbols
    chat:message         Agent chat response
    copy_trade:update    User's mirrored position updated
    copy_trade:paused    Copy trading paused (drawdown limit)
    error                Error notification

Client → Server messages:
    { "action": "subscribe", "symbols": ["AAPL", "BTC-USD"] }
    { "action": "unsubscribe", "symbols": ["AAPL"] }
    { "action": "ping" }
"""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set

from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


class ConnectionInfo:
    """Metadata and state for a single WebSocket connection."""

    def __init__(self, websocket: WebSocket, client_id: str, user_id: Optional[str] = None) -> None:
        self.websocket = websocket
        self.client_id = client_id
        self.user_id = user_id
        self.subscribed_symbols: Set[str] = set()
        self.subscribed_agents: Set[str] = set()
        self.connected_at = datetime.now(timezone.utc)

    async def send(self, event: str, payload: Dict[str, Any]) -> None:
        """Send a JSON event to this client."""
        message = {
            "event": event,
            "payload": payload,
            "ts": datetime.now(timezone.utc).isoformat(),
        }
        await self.websocket.send_text(json.dumps(message))


class WebSocketManager:
    """
    Central WebSocket connection manager.

    Thread-safe via asyncio. All writes are serialised through
    the event loop — no external locking needed.
    """

    def __init__(self) -> None:
        # client_id → ConnectionInfo
        self._connections: Dict[str, ConnectionInfo] = {}
        # agent_id → set of client_ids subscribed to that agent
        self._agent_subscribers: Dict[str, Set[str]] = {}
        # symbol → set of client_ids subscribed to price ticks
        self._symbol_subscribers: Dict[str, Set[str]] = {}

    # ------------------------------------------------------------------
    # Connection lifecycle
    # ------------------------------------------------------------------

    async def connect(
        self,
        websocket: WebSocket,
        client_id: str,
        user_id: Optional[str] = None,
    ) -> ConnectionInfo:
        """Accept a new WebSocket connection and register it."""
        await websocket.accept()
        info = ConnectionInfo(websocket, client_id, user_id)
        self._connections[client_id] = info
        logger.info("WebSocket connected: client=%s user=%s", client_id, user_id)
        return info

    def disconnect(self, client_id: str) -> None:
        """Remove a connection and clean up all subscriptions."""
        if client_id not in self._connections:
            return
        info = self._connections.pop(client_id)

        # Clean up agent subscriptions
        for agent_id in list(info.subscribed_agents):
            if agent_id in self._agent_subscribers:
                self._agent_subscribers[agent_id].discard(client_id)

        # Clean up symbol subscriptions
        for symbol in list(info.subscribed_symbols):
            if symbol in self._symbol_subscribers:
                self._symbol_subscribers[symbol].discard(client_id)

        logger.info("WebSocket disconnected: client=%s", client_id)

    @property
    def active_connections(self) -> int:
        return len(self._connections)

    # ------------------------------------------------------------------
    # Subscription management
    # ------------------------------------------------------------------

    def subscribe_to_agent(self, client_id: str, agent_id: str) -> None:
        """Subscribe a client to events from a specific agent."""
        if client_id not in self._connections:
            return
        self._connections[client_id].subscribed_agents.add(agent_id)
        self._agent_subscribers.setdefault(agent_id, set()).add(client_id)

    def subscribe_to_symbol(self, client_id: str, symbol: str) -> None:
        """Subscribe a client to price tick events for a symbol."""
        if client_id not in self._connections:
            return
        self._connections[client_id].subscribed_symbols.add(symbol)
        self._symbol_subscribers.setdefault(symbol, set()).add(client_id)

    def unsubscribe_from_symbol(self, client_id: str, symbol: str) -> None:
        if client_id in self._connections:
            self._connections[client_id].subscribed_symbols.discard(symbol)
        if symbol in self._symbol_subscribers:
            self._symbol_subscribers[symbol].discard(client_id)

    # ------------------------------------------------------------------
    # Broadcasting
    # ------------------------------------------------------------------

    async def _send_concurrent(
        self,
        targets: List[tuple[str, ConnectionInfo]],
        event: str,
        payload: Dict[str, Any],
        max_concurrent: int = 50,
    ) -> List[str]:
        """
        Send an event to multiple clients concurrently using asyncio.gather
        with a semaphore to limit concurrency.

        Returns a list of client_ids that failed (dead connections).
        """
        if not targets:
            return []

        sem = asyncio.Semaphore(max_concurrent)

        async def _send_one(client_id: str, info: ConnectionInfo) -> str | None:
            async with sem:
                try:
                    await info.send(event, payload)
                    return None
                except Exception:
                    return client_id

        results = await asyncio.gather(
            *[_send_one(cid, info) for cid, info in targets],
            return_exceptions=True,
        )
        return [cid for cid in results if cid is not None]

    async def broadcast_to_all(self, event: str, payload: Dict[str, Any]) -> None:
        """Broadcast an event to every connected client concurrently."""
        targets = [(cid, info) for cid, info in list(self._connections.items())]
        dead = await self._send_concurrent(targets, event, payload)
        for client_id in dead:
            self.disconnect(client_id)

    async def broadcast_to_agent_subscribers(
        self, agent_id: str, event: str, payload: Dict[str, Any]
    ) -> None:
        """Broadcast an agent event to all clients subscribed to that agent."""
        subscribers = self._agent_subscribers.get(agent_id, set()).copy()
        targets = [
            (cid, info)
            for cid in subscribers
            if (info := self._connections.get(cid))
        ]
        dead = await self._send_concurrent(targets, event, payload)
        for client_id in dead:
            self.disconnect(client_id)

    async def broadcast_tick(self, symbol: str, price_data: Dict[str, Any]) -> None:
        """Push a price tick to all clients subscribed to that symbol."""
        subscribers = self._symbol_subscribers.get(symbol, set()).copy()
        event_payload = {"symbol": symbol, **price_data}
        targets = [
            (cid, info)
            for cid in subscribers
            if (info := self._connections.get(cid))
        ]
        dead = await self._send_concurrent(targets, "market:tick", event_payload)
        for client_id in dead:
            self.disconnect(client_id)

    async def send_to_user(
        self, user_id: str, event: str, payload: Dict[str, Any]
    ) -> None:
        """Send an event to all connections belonging to a specific user."""
        targets = [
            (info.client_id, info)
            for info in list(self._connections.values())
            if info.user_id == user_id
        ]
        dead = await self._send_concurrent(targets, event, payload)
        for client_id in dead:
            self.disconnect(client_id)

    async def send_to_client(
        self, client_id: str, event: str, payload: Dict[str, Any]
    ) -> None:
        """Send an event to a specific client by ID."""
        info = self._connections.get(client_id)
        if info:
            try:
                await info.send(event, payload)
            except Exception:
                self.disconnect(client_id)

    # ------------------------------------------------------------------
    # Message handler (client → server)
    # ------------------------------------------------------------------

    async def handle_client_message(
        self, client_id: str, raw_message: str
    ) -> None:
        """
        Process an incoming message from a client.

        Supported actions:
            subscribe   — subscribe to agent or symbol events
            unsubscribe — unsubscribe from symbol ticks
            ping        — heartbeat (server replies pong)
        """
        try:
            msg = json.loads(raw_message)
        except json.JSONDecodeError:
            await self.send_to_client(
                client_id, "error", {"detail": "Invalid JSON"}
            )
            return

        action = msg.get("action", "")

        if action == "ping":
            await self.send_to_client(client_id, "pong", {"ts": datetime.now(timezone.utc).isoformat()})

        elif action == "subscribe":
            for agent_id in msg.get("agents", []):
                self.subscribe_to_agent(client_id, agent_id)
            for symbol in msg.get("symbols", []):
                self.subscribe_to_symbol(client_id, symbol)
            await self.send_to_client(
                client_id,
                "subscribed",
                {
                    "agents": list(self._connections[client_id].subscribed_agents)
                    if client_id in self._connections else [],
                    "symbols": list(self._connections[client_id].subscribed_symbols)
                    if client_id in self._connections else [],
                },
            )

        elif action == "unsubscribe":
            for symbol in msg.get("symbols", []):
                self.unsubscribe_from_symbol(client_id, symbol)

        else:
            await self.send_to_client(
                client_id, "error", {"detail": f"Unknown action: {action!r}"}
            )

    # ------------------------------------------------------------------
    # Agent event relay (called from agent event callbacks)
    # ------------------------------------------------------------------

    async def relay_agent_event(
        self, event: str, payload: Dict[str, Any]
    ) -> None:
        """
        Relay an agent event to:
        1. All clients subscribed to that agent specifically
        2. All clients (for global events like agent:trade, agent:pnl)

        This is registered as the agent event callback.
        Uses concurrent sends to avoid head-of-line blocking.
        """
        agent_id = payload.get("agent_id", "")

        # Agent-specific subscribers
        if agent_id:
            await self.broadcast_to_agent_subscribers(agent_id, event, payload)

        # Broadcast global agent events to all clients
        global_events = {"agent:trade", "agent:pnl", "agent:status", "agent:skill_learned"}
        if event in global_events:
            # Send to clients NOT already subscribed (avoid duplicate)
            already_sent = self._agent_subscribers.get(agent_id, set())
            targets = [
                (cid, info)
                for cid, info in list(self._connections.items())
                if cid not in already_sent
            ]
            dead = await self._send_concurrent(targets, event, payload)
            for client_id in dead:
                self.disconnect(client_id)


# ---------------------------------------------------------------------------
# Module-level singleton
# ---------------------------------------------------------------------------

_manager: Optional[WebSocketManager] = None


def get_websocket_manager() -> WebSocketManager:
    """Return the global WebSocket manager singleton."""
    global _manager
    if _manager is None:
        _manager = WebSocketManager()
    return _manager
