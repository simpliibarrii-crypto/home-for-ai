"""
Home for AI — Input Validator

Sanitises and validates all user-supplied strings before they reach
the database or LLM prompts.

Protections:
- HTML/script tag stripping (XSS prevention)
- SQL injection detection (belt-and-suspenders; ORM parameterised queries are primary)
- Shell injection character stripping
- Prompt injection detection for LLM inputs
- Symbol whitelist validation for trade endpoints
"""

from __future__ import annotations

import re
import unicodedata
from typing import Optional

from fastapi import HTTPException, status

# ---------------------------------------------------------------------------
# Regex patterns
# ---------------------------------------------------------------------------

# HTML tags (including script, iframe, etc.)
_HTML_TAG_RE = re.compile(r"<[^>]+>", re.IGNORECASE)

# Typical SQL injection patterns
_SQL_INJECTION_RE = re.compile(
    r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|--|;|'\")\b)",
    re.IGNORECASE,
)

# Shell meta-characters
_SHELL_META_RE = re.compile(r"[;&|`$(){}]")

# Prompt injection signals (LLM-facing inputs)
_PROMPT_INJECTION_RE = re.compile(
    r"(ignore (previous|all) instructions?|system prompt|jailbreak|"
    r"forget (you are|your instructions)|pretend you (are|have)|"
    r"act as (if|a|an) (different|real|human|unrestricted))",
    re.IGNORECASE,
)

# Valid trading symbol: letters, numbers, hyphen, dot, equals (for yfinance suffixes like =X)
_SYMBOL_RE = re.compile(r"^[A-Z0-9\-\.=\^]{1,20}$")

# Valid ticker for display (relaxed)
_DISPLAY_SYMBOL_RE = re.compile(r"^[A-Za-z0-9\-\.=\^\/]{1,30}$")


# ---------------------------------------------------------------------------
# String sanitisation
# ---------------------------------------------------------------------------

def sanitize_string(
    value: str,
    max_length: int = 1000,
    strip_html: bool = True,
    allow_shell_meta: bool = False,
) -> str:
    """
    Sanitise a user-supplied string.

    Steps:
    1. Unicode normalisation (NFKC) — prevent homograph attacks
    2. Strip leading/trailing whitespace
    3. Truncate to max_length
    4. Remove HTML/script tags
    5. Strip shell metacharacters (unless allow_shell_meta=True)
    6. Replace null bytes

    Raises HTTPException 400 if SQL injection patterns are detected.
    """
    if not isinstance(value, str):
        value = str(value)

    # Unicode normalisation
    value = unicodedata.normalize("NFKC", value)
    value = value.strip()
    value = value[:max_length]

    # HTML tags
    if strip_html:
        value = _HTML_TAG_RE.sub("", value)

    # Null bytes
    value = value.replace("\x00", "")

    # Shell metacharacters
    if not allow_shell_meta:
        value = _SHELL_META_RE.sub("", value)

    # SQL injection — raise rather than silently strip
    if _SQL_INJECTION_RE.search(value):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid input: potential SQL injection detected.",
        )

    return value


def sanitize_chat_message(message: str) -> str:
    """
    Sanitise a chat message before injecting into LLM prompt.

    Additionally checks for prompt injection attempts.
    """
    sanitized = sanitize_string(message, max_length=2000, strip_html=True)

    if _PROMPT_INJECTION_RE.search(sanitized):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid message: potential prompt injection detected.",
        )

    return sanitized


# ---------------------------------------------------------------------------
# Symbol validation
# ---------------------------------------------------------------------------

def validate_symbol(symbol: str) -> str:
    """
    Validate and normalise a trading symbol.

    Accepts: AAPL, BTC-USD, EURUSD=X, ^TNX, GC=F
    Rejects: anything with spaces, special characters, or >20 chars.

    Raises HTTPException 400 on invalid symbols.
    """
    symbol = symbol.upper().strip()
    if not _SYMBOL_RE.match(symbol):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid symbol format: {symbol!r}. "
                   "Must be 1-20 chars of A-Z, 0-9, -, ., =, ^",
        )
    return symbol


def validate_agent_id(agent_id: str) -> str:
    """Validate that agent_id is a known lowercase slug."""
    valid_ids = {"luna", "shadow", "pixel", "nova", "blaze", "echo", "cipher", "mochi"}
    cleaned = agent_id.lower().strip()
    if cleaned not in valid_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent {agent_id!r} not found.",
        )
    return cleaned


def validate_copy_ratio(ratio: float) -> float:
    """Ensure copy ratio is between 0.05 and 1.0."""
    if not (0.05 <= ratio <= 1.0):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="copy_ratio must be between 0.05 and 1.0.",
        )
    return ratio


# ---------------------------------------------------------------------------
# Email validation (basic)
# ---------------------------------------------------------------------------

_EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$")


def validate_email(email: str) -> str:
    """Validate email format and return normalised lowercase version."""
    email = sanitize_string(email, max_length=255).lower()
    if not _EMAIL_RE.match(email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email address format.",
        )
    return email
