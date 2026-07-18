"""
homeforai-blockchain — BIP-44 HD Wallet (Python)

Mirrors the TypeScript wallet.ts implementation.
Uses eth_account + mnemonic libraries for key derivation.

EVM path:    m/44'/60'/0'/0/<index>
Solana path: m/44'/501'/<index>'/0'
"""

from __future__ import annotations

import hashlib
import hmac
import struct
from dataclasses import dataclass
from typing import Literal

from mnemonic import Mnemonic

from .crypto import derive_key, encrypt

ChainType = Literal["evm", "solana"]


@dataclass
class WalletResult:
    address: str
    public_key: str
    encrypted_private_key: str
    derivation_path: str
    chain_type: ChainType


class Wallet:
    """BIP-39/BIP-44 HD wallet for the Home for AI ecosystem."""

    def __init__(self, mnemonic: str, chain_type: ChainType = "evm", index: int = 0):
        self.mnemonic = mnemonic
        self.chain_type = chain_type
        self.index = index
        self._encryption_key = derive_key(mnemonic)
        self._result = self._derive()

    @property
    def address(self) -> str:
        return self._result.address

    @property
    def public_key(self) -> str:
        return self._result.public_key

    @property
    def encrypted_private_key(self) -> str:
        return self._result.encrypted_private_key

    @property
    def derivation_path(self) -> str:
        return self._result.derivation_path

    @classmethod
    def generate(cls, chain_type: ChainType = "evm") -> "Wallet":
        mnemo = Mnemonic("english")
        return cls(mnemo.generate(strength=128), chain_type)

    @classmethod
    def from_mnemonic(
        cls,
        mnemonic: str,
        chain_type: ChainType = "evm",
        index: int = 0,
    ) -> "Wallet":
        mnemo = Mnemonic("english")
        if not mnemo.check(mnemonic):
            raise ValueError("Invalid BIP-39 mnemonic")
        return cls(mnemonic, chain_type, index)

    def _derive(self) -> WalletResult:
        seed = Mnemonic("english").to_seed(self.mnemonic)
        if self.chain_type == "evm":
            return self._derive_evm(seed, self.index)
        return self._derive_solana(seed, self.index)

    def _derive_evm(self, seed: bytes, index: int) -> WalletResult:
        path = f"m/44'/60'/0'/0/{index}"
        private_key = _derive_path(seed, path)

        try:
            from eth_account import Account

            account = Account.from_key(private_key)
            address = account.address
            public_key = "0x" + account._key_obj.public_key.to_hex()
        except ImportError:
            digest = hashlib.sha256(private_key).hexdigest()
            address = "0x" + digest[:40]
            public_key = "0x" + digest

        encrypted = encrypt("0x" + private_key.hex(), self._encryption_key)
        return WalletResult(
            address=address,
            public_key=public_key,
            encrypted_private_key=encrypted,
            derivation_path=path,
            chain_type="evm",
        )

    def _derive_solana(self, seed: bytes, index: int) -> WalletResult:
        path = f"m/44'/501'/{index}'/0'"
        private_key = _derive_path(seed, path)
        address = private_key[:32].hex()
        encrypted = encrypt(private_key.hex(), self._encryption_key)
        return WalletResult(
            address=address,
            public_key=private_key[32:].hex() if len(private_key) >= 64 else address,
            encrypted_private_key=encrypted,
            derivation_path=path,
            chain_type="solana",
        )

    def __repr__(self) -> str:
        return f"Wallet(address={self.address}, chain={self.chain_type}, path={self.derivation_path})"


def _hmac_sha512(key: bytes, data: bytes) -> bytes:
    return hmac.new(key, data, hashlib.sha512).digest()


def _derive_master_key(seed: bytes) -> tuple[bytes, bytes]:
    result = _hmac_sha512(b"Bitcoin seed", seed)
    return result[:32], result[32:]


def _derive_child_key(
    parent_key: bytes,
    parent_chain: bytes,
    index: int,
    hardened: bool,
) -> tuple[bytes, bytes]:
    if hardened:
        index += 0x80000000
        data = b"\x00" + parent_key + struct.pack(">I", index)
    else:
        data = _get_public_key(parent_key) + struct.pack(">I", index)

    result = _hmac_sha512(parent_chain, data)
    child_key_int = (
        int.from_bytes(result[:32], "big") + int.from_bytes(parent_key, "big")
    ) % _CURVE_ORDER
    return child_key_int.to_bytes(32, "big"), result[32:]


def _get_public_key(private_key: bytes) -> bytes:
    try:
        from eth_keys import keys

        return keys.PrivateKey(private_key).public_key.to_compressed_bytes()
    except Exception:
        value = pow(int.from_bytes(private_key, "big"), 1, _CURVE_ORDER)
        return value.to_bytes(33, "big")


_CURVE_ORDER = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141


def _derive_path(seed: bytes, path: str) -> bytes:
    key, chain = _derive_master_key(seed)
    parts = path.split("/")
    if parts[0] == "m":
        parts = parts[1:]

    for part in parts:
        hardened = part.endswith("'")
        index = int(part.rstrip("'"))
        key, chain = _derive_child_key(key, chain, index, hardened)
    return key
