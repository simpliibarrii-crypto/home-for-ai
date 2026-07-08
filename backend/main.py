"""
Home for AI — FastAPI Application Entry Point

Startup sequence:
1. Load environment variables
2. Initialise database tables
3. Start all 8 agent background loops
4. Wire agent event callbacks to WebSocket manager
5. Mount all API routers
6. Configure CORS, rate limiting, and JWT middleware

WebSocket entry point:
    ws://{host}/ws/{client_id}

REST API base:
    http://{host}/api/v1/...

Health check:
    GET /health

OpenAPI docs:
    GET /docs     (disabled in production)
    GET /redoc
"""

from __future__ import annotations

import asyncio
import logging
import os
import secrets
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator, Dict

import uvicorn
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from agents.agent_registry import get_all_agents, start_all_agents, stop_all_agents
from api.routes import agents, chat, copy_trade, market, portfolio, raven, settings
from api.websocket_manager import get_websocket_manager
from db.database import init_db
from security.rate_limiter import limiter

# ---------------------------------------------------------------------------
# Logging configuration
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper(), logging.INFO),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Application lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application startup and shutdown lifecycle handler.

    On startup:  init DB, register event callbacks, start agent loops.
    On shutdown: gracefully stop all agent loops.
    """
    logger.info("🏠 Home for AI backend starting up...")

    # 1. Initialise database
    await init_db()

    # 2. Wire agent events → WebSocket broadcasts
    ws_manager = get_websocket_manager()

    for agent in get_all_agents():
        # Register the relay callback for all events from this agent
        async def make_callback(a_id: str):  # closure to capture agent_id
            async def relay(event: str, payload: Dict[str, Any]) -> None:
                await ws_manager.relay_agent_event(event, payload)
            return relay

        callback = await make_callback(agent.identity.id)
        agent.subscribe(callback)

    # 3. Start all 8 agent loops
    await start_all_agents()
    logger.info("✅ All agents started. Backend ready.")

    yield  # Application runs here

    # Shutdown
    logger.info("🛑 Shutting down Home for AI backend...")
    await stop_all_agents()
    logger.info("All agents stopped. Goodbye.")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

IS_PRODUCTION = os.getenv("ENVIRONMENT", "development") == "production"

app = FastAPI(
    title="Home for AI",
    description=(
        "Local-first AI command center for agent workflows, run records, "
        "Raven Evidence Graph traces, and token-efficient reasoning."
    ),
    version="1.0.0",
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json" if not IS_PRODUCTION else None,
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# Rate limiter
# ---------------------------------------------------------------------------

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

allowed_origins_raw = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000,https://home-for-ai.pplx.app",
)
allowed_origins = [o.strip() for o in allowed_origins_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-API-Key"],
)

# ---------------------------------------------------------------------------
# JWT middleware (inject user_id into request.state for rate-limiter key)
# ---------------------------------------------------------------------------

@app.middleware("http")
async def inject_user_id(request: Request, call_next):  # type: ignore[no-untyped-def]
    """Decode JWT from Authorization header and inject user_id into request state."""
    try:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            from security.auth import verify_token
            payload = verify_token(auth[7:], expected_type="access")
            request.state.user_id = payload.sub
        else:
            request.state.user_id = None
    except Exception:
        request.state.user_id = None
    return await call_next(request)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

API_PREFIX = "/api/v1"

app.include_router(agents.router, prefix=API_PREFIX)
app.include_router(chat.router, prefix=API_PREFIX)
app.include_router(portfolio.router, prefix=API_PREFIX)
app.include_router(market.router, prefix=API_PREFIX)
app.include_router(copy_trade.router, prefix=API_PREFIX)
app.include_router(settings.router, prefix=API_PREFIX)
app.include_router(raven.router, prefix=API_PREFIX)

# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health", tags=["health"])
async def health_check() -> Dict[str, Any]:
    """
    Health check endpoint.

    Returns:
        - status: "ok" if all agents are running
        - agent_states: dict of agent_id → state
        - ws_connections: number of active WebSocket connections
    """
    ws_manager = get_websocket_manager()
    agent_states = {
        a.identity.id: a.state.value for a in get_all_agents()
    }
    running_count = sum(1 for s in agent_states.values() if s != "SLEEPING")

    return {
        "status": "ok" if running_count > 0 else "degraded",
        "agents_running": running_count,
        "agent_states": agent_states,
        "ws_connections": ws_manager.active_connections,
        "environment": os.getenv("ENVIRONMENT", "development"),
    }


# ---------------------------------------------------------------------------
# WebSocket entry point
# ---------------------------------------------------------------------------

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    client_id: str,
) -> None:
    """
    Main WebSocket endpoint.

    After connecting, the client should send a subscribe message:
        {"action": "subscribe", "agents": ["luna", "shadow"], "symbols": ["BTC-USD"]}

    The server then pushes all relevant events in real time.
    """
    ws_manager = get_websocket_manager()

    # Validate client_id (simple slug check)
    if not client_id or len(client_id) > 64:
        await websocket.close(code=4003, reason="Invalid client_id")
        return

    # Extract user from query param or header
    user_id: str | None = websocket.query_params.get("user_id")

    info = await ws_manager.connect(websocket, client_id, user_id=user_id)

    try:
        # Send welcome message
        await info.send("welcome", {
            "client_id": client_id,
            "message": "Connected to Home for AI — subscribe to agents or symbols to start.",
        })

        while True:
            raw = await websocket.receive_text()
            await ws_manager.handle_client_message(client_id, raw)

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected: %s", client_id)
    except Exception as exc:
        logger.exception("WebSocket error for %s: %s", client_id, exc)
    finally:
        ws_manager.disconnect(client_id)


# ---------------------------------------------------------------------------
# Global exception handler
# ---------------------------------------------------------------------------

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception on %s: %s", request.url.path, exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# ---------------------------------------------------------------------------
# Dev server entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("ENVIRONMENT", "development") == "development",
        log_level=os.getenv("LOG_LEVEL", "info").lower(),
        ws_ping_interval=30,
        ws_ping_timeout=10,
    )
