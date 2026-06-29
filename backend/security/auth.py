"""
Home for AI — JWT Authentication

- Access tokens:  24-hour expiry, signed HS256
- Refresh tokens: 7-day expiry, signed HS256
- API keys:       32-byte random hex, stored as SHA-256 hash
- Passwords:      bcrypt with work factor 12

Session cookie name: __Host-session (Secure; SameSite=Strict; HttpOnly)
"""

from __future__ import annotations

import hashlib
import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import ExpiredSignatureError, JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

logger = logging.getLogger(__name__)

SECRET_KEY = os.getenv("SECRET_KEY", secrets.token_hex(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 24 * 60   # 24 hours
REFRESH_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)
bearer_scheme = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# Token models
# ---------------------------------------------------------------------------

class TokenPayload(BaseModel):
    sub: str            # user ID (string)
    exp: int            # Unix timestamp
    type: str           # "access" | "refresh"
    jti: Optional[str] = None  # JWT ID (for revocation)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = ACCESS_TOKEN_EXPIRE_MINUTES * 60


# ---------------------------------------------------------------------------
# Token creation
# ---------------------------------------------------------------------------

def _create_token(
    subject: str,
    token_type: str,
    expires_delta: timedelta,
    extra_claims: Optional[Dict[str, Any]] = None,
) -> str:
    now = datetime.now(timezone.utc)
    payload: Dict[str, Any] = {
        "sub": str(subject),
        "type": token_type,
        "iat": now,
        "exp": now + expires_delta,
        "jti": secrets.token_hex(8),
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_access_token(
    user_id: int | str,
    extra_claims: Optional[Dict[str, Any]] = None,
) -> str:
    """Create a 24-hour access token."""
    return _create_token(
        subject=str(user_id),
        token_type="access",
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        extra_claims=extra_claims,
    )


def create_refresh_token(user_id: int | str) -> str:
    """Create a 7-day refresh token."""
    return _create_token(
        subject=str(user_id),
        token_type="refresh",
        expires_delta=timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )


def create_token_pair(user_id: int | str) -> TokenResponse:
    """Create an access + refresh token pair."""
    return TokenResponse(
        access_token=create_access_token(user_id),
        refresh_token=create_refresh_token(user_id),
    )


# ---------------------------------------------------------------------------
# Token verification
# ---------------------------------------------------------------------------

def verify_token(token: str, expected_type: str = "access") -> TokenPayload:
    """
    Decode and validate a JWT token.

    Raises HTTPException 401 on invalid/expired tokens.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        token_type = payload.get("type", "access")
        if token_type != expected_type:
            raise credentials_exception
        return TokenPayload(**payload)
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError:
        raise credentials_exception


# ---------------------------------------------------------------------------
# FastAPI dependency: current user
# ---------------------------------------------------------------------------

async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> str:
    """
    FastAPI dependency that returns the current user ID from:
    1. Authorization: Bearer <token> header
    2. __Host-session cookie
    3. X-API-Key header (for programmatic access)

    Returns the user's subject (user ID as string).
    """
    # 1. Bearer token
    if credentials and credentials.credentials:
        payload = verify_token(credentials.credentials, expected_type="access")
        return payload.sub

    # 2. Session cookie
    session_cookie = request.cookies.get("__Host-session")
    if session_cookie:
        payload = verify_token(session_cookie, expected_type="access")
        return payload.sub

    # 3. API key
    api_key = request.headers.get("X-API-Key")
    if api_key:
        return await _verify_api_key(api_key)

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_optional_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Optional[str]:
    """Like get_current_user but returns None instead of raising on missing auth."""
    try:
        return await get_current_user(request, credentials)
    except HTTPException:
        return None


# ---------------------------------------------------------------------------
# Password utilities
# ---------------------------------------------------------------------------

def hash_password(plain_password: str) -> str:
    """Hash a password with bcrypt (rounds=12)."""
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


# ---------------------------------------------------------------------------
# API key management
# ---------------------------------------------------------------------------

def generate_api_key() -> tuple[str, str]:
    """
    Generate a new API key.

    Returns
    -------
    (raw_key, hashed_key) — store only hashed_key in DB, return raw_key to user.
    The raw key is shown ONCE and cannot be recovered.
    """
    raw = f"hfai_{secrets.token_hex(24)}"
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    return raw, hashed


def hash_api_key(raw_key: str) -> str:
    """Hash an API key for storage."""
    return hashlib.sha256(raw_key.encode()).hexdigest()


async def _verify_api_key(raw_key: str) -> str:
    """
    Verify an API key against stored hashes.

    Returns the user ID if valid.
    In production this queries the database; simplified here for clarity.
    """
    # NOTE: In production, query the DB here:
    # user = await db.query(User).filter(User.api_key_hash == hash_api_key(raw_key)).first()
    # if not user: raise 401
    # return str(user.id)

    # Development: accept any prefixed key (NEVER use in production)
    if not raw_key.startswith("hfai_"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )
    # Return a synthetic user ID for dev
    return "api_user"
