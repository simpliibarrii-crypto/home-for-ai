"""
blockchain.py — FastAPI router for blockchain operations.

Routes:
  GET  /api/blockchain/chains             — List all supported chains
  GET  /api/blockchain/balance/{address}  — Get native + USDC balance for an address
  POST /api/blockchain/sign               — Sign a message with a private key
"""

from __future__ import annotations

import time
from dataclasses import asdict
from typing import Optional

from fastapi import APIRouter, HTTPException, status, Path, Query
from pydantic import BaseModel, Field

from blockchain.chains import ChainRegistry, CHAINS, Chain
from blockchain.converter import CryptoToFiatConverter, COINGECKO_IDS
from blockchain.eip4337 import UserOpBuilder, BundlerClient, UserOperation, ENTRY_POINT
from blockchain.wallet_manager import HDWalletManager

router = APIRouter(prefix="/api/blockchain", tags=["blockchain"])
_registry = ChainRegistry()


# ─── Pydantic models ──────────────────────────────────────────────────────────

class ChainResponse(BaseModel):
    chain_id: int
    name: str
    short_name: str
    network_type: str
    rpc_url: str
    explorer_url: str
    usdc_address: str
    is_evm: bool
    block_time_ms: int
    finalization_blocks: int
    entry_point_addr: Optional[str] = None
    bundler_url: Optional[str] = None

    @classmethod
    def from_chain(cls, chain: Chain) -> "ChainResponse":
        return cls(
            chain_id=chain.chain_id,
            name=chain.name,
            short_name=chain.short_name,
            network_type=chain.network_type,
            rpc_url=chain.rpc_url,
            explorer_url=chain.explorer_url,
            usdc_address=chain.usdc_address,
            is_evm=chain.is_evm,
            block_time_ms=chain.block_time_ms,
            finalization_blocks=chain.finalization_blocks,
            entry_point_addr=chain.entry_point_addr,
            bundler_url=chain.bundler_url,
        )


class SignMessageRequest(BaseModel):
    private_key: str = Field(..., description="0x-prefixed private key (handle securely)")
    message: str = Field(..., description="Plain text message to sign")


class SignMessageResponse(BaseModel):
    address: str
    message: str
    message_hash: str
    signature: str


class BalanceResponse(BaseModel):
    address: str
    chain_id: int
    chain_name: str
    native_symbol: str
    native_balance: float  # in token units (stub)
    usdc_balance: float    # in USDC units (stub)
    queried_at: float


class PriceQuoteRequest(BaseModel):
    token_symbol: str = Field(..., description="Token symbol, e.g. 'ETH'")
    amount: float = Field(..., gt=0)
    target_currency: str = Field("USD", description="ISO 4217 fiat currency")


class PriceQuoteResponse(BaseModel):
    token_symbol: str
    amount: float
    target_currency: str
    fiat_amount: float
    rate: float
    coingecko_id: str
    quoted_at: float


class UserOpRequest(BaseModel):
    chain_id: int = Field(..., description="EVM chain ID")
    owner_address: str = Field(..., description="EOA owner (0x-prefixed)")
    wallet_address: Optional[str] = Field(None, description="Deployed wallet address (omit for new wallet)")
    nonce: int = Field(0, description="Wallet nonce (use 0 for new wallet)")
    salt: int = Field(0, description="CREATE2 salt for new wallet")
    target: str = Field(..., description="Contract to call")
    call_data: str = Field("0x", description="0x-prefixed ABI-encoded calldata")
    call_value: int = Field(0, description="ETH value in wei")
    paymaster_and_data: str = Field("0x", description="Paymaster calldata (0x for user pays)")


class UserOpResponse(BaseModel):
    sender: str
    nonce: str
    init_code: str
    call_data: str
    call_gas_limit: str
    verification_gas_limit: str
    pre_verification_gas: str
    max_fee_per_gas: str
    max_priority_fee_per_gas: str
    paymaster_and_data: str
    signature: str


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("/chains", summary="List all supported blockchain networks")
async def list_chains() -> dict:
    """Return all supported chains with their configuration."""
    chains = [ChainResponse.from_chain(c) for c in _registry.all()]
    return {
        "chains": [c.model_dump() for c in chains],
        "total": len(chains),
        "evm_chains": sum(1 for c in _registry.all() if c.is_evm),
    }


@router.get("/chains/{chain_id}", response_model=ChainResponse, summary="Get chain config by ID")
async def get_chain(
    chain_id: int = Path(..., description="EVM chain ID or Solana pseudo-ID"),
) -> ChainResponse:
    """Return the configuration for a specific chain."""
    try:
        chain = _registry.get(chain_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chain {chain_id} not found. Supported: {sorted(CHAINS.keys())}",
        )
    return ChainResponse.from_chain(chain)


