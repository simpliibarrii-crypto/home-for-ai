"""
Home for AI — AES-256-GCM Encryption Service

Encrypts sensitive data at rest:
- User API keys stored in DB
- Portfolio snapshots (if configured)
- Trade history exports

Key derivation: PBKDF2-HMAC-SHA256, 600,000 iterations (NIST 2023 recommendation)
Cipher: AES-256-GCM (authenticated encryption — detects tampering)
IV: 96-bit random nonce per encryption (GCM best practice)
Tag: 128-bit authentication tag appended to ciphertext

Encrypted payload format (base64url-encoded):
    <iv_12_bytes><tag_16_bytes><ciphertext>

Never logs sensitive data.
"""

from __future__ import annotations

import base64
import hashlib
import logging
import os
import secrets
from typing import Optional

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

logger = logging.getLogger(__name__)

PBKDF2_ITERATIONS = 600_000
KEY_LENGTH_BYTES = 32          # AES-256
SALT_LENGTH_BYTES = 32
NONCE_LENGTH_BYTES = 12        # GCM standard nonce size


class EncryptionError(Exception):
    """Raised when encryption or decryption fails."""


class EncryptionService:
    """
    AES-256-GCM encryption service with PBKDF2 key derivation.

    Usage:
        svc = EncryptionService()
        encrypted = svc.encrypt("my_secret_api_key")
        decrypted = svc.decrypt(encrypted)

    The master key is read from the ENCRYPTION_KEY environment variable.
    If not set, a random key is generated per process (development only).
    """

    def __init__(self, master_key: Optional[str] = None) -> None:
        raw_key = master_key or os.getenv("ENCRYPTION_KEY")
        if not raw_key:
            logger.warning(
                "ENCRYPTION_KEY not set — generating ephemeral key. "
                "Encrypted data will not survive process restarts!"
            )
            raw_key = secrets.token_hex(32)
        self._master_key_bytes: bytes = raw_key.encode("utf-8")

    # ------------------------------------------------------------------
    # Key derivation
    # ------------------------------------------------------------------

    def _derive_key(self, salt: bytes) -> bytes:
        """
        Derive a 256-bit AES key from the master key + salt via PBKDF2-SHA256.
        600,000 iterations per NIST SP 800-132 (2023).
        """
        return hashlib.pbkdf2_hmac(
            "sha256",
            password=self._master_key_bytes,
            salt=salt,
            iterations=PBKDF2_ITERATIONS,
            dklen=KEY_LENGTH_BYTES,
        )

    # ------------------------------------------------------------------
    # Encrypt / Decrypt
    # ------------------------------------------------------------------

    def encrypt(self, plaintext: str, associated_data: Optional[bytes] = None) -> str:
        """
        Encrypt a string with AES-256-GCM.

        Parameters
        ----------
        plaintext:        The sensitive string to encrypt.
        associated_data:  Optional AAD (e.g. user ID) bound to the ciphertext
                          for context-binding (prevents copy attacks).

        Returns
        -------
        A URL-safe base64-encoded string:
            base64url(<salt_32><nonce_12><tag_16><ciphertext>)
        """
        try:
            salt = os.urandom(SALT_LENGTH_BYTES)
            nonce = os.urandom(NONCE_LENGTH_BYTES)
            key = self._derive_key(salt)

            aesgcm = AESGCM(key)
            # AESGCM.encrypt returns ciphertext + 16-byte GCM tag appended
            ciphertext_with_tag = aesgcm.encrypt(
                nonce, plaintext.encode("utf-8"), associated_data
            )

            # Layout: salt (32) | nonce (12) | ciphertext+tag
            payload = salt + nonce + ciphertext_with_tag
            return base64.urlsafe_b64encode(payload).decode("ascii")
        except Exception as exc:
            raise EncryptionError(f"Encryption failed: {exc}") from exc

    def decrypt(
        self,
        encrypted_b64: str,
        associated_data: Optional[bytes] = None,
    ) -> str:
        """
        Decrypt an AES-256-GCM encrypted string.

        Raises EncryptionError if decryption fails (wrong key, tampered data).
        Never logs the plaintext.
        """
        try:
            payload = base64.urlsafe_b64decode(encrypted_b64.encode("ascii"))

            salt = payload[:SALT_LENGTH_BYTES]
            nonce = payload[SALT_LENGTH_BYTES: SALT_LENGTH_BYTES + NONCE_LENGTH_BYTES]
            ciphertext_with_tag = payload[SALT_LENGTH_BYTES + NONCE_LENGTH_BYTES:]

            key = self._derive_key(salt)
            aesgcm = AESGCM(key)
            plaintext_bytes = aesgcm.decrypt(nonce, ciphertext_with_tag, associated_data)
            return plaintext_bytes.decode("utf-8")
        except Exception as exc:
            raise EncryptionError("Decryption failed — invalid key or tampered data") from exc

    # ------------------------------------------------------------------
    # Convenience: encrypt/decrypt API keys bound to user ID
    # ------------------------------------------------------------------

    def encrypt_api_key(self, api_key: str, user_id: str) -> str:
        """Encrypt an API key bound to a specific user ID."""
        return self.encrypt(api_key, associated_data=user_id.encode())

    def decrypt_api_key(self, encrypted_key: str, user_id: str) -> str:
        """Decrypt an API key bound to a specific user ID."""
        return self.decrypt(encrypted_key, associated_data=user_id.encode())

    # ------------------------------------------------------------------
    # Hashing (for non-reversible storage like API key lookup)
    # ------------------------------------------------------------------

    @staticmethod
    def sha256_hex(value: str) -> str:
        """
        One-way SHA-256 hash of a string (hex digest).
        Used for storing API key fingerprints for fast lookup.
        """
        return hashlib.sha256(value.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# Module-level singleton (lazy-initialised)
# ---------------------------------------------------------------------------

_default_service: Optional[EncryptionService] = None


def get_encryption_service() -> EncryptionService:
    """Return the module-level EncryptionService singleton."""
    global _default_service
    if _default_service is None:
        _default_service = EncryptionService()
    return _default_service
