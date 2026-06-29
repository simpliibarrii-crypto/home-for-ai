"""
Home for AI — Rate Limiter

Uses slowapi (Starlette/FastAPI wrapper around limits) to enforce:
- 100 requests/minute per IP (or user ID) on REST endpoints
- No limit on WebSocket connections (managed by websocket_manager)

Usage in route:
    @router.get("/agents")
    @limiter.limit("100/minute")
    async def get_agents(request: Request):
        ...
"""

from __future__ import annotations

import os

from slowapi import Limiter
from slowapi.util import get_remote_address

RATE_LIMIT = os.getenv("RATE_LIMIT_PER_MINUTE", "100")


def _get_key(request) -> str:  # type: ignore[no-untyped-def]
    """
    Key function for rate limiting.

    Prefers the authenticated user ID (from JWT sub) over IP address so that
    users behind a shared NAT/proxy are rate-limited individually.
    """
    # Try to extract user ID from JWT (set by auth middleware)
    user_id = getattr(request.state, "user_id", None)
    if user_id:
        return f"user:{user_id}"
    # Fall back to IP
    return get_remote_address(request)


limiter = Limiter(key_func=_get_key, default_limits=[f"{RATE_LIMIT}/minute"])
