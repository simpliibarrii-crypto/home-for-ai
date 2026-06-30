"""
wallet_manager.py — HD Wallet: BIP-39 → BIP-32 → BIP-44 derivation.

Derives Ethereum accounts from BIP-39 mnemonics using:
  - mnemonic library for word generation and validation
  - eth_account for key derivation and signing
  - Manual BIP-32/44 path construction

BIP-44 derivation path for Ethereum: m/44'/60'/account'/change/index
                                                    ^^^ coin type 60 = Ethereum

Dependencies:
  - eth-account >= 0.13
  - mnemonic >= 0.21
"""

from __future__ import annotations

import hashlib
import hmac
import struct
from dataclasses import dataclass
from typing import Optional

from eth_account import Account
from eth_account.signers.local import LocalAccount
from mnemonic import Mnemonic


# ─── Constants ────────────────────────────────────────────────────────────────

# SLIP-44 coin types
COIN_TYPE_ETH = 60
COIN_TYPE_SOL = 501  # Solana (SVM)

# BIP-44 hardened flag
HARDENED = 0x80000000


# ─── BIP-32 key derivation ────────────────────────────────────────────────────

def _hmac_sha512(key: bytes, data: bytes) -> bytes:
    return hmac.new(key, data, hashlib.sha512).digest()


def _derive_master_key(seed: bytes) -> tuple[bytes, bytes]:
    """Derive BIP-32 master private key and chain code from seed."""
    I = _hmac_sha512(b"Bitcoin seed", seed)
    return I[:32], I[32:]


def _ckd_priv(parent_key: bytes, parent_chain_code: bytes, index: int) -> tuple[bytes, bytes]:
    """
    Child key derivation (private parent → private child).

    For hardened child (index >= HARDENED):
        I = HMAC-SHA512(chain_code, 0x00 ++ parent_key ++ index)
    For normal child:
        I = HMAC-SHA512(chain_code, point(parent_key) ++ index)

    Returns (child_key_bytes, child_chain_code).
    """
    is_hardened = index >= HARDENED
    if is_hardened:
        data = b"\x00" + parent_key + struct.pack(">I", index)
    else:
        # Derive compressed public key from private key
        compressed_pub = _private_to_compressed_pubkey(parent_key)
        data = compressed_pub + struct.pack(">I", index)

    I = _hmac_sha512(parent_chain_code, data)
    child_key_int = (
        int.from_bytes(I[:32], "big") + int.from_bytes(parent_key, "big")
    ) % 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141

    child_key = child_key_int.to_bytes(32, "big")
    child_chain_code = I[32:]
    return child_key, child_chain_code


def _private_to_compressed_pubkey(private_key_bytes: bytes) -> bytes:
    """
    Derive a compressed secp256k1 public key from a private key.

    Production: use eth_keys or coincurve for proper secp256k1 math.
    This stub uses eth_account to derive the public key bytes.
    """
    acct = Account.from_key(private_key_bytes)
    pub_key = acct._key_obj.public_key
    # pub_key.to_compressed_bytes() — available in eth_keys >= 0.5
    try:
        return bytes(pub_key.to_compressed_bytes())
    except AttributeError:
        # Fallback: prefix + x-coordinate only (not cryptographically correct)
        pub_bytes = bytes(pub_key)  # 64-byte uncompressed
        x = pub_bytes[:32]
        y = pub_bytes[32:]
        prefix = b"\x02" if int.from_bytes(y, "big") % 2 == 0 else b"\x03"
        return prefix + x


def _derive_path(seed: bytes, path: str) -> bytes:
    """
    Derive a private key at the given BIP-32 derivation path.

    Path format: "m/44'/60'/0'/0/0"
    ' denotes hardened derivation (adds HARDENED to index).

    Returns the 32-byte private key at the leaf node.
    """
    master_key, master_chain_code = _derive_master_key(seed)
    key, chain_code = master_key, master_chain_code

    # Parse path: skip 'm'
    for part in path.split("/")[1:]:
        if part.endswith("'"):
            index = int(part[:-1]) + HARDENED
        else:
            index = int(part)
        key, chain_code = _ckd_priv(key, chain_code, index)

    return key


# ─── Dataclasses ──────────────────────────────────────────────────────────────

@dataclass
class DerivedAccount:
    """A derived Ethereum account at a specific BIP-44 path."""
    path: str
    address: str
    private_key: str  # 0x-prefixed hex
    account_index: int
    address_index: int


@dataclass
class WalletInfo:
    """Summary of an HD wallet."""
    mnemonic_word_count: int
    accounts: list[DerivedAccount]
    coin_type: int = COIN_TYPE_ETH


# ─── HDWalletManager ──────────────────────────────────────────────────────────

