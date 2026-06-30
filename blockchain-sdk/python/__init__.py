"""
homeforai-blockchain

Shared blockchain identity and payment SDK for the Home for AI ecosystem.
Python implementation mirroring the TypeScript SDK.

Supports: Home for AI, Raven AI, OpenClinical AI, Hermes Edge.

Usage:
    from homeforai_blockchain import Wallet, verify_payment, pay_for_compute, NFT, DID

    # Create a wallet
    wallet = Wallet.generate()
    print(wallet.address)

    # Pay for compute
    result = await pay_for_compute(amount=0.50, target_app="raven-ai", user_id="user_123")

    # Verify payment
    verified = await verify_payment(result["mock_tx_hash"])

    # Check NFT ownership
    has_access = await NFT.check_ownership(wallet.address, token_id=42)
"""

from .wallet import Wallet
from .identity import DID
from .chains import CHAINS, get_chain_by_id, get_evm_chains
from .payments import pay_for_compute, verify_payment, get_balance, build_payment_request_uri
from .nft import NFT
from .crypto import encrypt, decrypt, derive_key

__version__ = "0.1.0"
__all__ = [
    "Wallet",
    "DID",
    "NFT",
    "CHAINS",
    "get_chain_by_id",
    "get_evm_chains",
    "pay_for_compute",
    "verify_payment",
    "get_balance",
    "build_payment_request_uri",
    "encrypt",
    "decrypt",
    "derive_key",
]
