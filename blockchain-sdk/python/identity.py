"""
homeforai-blockchain — W3C DID:ethr (Python)

Mirrors the TypeScript identity.ts implementation.
Implements DID:ethr per W3C DID Core spec.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import base64
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Optional

from .crypto import decrypt


DID_METHOD = "ethr"


@dataclass
class VerificationMethod:
    id: str
    type: str
    controller: str
    blockchain_account_id: Optional[str] = None
    public_key_hex: Optional[str] = None


@dataclass
class ServiceEndpoint:
    id: str
    type: str
    service_endpoint: str


@dataclass
class DIDDocument:
    context: list[str]
    id: str
    verification_method: list[VerificationMethod]
    authentication: list[str]
    assertion_method: list[str]
    service: list[ServiceEndpoint]
    created: str
    updated: str

    def to_dict(self) -> dict:
        return {
            "@context": self.context,
            "id": self.id,
            "verificationMethod": [
                {k: v for k, v in asdict(vm).items() if v is not None}
                for vm in self.verification_method
            ],
            "authentication": self.authentication,
            "assertionMethod": self.assertion_method,
            "service": [asdict(s) for s in self.service],
            "created": self.created,
            "updated": self.updated,
        }


class DID:
    """
    W3C DID:ethr operations for the Home for AI ecosystem.

    Usage:
        did = DID.create("0x742d35Cc6634C0532925a3b844Bc454e4438f44e")
        print(did)  # did:ethr:0x742d35cc...

        doc = DID.resolve(did)
        print(doc.to_dict())

        jwt = DID.sign(did, encrypted_private_key, "Hello World", encrypt_key)
    """

    @staticmethod
    def create(address: str) -> str:
        """
        Creates a DID:ethr identifier from an Ethereum address.
        Returns: "did:ethr:0x..."
        """
        if not address.startswith("0x") or len(address) != 42:
            raise ValueError(f"Invalid EVM address: {address}")
        return f"did:{DID_METHOD}:{address.lower()}"

    @staticmethod
    def resolve(did: str) -> DIDDocument:
        """
        Resolves a DID:ethr to a W3C-compliant DID Document.
        In production, queries the Ethereum DID Registry contract.
        """
        parts = did.split(":")
        if len(parts) < 3 or parts[0] != "did" or parts[1] != DID_METHOD:
            raise ValueError(f"Unsupported DID: {did}")

        address = parts[2]
        now = datetime.now(timezone.utc).isoformat()
        vm_id = f"{did}#controller"

        return DIDDocument(
            context=[
                "https://www.w3.org/ns/did/v1",
                "https://w3id.org/security/suites/secp256k1recovery-2020/v2",
            ],
            id=did,
            verification_method=[
                VerificationMethod(
                    id=vm_id,
                    type="EcdsaSecp256k1RecoveryMethod2020",
                    controller=did,
                    blockchain_account_id=f"eip155:1:{address}",
                )
            ],
            authentication=[vm_id],
            assertion_method=[vm_id],
            service=[
                ServiceEndpoint(
                    id=f"{did}#homeforai",
                    type="HomeForAIService",
                    service_endpoint="https://api.homeforai.com/did/v1",
                )
            ],
            created=now,
            updated=now,
        )

    @staticmethod
    def sign(
        did: str,
        encrypted_private_key: str,
        message: str | dict,
        encrypt_key: str,
    ) -> str:
        """
        Signs a message using the DID's private key, returning a compact JWT.
        Uses HMAC-SHA256 as a lightweight stand-in for ES256K ECDSA.
        """
        private_key = decrypt(encrypted_private_key, encrypt_key)

        header = _b64url(json.dumps({"alg": "ES256K", "typ": "JWT"}).encode())
        payload_data = {
            "iss": did,
            "sub": did,
            "iat": int(datetime.now(timezone.utc).timestamp()),
            "exp": int(datetime.now(timezone.utc).timestamp()) + 3600,
            "msg": message if isinstance(message, str) else json.dumps(message),
            "jti": os.urandom(8).hex(),
        }
        payload = _b64url(json.dumps(payload_data).encode())

        signing_input = f"{header}.{payload}".encode()
        sig = hmac.new(private_key.encode(), signing_input, hashlib.sha256).digest()
        signature = _b64url(sig)

        return f"{header}.{payload}.{signature}"

    @staticmethod
    def parse_jwt(jwt: str) -> dict:
        """Parses a DID JWT without verifying the signature."""
        parts = jwt.split(".")
        if len(parts) != 3:
            raise ValueError("Invalid JWT format")
        return {
            "header": json.loads(_b64url_decode(parts[0])),
            "payload": json.loads(_b64url_decode(parts[1])),
            "signature": parts[2],
            "token": jwt,
        }

    @staticmethod
    def is_homeforai_did(did: str) -> bool:
        """Checks if a DID belongs to the Home for AI ecosystem."""
        return did.startswith(f"did:{DID_METHOD}:")


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64url_decode(data: str) -> bytes:
    # Add padding
    padded = data + "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(padded)
