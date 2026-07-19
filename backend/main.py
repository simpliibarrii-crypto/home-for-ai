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

import logging
import os
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator, Dict

import uvicorn
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from agents.agent_registry import get_all_agents, start_all_agents, stop_all_agents
from api.routes import agents, auth, chat, copy_trade, market, portfolio, raven, settings
from api.websocket_manager import get_websocket_manager
from db.database import init_db
from security.rate_limiter import limiter

logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper(), logging.INFO),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Initialize durable state and agent loops, then shut them down cleanly."""

    logger.info("Home for AI backend starting up")
    await init_db()

    ws_manager = get_websocket_manager()
    for agent in get_all_agents():
        async def make_callback(agent_id: str):
            async def relay(event: str, payload: Dict[str, Any]) -> None:
                await ws_manager.relay_agent_event(event, payload)
            return relay

        callback = await make_callback(agent.identity.id)
        agent.subscribe(callback)

    await start_all_agents()
    logger.info("All agents started. Backend ready.")

    yield

    logger.info("Shutting down Home for AI backend")
    await stop_all_agents()
    logger.info("All agents stopped")


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

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

allowed_origins_raw = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000,https://home-for-ai.pplx.app",
)
allowed_origins = [origin.strip() for origin in allowed_origins_raw.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-API-Key"],
)


@app.middleware("http")
async def inject_user_id(request: Request, call_next):  # type: ignore[no-untyped-def]
    """Decode a bearer token, when present, for rate-limit identity."""

    try:
        authorization = request.headers.get("Authorization", "")
        if authorization.startswith("Bearer "):
            from security.auth import verify_token

            payload = verify_token(authorization[7:], expected_type="access")
            request.state.user_id = payload.sub
        else:
            request.state.user_id = None
    except Exception:
        request.state.user_id = None
    return await call_next(request)


API_PREFIX = "/api/v1"
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(agents.router, prefix=API_PREFIX)
app.include_router(chat.router, prefix=API_PREFIX)
app.include_router(portfolio.router, prefix=API_PREFIX)
app.include_router(market.router, prefix=API_PREFIX)
app.include_router(copy_trade.router, prefix=API_PREFIX)
app.include_router(settings.router, prefix=API_PREFIX)
app.include_router(raven.router, prefix=API_PREFIX)


@app.get("/health", tags=["health"])
async def health_check() -> Dict[str, Any]:
    """Return runtime, agent, websocket, and environment health."""

    ws_manager = get_websocket_manager()
    agent_states = {agent.identity.id: agent.state.value for agent in get_all_agents()}
    running_count = sum(1 for state in agent_states.values() if state != "SLEEPING")

    return {
        "status": "ok" if running_count > 0 else "degraded",
        "agents_running": running_count,
        "agent_states": agent_states,
        "ws_connections": ws_manager.active_connections,
        "environment": os.getenv("ENVIRONMENT", "development"),
    }


@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str) -> None:
    """Accept a bounded client identifier and relay subscribed agent events."""

    ws_manager = get_websocket_manager()
    if not client_id or len(client_id) > 64:
        await websocket.close(code=4003, reason="Invalid client_id")
        return

    user_id: str | None = websocket.query_params.get("user_id")
    info = await ws_manager.connect(websocket, client_id, user_id=user_id)

    try:
        await info.send(
            "welcome",
            {
                "client_id": client_id,
                "message": "Connected to Home for AI. Subscribe to agents or symbols to start.",
            },
        )
        while True:
            raw = await websocket.receive_text()
            await ws_manager.handle_client_message(client_id, raw)
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected: %s", client_id)
    except Exception as exc:
        logger.exception("WebSocket error for %s: %s", client_id, exc)
    finally:
        ws_manager.disconnect(client_id)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception on %s: %s", request.url.path, exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


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