class HDWalletManager:
    """
    BIP-39 → BIP-32 → BIP-44 HD wallet manager for Ethereum.

    Derives accounts at: m/44'/60'/account'/0/index

    Usage:
        manager = HDWalletManager.from_mnemonic("word1 word2 ... word12")
        account = manager.derive_account(account_index=0, address_index=0)
        print(account.address)   # 0xABCD...
        print(account.private_key)  # 0x1234...

        # Sign a transaction
        signed = manager.sign_transaction(account.private_key, tx_dict)
    """

    def __init__(self, seed: bytes) -> None:
        self._seed = seed

    @classmethod
    def from_mnemonic(cls, mnemonic: str, passphrase: str = "") -> "HDWalletManager":
        """
        Create an HDWalletManager from a BIP-39 mnemonic phrase.

        Args:
            mnemonic:   space-separated BIP-39 word list (12, 15, 18, 21, or 24 words)
            passphrase: optional BIP-39 extension passphrase (default "")

        Raises:
            ValueError: if the mnemonic is invalid
        """
        mnemo = Mnemonic("english")
        if not mnemo.check(mnemonic.strip()):
            raise ValueError(
                "Invalid BIP-39 mnemonic: checksum failed or unknown words"
            )
        seed = Mnemonic.to_seed(mnemonic.strip(), passphrase)
        return cls(seed)

    @classmethod
    def generate(cls, strength: int = 128, passphrase: str = "") -> tuple["HDWalletManager", str]:
        """
        Generate a new random BIP-39 mnemonic and create an HDWalletManager.

        Args:
            strength:   entropy bits (128=12 words, 256=24 words)
            passphrase: optional extension passphrase

        Returns:
            (HDWalletManager, mnemonic_string)
        """
        mnemo = Mnemonic("english")
        mnemonic = mnemo.generate(strength=strength)
        return cls.from_mnemonic(mnemonic, passphrase), mnemonic

    def derive_account(
        self,
        account_index: int = 0,
        address_index: int = 0,
        coin_type: int = COIN_TYPE_ETH,
        change: int = 0,
    ) -> DerivedAccount:
        """
        Derive a single account at m/44'/coin_type'/account_index'/change/address_index.

        Args:
            account_index:  BIP-44 account number (0 = primary)
            address_index:  BIP-44 address index within the account
            coin_type:      SLIP-44 coin type (60 = ETH)
            change:         0 = external (receiving), 1 = internal (change)

        Returns:
            DerivedAccount with address and private key
        """
        path = f"m/44'/{coin_type}'/{account_index}'/{change}/{address_index}"
        private_key_bytes = _derive_path(self._seed, path)
        account: LocalAccount = Account.from_key(private_key_bytes)

        return DerivedAccount(
            path=path,
            address=account.address,
            private_key="0x" + private_key_bytes.hex(),
            account_index=account_index,
            address_index=address_index,
        )

    def derive_accounts(
        self,
        count: int = 5,
        account_index: int = 0,
        coin_type: int = COIN_TYPE_ETH,
    ) -> list[DerivedAccount]:
        """
        Derive `count` accounts starting at address index 0 for the given BIP-44 account.
        """
        return [
            self.derive_account(
                account_index=account_index,
                address_index=i,
                coin_type=coin_type,
            )
            for i in range(count)
        ]

    def sign_transaction(
        self,
        private_key: str,
        transaction: dict,
    ) -> dict:
        """
        Sign an Ethereum transaction dict with the given private key.

        The transaction dict must include: to, value, gas, nonce, chainId.
        EIP-1559 fields: maxFeePerGas, maxPriorityFeePerGas.

        Returns the signed transaction as a dict with rawTransaction (hex) and hash.
        """
        account: LocalAccount = Account.from_key(private_key)
        signed = account.sign_transaction(transaction)
        return {
            "raw_transaction": signed.rawTransaction.hex(),
            "hash": signed.hash.hex(),
            "r": hex(signed.r),
            "s": hex(signed.s),
            "v": signed.v,
        }

    def sign_message(self, private_key: str, message: str) -> dict:
        """
        Sign a text message (EIP-191 personal_sign) with the given private key.

        Returns the signature and recovery information.
        """
        from eth_account.messages import encode_defunct
        account: LocalAccount = Account.from_key(private_key)
        msg = encode_defunct(text=message)
        signed = account.sign_message(msg)
        return {
            "message_hash": signed.messageHash.hex(),
            "signature": signed.signature.hex(),
            "r": hex(signed.r),
            "s": hex(signed.s),
            "v": signed.v,
        }

    def get_address_for_private_key(self, private_key: str) -> str:
        """Recover the Ethereum address corresponding to a private key."""
        return Account.from_key(private_key).address

    def wallet_info(self, count: int = 3) -> WalletInfo:
        """Return a summary of the wallet's first `count` accounts."""
        return WalletInfo(
            mnemonic_word_count=0,  # not stored for security
            accounts=self.derive_accounts(count=count),
        )
