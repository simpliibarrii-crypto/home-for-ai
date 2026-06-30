"""
homeforai-blockchain — Cross-App Micropayment Protocol (Python)

Async implementation for Python services (Raven AI, OpenClinical AI, Hermes Edge).
Mirrors the TypeScript payments.ts implementation.
"""

from __future__ import annotations

import hashlib
import os
import re
from datetime import datetime, timezone
from typing import Literal, Optional

from .chains import CHAINS, ChainConfig


TargetApp = Literal["raven-ai", "openclinical-ai", "hermes-edge", "home-for-ai"]

APP_PAYMENT_RECEIVERS: dict[str, str] = {
    "raven-ai": "0xBadDB0b8Fe465E82B32D9b5c0E3571E214B9a5E1",
    "openclinical-ai": "0xC0fFee254729296a45a3885639AC7E10F9d54979",
    "hermes-edge": "0xDeAdBeEf000000000000000000000000dEAdbEEf",
    "home-for-ai": "0xABcDEf0123456789ABcDEf0123456789AbCdEf01",
}


async def pay_for_compute(
    amount: float,
    target_app: TargetApp,
    user_id: str,
    chain: str = "base",
    sender_address: Optional[str] = None,
) -> dict:
    """
    Creates a UserOperation to pay for compute in a target app.

    In production, signs and submits the UserOperation to a Bundler
    (e.g., Pimlico, Alchemy AA).

    Args:
        amount: Amount in USDC (e.g., 0.50 for $0.50)
        target_app: Target app to pay ('raven-ai', 'openclinical-ai', 'hermes-edge')
        user_id: User ID in the Home for AI ecosystem
        chain: Chain name (default: 'base')
        sender_address: User's smart account address (auto-generated if not provided)

    Returns:
        dict containing userOperation, mockTxHash, amountUsdc, etc.

    Example:
        result = await pay_for_compute(
            amount=0.50,
            target_app='raven-ai',
            user_id='user_123',
        )
        # Submit result['user_operation'] to bundler
        verified = await verify_payment(result['mock_tx_hash'])
    """
    chain_config = CHAINS.get(chain)
    if not chain_config:
        raise ValueError(f"Unknown chain: {chain}")

    receiver = APP_PAYMENT_RECEIVERS.get(target_app)
    if not receiver:
        raise ValueError(f"Unknown target app: {target_app}")

    amount_usdc = int(amount * 1_000_000)  # 6 decimals
    if not sender_address:
        sender_address = _generate_mock_smart_account(user_id)

    mock_tx_hash = "0x" + os.urandom(32).hex()

    user_op = {
        "sender": sender_address,
        "nonce": "0x0",
        "init_code": "0x",
        "call_data": _encode_usdc_transfer(chain_config.usdc, receiver, amount_usdc),
        "call_gas_limit": "0x493E0",
        "verification_gas_limit": "0x186A0",
        "pre_verification_gas": "0xC350",
        "max_fee_per_gas": "0x3B9ACA00",
        "max_priority_fee_per_gas": "0x3B9ACA00",
        "paymaster_and_data": "0x",
        "signature": "0x",
    }

    return {
        "user_operation": user_op,
        "mock_tx_hash": mock_tx_hash,
        "amount_usdc": f"{amount:.6f} USDC",
        "target_app": target_app,
        "chain": chain,
        "receiver": receiver,
        "estimated_gas_usd": "$0.001",
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


async def verify_payment(
    tx_hash: str,
    chain: str = "base",
) -> dict:
    """
    Verifies a payment by transaction hash.

    In production, queries the chain via RPC:
    1. eth_getTransactionReceipt(txHash)
    2. Parse UserOperationEvent log from EntryPoint
    3. Verify USDC Transfer event to the correct receiver

    Mock: returns verified=True for valid 0x-prefixed 66-char hashes.

    Args:
        tx_hash: Transaction hash (0x prefixed, 32 bytes)
        chain: Chain name (default: 'base')

    Returns:
        dict with 'verified' bool, 'tx_hash', 'chain', 'checked_at'

    Example:
        result = await verify_payment("0xabc123...", chain="base")
        if result['verified']:
            unlock_compute_for_user()
    """
    is_valid = bool(re.match(r"^0x[0-9a-fA-F]{64}$", tx_hash))
    return {
        "verified": is_valid,
        "tx_hash": tx_hash,
        "chain": chain,
        "checked_at": datetime.now(timezone.utc).isoformat(),
    }


async def get_balance(address: str, chain: str = "base") -> str:
    """
    Returns the USDC balance for an address.

    In production: calls eth_call on balanceOf(address) on the USDC contract.
    Mock: returns a deterministic demo balance.

    Args:
        address: EVM address (0x prefixed)
        chain: Chain name (default: 'base')

    Returns:
        Balance as a string (e.g., "100.00")
    """
    addr_num = int(address[2:8] or "0", 16)
    balance = 100 + (addr_num % 9000)
    return f"{balance:.2f}"


def build_payment_request_uri(
    target_app: TargetApp,
    amount: float,
    user_id: str,
    chain: str = "base",
) -> str:
    """
    Returns an EIP-681 URI for a cross-app payment request.
    Used to generate QR codes.
    """
    chain_config = CHAINS.get(chain)
    if not chain_config:
        raise ValueError(f"Unknown chain: {chain}")
    receiver = APP_PAYMENT_RECEIVERS.get(target_app, "")
    amount_usdc = int(amount * 1_000_000)
    return (
        f"ethereum:{chain_config.usdc}@{chain_config.chain_id}"
        f"/transfer?address={receiver}&uint256={amount_usdc}"
        f"&label={target_app}&memo={user_id}"
    )


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _generate_mock_smart_account(user_id: str) -> str:
    h = hashlib.sha256(f"homeforai-account:{user_id}".encode()).hexdigest()
    return "0x" + h[:40]


def _encode_usdc_transfer(usdc_address: str, recipient: str, amount: int) -> str:
    """Encodes a USDC transfer call for the smart account."""
    # transfer(address,uint256): selector 0xa9059cbb
    selector = "a9059cbb"
    to_hex = recipient.replace("0x", "").lower().zfill(64)
    amount_hex = hex(amount)[2:].zfill(64)
    return "0x" + selector + to_hex + amount_hex
