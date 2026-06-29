"""
Home for AI — Settings API Routes

GET  /settings         → Get user settings
POST /settings         → Update user settings
POST /auth/register    → Register a new user
POST /auth/login       → Login and receive tokens
POST /auth/refresh     → Refresh access token
POST /auth/api-key     → Generate a new API key
"""

from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr

from security.auth import (
    TokenResponse,
    create_token_pair,
    generate_api_key,
    hash_password,
    verify_password,
)
from security.auth import get_current_user
from security.encryption import get_encryption_service
from security.input_validator import sanitize_string, validate_email
from security.rate_limiter import limiter

router = APIRouter(tags=["settings & auth"])


# ---------------------------------------------------------------------------
# Auth schemas
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    email: str
    username: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class SettingsUpdate(BaseModel):
    theme: str | None = None
    notification_email: str | None = None
    risk_tolerance: str | None = None  # "low" | "medium" | "high"


# ---------------------------------------------------------------------------
# In-memory user store (replace with DB in production)
# ---------------------------------------------------------------------------

# user_id → user record
_USERS: Dict[str, Dict[str, Any]] = {}
_EMAIL_INDEX: Dict[str, str] = {}  # email → user_id
_USER_SETTINGS: Dict[str, Dict[str, Any]] = {}
_USER_COUNTER = 0


def _next_user_id() -> str:
    global _USER_COUNTER
    _USER_COUNTER += 1
    return str(_USER_COUNTER)


# ---------------------------------------------------------------------------
# Registration & Login
# ---------------------------------------------------------------------------

@router.post("/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(
    request: Request,
    body: RegisterRequest,
) -> TokenResponse:
    """Register a new user account."""
    email = validate_email(body.email)
    username = sanitize_string(body.username, max_length=50)
    password = body.password

    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters.",
        )

    if email in _EMAIL_INDEX:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user_id = _next_user_id()
    _USERS[user_id] = {
        "id": user_id,
        "email": email,
        "username": username,
        "hashed_password": hash_password(password),
        "is_active": True,
    }
    _EMAIL_INDEX[email] = user_id

    return create_token_pair(user_id)


@router.post("/auth/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(
    request: Request,
    response: Response,
    body: LoginRequest,
) -> TokenResponse:
    """Authenticate and receive access + refresh tokens."""
    email = validate_email(body.email)
    user_id = _EMAIL_INDEX.get(email)
    user = _USERS.get(user_id) if user_id else None

    if not user or not verify_password(body.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token_pair = create_token_pair(user_id)

    # Set __Host-session cookie (Secure; HttpOnly; SameSite=Strict)
    response.set_cookie(
        key="__Host-session",
        value=token_pair.access_token,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=token_pair.expires_in,
        path="/",
    )

    return token_pair


@router.post("/auth/refresh", response_model=TokenResponse)
@limiter.limit("10/minute")
async def refresh_token(
    request: Request,
    body: RefreshRequest,
) -> TokenResponse:
    """Use a refresh token to get a new access token."""
    from security.auth import verify_token
    payload = verify_token(body.refresh_token, expected_type="refresh")
    return create_token_pair(payload.sub)


@router.post("/auth/api-key", response_model=Dict[str, str])
@limiter.limit("5/minute")
async def create_api_key(
    request: Request,
    user_id: str = Depends(get_current_user),
) -> Dict[str, str]:
    """
    Generate a new API key for programmatic access.

    The raw key is returned ONCE and cannot be recovered.
    Store it securely — the platform only stores the hash.
    """
    raw_key, key_hash = generate_api_key()
    enc_svc = get_encryption_service()

    # Store encrypted hash in user record
    if user_id in _USERS:
        _USERS[user_id]["api_key_hash"] = enc_svc.encrypt_api_key(key_hash, user_id)

    return {
        "api_key": raw_key,
        "note": "This key is shown once. Store it securely.",
    }


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------

@router.get("/settings", response_model=Dict[str, Any])
@limiter.limit("100/minute")
async def get_settings(
    request: Request,
    user_id: str = Depends(get_current_user),
) -> Dict[str, Any]:
    """Return the current user's settings."""
    return _USER_SETTINGS.get(user_id, {
        "theme": "dark",
        "notification_email": True,
        "risk_tolerance": "medium",
    })


@router.post("/settings", response_model=Dict[str, Any])
@limiter.limit("30/minute")
async def update_settings(
    request: Request,
    body: SettingsUpdate,
    user_id: str = Depends(get_current_user),
) -> Dict[str, Any]:
    """Update user settings."""
    current = _USER_SETTINGS.get(user_id, {})

    if body.theme is not None:
        current["theme"] = sanitize_string(body.theme, max_length=20)
    if body.notification_email is not None:
        current["notification_email"] = body.notification_email
    if body.risk_tolerance is not None:
        valid_risk = {"low", "medium", "high"}
        rt = body.risk_tolerance.lower()
        if rt in valid_risk:
            current["risk_tolerance"] = rt

    _USER_SETTINGS[user_id] = current
    return current
