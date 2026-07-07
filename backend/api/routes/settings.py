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
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db.models import User, UserSetting
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
    notification_email: bool | None = None
    risk_tolerance: str | None = None  # "low" | "medium" | "high"


# ---------------------------------------------------------------------------
# In-memory fallback store (used when DB is unavailable)
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


async def _get_user_by_email(db: AsyncSession, email: str) -> User | None:
    """Look up a user by email in the database."""
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def _get_user_settings(db: AsyncSession, user_id: int) -> UserSetting | None:
    """Look up user settings by user ID in the database."""
    result = await db.execute(
        select(UserSetting).where(UserSetting.user_id == user_id)
    )
    return result.scalar_one_or_none()


# ---------------------------------------------------------------------------
# Registration & Login
# ---------------------------------------------------------------------------

@router.post("/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(
    request: Request,
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
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

    # Check if email already exists in DB
    existing = await _get_user_by_email(db, email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    # Create user in database
    user = User(
        email=email,
        username=username,
        hashed_password=hash_password(password),
        is_active=True,
    )
    db.add(user)
    await db.flush()  # Get the user ID without committing yet

    # Create default settings for the user
    user_settings = UserSetting(user_id=user.id)
    db.add(user_settings)

    # Also keep in-memory store as fallback
    user_id_str = str(user.id)
    _USERS[user_id_str] = {
        "id": user_id_str,
        "email": email,
        "username": username,
        "hashed_password": user.hashed_password,
        "is_active": True,
    }
    _EMAIL_INDEX[email] = user_id_str

    return create_token_pair(user_id_str)


@router.post("/auth/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(
    request: Request,
    response: Response,
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Authenticate and receive access + refresh tokens."""
    email = validate_email(body.email)
    user = await _get_user_by_email(db, email)

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token_pair = create_token_pair(str(user.id))

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
    db: AsyncSession = Depends(get_db),
) -> Dict[str, str]:
    """
    Generate a new API key for programmatic access.

    The raw key is returned ONCE and cannot be recovered.
    Store it securely — the platform only stores the hash.
    """
    raw_key, key_hash = generate_api_key()
    enc_svc = get_encryption_service()

    # Store encrypted hash in database user record
    try:
        user_id_int = int(user_id)
        user = await db.get(User, user_id_int)
        if user:
            user.api_key_hash = enc_svc.encrypt_api_key(key_hash, user_id)
    except (ValueError, Exception):
        # Fallback: store in memory
        if user_id in _USERS:
            _USERS[user_id]["api_key_hash"] = enc_svc.encrypt_api_key(key_hash, user_id)

    return {
        "api_key": raw_key,
        "note": "This key is shown once. Store it securely.",
    }


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------

def _default_settings() -> Dict[str, Any]:
    return {
        "theme": "dark",
        "notification_email": True,
        "risk_tolerance": "medium",
    }


@router.get("/settings", response_model=Dict[str, Any])
@limiter.limit("100/minute")
async def get_settings(
    request: Request,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Return the current user's settings (DB-backed with in-memory fallback)."""
    # Try database first
    try:
        user_id_int = int(user_id)
        settings = await _get_user_settings(db, user_id_int)
        if settings:
            return {
                "theme": settings.theme,
                "notification_email": settings.notification_email,
                "risk_tolerance": settings.risk_tolerance,
            }
    except (ValueError, Exception):
        pass

    # Fallback to in-memory store
    return _USER_SETTINGS.get(user_id, _default_settings())


@router.post("/settings", response_model=Dict[str, Any])
@limiter.limit("30/minute")
async def update_settings(
    request: Request,
    body: SettingsUpdate,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Update user settings (persisted to database)."""
    # Try database first
    try:
        user_id_int = int(user_id)
        settings = await _get_user_settings(db, user_id_int)
        if settings is None:
            settings = UserSetting(user_id=user_id_int)
            db.add(settings)

        if body.theme is not None:
            settings.theme = sanitize_string(body.theme, max_length=20)
        if body.notification_email is not None:
            settings.notification_email = body.notification_email
        if body.risk_tolerance is not None:
            valid_risk = {"low", "medium", "high"}
            rt = body.risk_tolerance.lower()
            if rt in valid_risk:
                settings.risk_tolerance = rt

        # Build response
        return {
            "theme": settings.theme,
            "notification_email": settings.notification_email,
            "risk_tolerance": settings.risk_tolerance,
        }
    except (ValueError, Exception):
        pass

    # Fallback to in-memory store
    current = _USER_SETTINGS.get(user_id, _default_settings())

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