@router.get(
    "/balance/{address}",
    response_model=BalanceResponse,
    summary="Get native + USDC balance for an address",
)
async def get_balance(
    address: str = Path(..., description="0x-prefixed Ethereum address"),
    chain_id: int = Query(1, description="Chain ID (default: Ethereum mainnet)"),
) -> BalanceResponse:
    """
    Return the native token and USDC balance for an address on the given chain.

    Production: call eth_getBalance + ERC-20 balanceOf via web3.py.
    This stub returns mock balances for development.
    """
    if not address.startswith("0x") or len(address) != 42:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Ethereum address format",
        )

    try:
        chain = _registry.get(chain_id)
    except ValueError:
        raise HTTPException(status_code=404, detail=f"Chain {chain_id} not supported")

    # Stub balances — replace with web3.py calls
    mock_native = 1.2345
    mock_usdc = 500.00

    return BalanceResponse(
        address=address,
        chain_id=chain_id,
        chain_name=chain.name,
        native_symbol=chain.native_currency.symbol,
        native_balance=mock_native,
        usdc_balance=mock_usdc,
        queried_at=time.time(),
    )


@router.post(
    "/sign",
    response_model=SignMessageResponse,
    summary="Sign a message with a private key",
)
async def sign_message(request: SignMessageRequest) -> SignMessageResponse:
    """
    Sign a plain text message using EIP-191 personal_sign.

    WARNING: Never expose private keys in production. Use hardware wallets
    or secure key management systems (HSM, KMS).
    """
    try:
        manager = HDWalletManager(b"\x00" * 64)  # dummy seed — unused for signing
        result = manager.sign_message(request.private_key, request.message)
        address = manager.get_address_for_private_key(request.private_key)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Signing failed: {exc}",
        )

    return SignMessageResponse(
        address=address,
        message=request.message,
        message_hash=result["message_hash"],
        signature=result["signature"],
    )


@router.post("/quote", response_model=PriceQuoteResponse, summary="Get crypto price quote")
async def get_price_quote(request: PriceQuoteRequest) -> PriceQuoteResponse:
    """
    Get a real-time price quote for a crypto token in the given fiat currency.

    Uses CoinGecko /simple/price with fallback to stub prices.
    """
    if request.token_symbol.upper() not in COINGECKO_IDS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown token: {request.token_symbol!r}",
        )

    converter = CryptoToFiatConverter()
    try:
        result = await converter.convert(
            token_symbol=request.token_symbol,
            amount=request.amount,
            target_currency=request.target_currency,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        )

    return PriceQuoteResponse(
        token_symbol=result.token_symbol,
        amount=result.token_amount,
        target_currency=result.target_currency,
        fiat_amount=result.fiat_amount,
        rate=result.rate,
        coingecko_id=result.coingecko_id,
        quoted_at=result.quoted_at,
    )


@router.post("/userop", response_model=UserOpResponse, summary="Build an EIP-4337 UserOperation")
async def build_user_operation(request: UserOpRequest) -> UserOpResponse:
    """
    Build an unsigned EIP-4337 UserOperation for submission to a bundler.

    For new wallets: set wallet_address=None (initCode will be populated).
    For existing wallets: provide wallet_address and current nonce.

    The returned UserOperation must be signed by the owner's private key
    before submission to the bundler via POST /api/blockchain/userop/send.
    """
    try:
        chain = _registry.get(request.chain_id)
    except ValueError:
        raise HTTPException(status_code=404, detail=f"Chain {request.chain_id} not supported")

    if not chain.is_evm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="EIP-4337 is only supported on EVM chains",
        )

    try:
        builder = UserOpBuilder(chain_id=request.chain_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # Decode calldata from hex
    call_data_bytes = bytes.fromhex(request.call_data.removeprefix("0x"))
    paymaster_bytes = bytes.fromhex(request.paymaster_and_data.removeprefix("0x"))

    try:
        if request.wallet_address:
            op = builder.build_op(
                wallet_address=request.wallet_address,
                nonce=request.nonce,
                target=request.target,
                call_value=request.call_value,
                call_data=call_data_bytes,
                paymaster_and_data=paymaster_bytes,
            )
        else:
            op = builder.build_new_wallet_op(
                owner_address=request.owner_address,
                salt=request.salt,
                target=request.target,
                call_value=request.call_value,
                call_data=call_data_bytes,
                paymaster_and_data=paymaster_bytes,
            )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    rpc_dict = op.to_rpc_dict()
    return UserOpResponse(
        sender=rpc_dict["sender"],
        nonce=rpc_dict["nonce"],
        init_code=rpc_dict["initCode"],
        call_data=rpc_dict["callData"],
        call_gas_limit=rpc_dict["callGasLimit"],
        verification_gas_limit=rpc_dict["verificationGasLimit"],
        pre_verification_gas=rpc_dict["preVerificationGas"],
        max_fee_per_gas=rpc_dict["maxFeePerGas"],
        max_priority_fee_per_gas=rpc_dict["maxPriorityFeePerGas"],
        paymaster_and_data=rpc_dict["paymasterAndData"],
        signature=rpc_dict["signature"],
    )
