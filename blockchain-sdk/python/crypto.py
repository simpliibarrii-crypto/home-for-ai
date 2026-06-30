"""
homeforai-blockchain — AES-256-GCM encrypt/decrypt (Python)

Mirrors the TypeScript crypto.ts implementation.
Uses Python's cryptography library for AES-256-GCM.
"""

import base64
import hashlib
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


_IV_LENGTH = 12   # 96-bit IV for GCM
_TAG_LENGTH = 16  # 128-bit auth tag


def _build_key(key_hex: str) -> bytes:
    """Pads/trims key_hex to 32 bytes."""
    padded = key_hex.ljust(64, "0")[:64]
    return bytes.fromhex(padded)


def encrypt(plaintext: str, key_hex: str) -> str:
    """
    Encrypts a plaintext string using AES-256-GCM.
    Returns a base64-encoded string: iv(12) + tag(16) + ciphertext.
    Mirrors TypeScript encrypt() exactly.
    """
    key = _build_key(key_hex)
    iv = os.urandom(_IV_LENGTH)
    aesgcm = AESGCM(key)
    # cryptography library appends the 16-byte tag to the ciphertext
    ciphertext_with_tag = aesgcm.encrypt(iv, plaintext.encode("utf-8"), None)
    ciphertext = ciphertext_with_tag[:-_TAG_LENGTH]
    tag = ciphertext_with_tag[-_TAG_LENGTH:]
    return base64.b64encode(iv + tag + ciphertext).decode("utf-8")


def decrypt(ciphertext_b64: str, key_hex: str) -> str:
    """
    Decrypts a base64-encoded AES-256-GCM ciphertext.
    Mirrors TypeScript decrypt() exactly.
    """
    key = _build_key(key_hex)
    buf = base64.b64decode(ciphertext_b64)
    iv = buf[:_IV_LENGTH]
    tag = buf[_IV_LENGTH: _IV_LENGTH + _TAG_LENGTH]
    ciphertext = buf[_IV_LENGTH + _TAG_LENGTH:]
    aesgcm = AESGCM(key)
    # Re-combine ciphertext + tag for the cryptography library
    plaintext = aesgcm.decrypt(iv, ciphertext + tag, None)
    return plaintext.decode("utf-8")


def derive_key(password: str) -> str:
    """
    Derives a 32-byte hex key from a password using SHA-256.
    In production, use PBKDF2 or Argon2.
    """
    return hashlib.sha256(password.encode("utf-8")).hexdigest()
