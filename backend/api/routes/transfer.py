"""
transfer.py — FastAPI router for cross-asset transfer operations.

Routes:
  POST /api/transfer/quote    — Get a crypto→fiat quote without executing
  POST /api/transfer/execute  — Execute the full crypto→fiat→bond/commodity pipeline
  GET  /api/transfer/history  — Get transfer history for the authenticated user
"""

from __future__ import annotations

import time
import uuid
from typing import Optional
from dataclasses import asdict

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator

from blockchain.converter import (
    BondETF,
    CommodityETF,
    CryptoToFiatConverter,
    FiatToBondConverter,
    FiatToCommodityConverter,
    TransferPipeline,
    COINGECKO_IDS,
)

router = APIRouter(prefix="/api/transfer", tags=["transfer"])

# ─── Pydantic models ──────────────────────────────────────────────────────────

class TransferQuoteRequest(BaseModel):
    """Request body for POST /api/transfer/quote."""

    token_symbol: str = Field(..., description="Token symbol, e.g. 'ETH', 'BTC'")
    amount: float = Field(..., gt=0, description="Token amount to convert")
    target_currency: str = Field("USD", description="ISO 4217 target currency code")

    @field_validator("token_symbol")
    @classmethod
    def validate_token(cls, v: str) -> str:
        v = v.upper()
        if v not in COINGECKO_IDS:
            raise ValueError(
                f"Unsupported token: {v!r}. Supported: {sorted(COINGECKO_IDS.keys())}"
            )
        return v

    @field_validator("target_currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        supported = {"USD", "CAD", "EUR", "GBP"}
        v = v.upper()
        if v not in supported:
            raise ValueError(f"Unsupported currency: {v!r}. Supported: {supported}")
        return v


class TransferQuoteResponse(BaseModel):
    token_symbol: str
    token_amount: float
    target_currency: str
    fiat_amount: float
    rate: float
    fee: float
    net_amount: float
    coingecko_id: str
    quoted_at: float
    expires_at: float


class TransferExecuteRequest(BaseModel):
    """Request body for POST /api/transfer/execute."""

    token_symbol: str = Field(..., description="Source token")
    amount: float = Field(..., gt=0, description="Source token amount")
    intermediate_currency: str = Field("USD", description="Intermediate fiat currency")
    destination_type: str = Field(..., description="'bond' or 'commodity'")
    bond_etf: Optional[str] = Field(None, description="Bond ETF ticker (XBB|AGG|BNDW)")
    commodity: Optional[str] = Field(None, description="Commodity ETF ticker (GLD|SLV|USO)")

    @field_validator("destination_type")
    @classmethod
    def validate_destination(cls, v: str) -> str:
        if v not in ("bond", "commodity"):
            raise ValueError(f"destination_type must be 'bond' or 'commodity', got {v!r}")
        return v

    @field_validator("bond_etf")
    @classmethod
    def validate_bond_etf(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            valid = {e.value for e in BondETF}
            if v.upper() not in valid:
                raise ValueError(f"Invalid bond_etf: {v!r}. Valid: {valid}")
            return v.upper()
        return v

    @field_validator("commodity")
    @classmethod
    def validate_commodity(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            valid = {e.value for e in CommodityETF}
            if v.upper() not in valid:
                raise ValueError(f"Invalid commodity: {v!r}. Valid: {valid}")
            return v.upper()
        return v


class TransferHistoryEntry(BaseModel):
    transfer_id: str
    token_symbol: str
    amount: float
    destination_type: str
    destination_asset: str
    status: str
    created_at: float


# ─── In-memory history store (replace with database in production) ─────────────

_transfer_history: dict[str, list[dict]] = {}


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/quote", response_model=TransferQuoteResponse, summary="Get crypto→fiat quote")
async def get_transfer_quote(request: TransferQuoteRequest) -> TransferQuoteResponse:
    """
    Get a quote for converting a crypto token amount to fiat.

    Uses CoinGecko real-time prices. Quote expires in 30 seconds.
    Does NOT execute any transaction.
    """
    converter = CryptoToFiatConverter()
    try:
        result = await converter.convert(
            token_symbol=request.token_symbol,
            amount=request.amount,
            target_currency=request.target_currency,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Price feed unavailable: {exc}",
        )

    return TransferQuoteResponse(
        token_symbol=result.token_symbol,
        token_amount=result.token_amount,
        target_currency=result.target_currency,
        fiat_amount=result.fiat_amount,
        rate=result.rate,
        fee=result.fee,
        net_amount=result.net_amount,
        coingecko_id=result.coingecko_id,
        quoted_at=result.quoted_at,
        expires_at=result.expires_at,
    )


@router.post("/execute", summary="Execute full crypto→fiat→bond/commodity pipeline")
async def execute_transfer(
    request: TransferExecuteRequest,
) -> dict:
    """
    Execute the full atomic transfer pipeline:

    1. Crypto → Fiat (CoinGecko price, 0.25% fee)
    2. Fiat → Bond ETF (stub broker) OR Fiat → Commodity ETF (stub broker)

    On any failure, all prior steps are rolled back (saga pattern).
    Returns the FullTransferResult regardless of success/failure.
    """
    pipeline = TransferPipeline()

    bond_etf = BondETF(request.bond_etf) if request.bond_etf else None
    commodity = CommodityETF(request.commodity) if request.commodity else None

    result = await pipeline.execute(
        token_symbol=request.token_symbol,
        token_amount=request.amount,
        intermediate_currency=request.intermediate_currency,
        destination_type=request.destination_type,
        bond_etf=bond_etf,
        commodity=commodity,
    )

    # Store in history (stub — use database in production)
    user_id = "anonymous"  # replace with JWT sub in production
    if user_id not in _transfer_history:
        _transfer_history[user_id] = []
    _transfer_history[user_id].append({
        "transfer_id": result.transfer_id,
        "token_symbol": request.token_symbol,
        "amount": request.amount,
        "destination_type": request.destination_type,
        "destination_asset": request.bond_etf or request.commodity or "unknown",
        "status": result.status,
        "created_at": time.time(),
    })

    # Serialise dataclasses to dicts
    response = {
        "transfer_id": result.transfer_id,
        "status": result.status,
        "error": result.error,
        "rollback_steps": result.rollback_steps,
        "completed_at": result.completed_at,
        "quote": asdict(result.quote) if result.quote else None,
        "bond": asdict(result.bond) if result.bond else None,
        "commodity": asdict(result.commodity) if result.commodity else None,
    }

    status_code = status.HTTP_200_OK if result.status == "COMPLETED" else status.HTTP_422_UNPROCESSABLE_ENTITY
    if result.status != "COMPLETED":
        raise HTTPException(status_code=status_code, detail=response)

    return response


@router.get("/history", summary="Get transfer history for authenticated user")
async def get_transfer_history(limit: int = 20, offset: int = 0) -> dict:
    """
    Return paginated transfer history for the authenticated user.

    In production, query from the database filtered by user JWT sub.
    """
    user_id = "anonymous"  # replace with JWT sub
    history = _transfer_history.get(user_id, [])
    paginated = history[offset : offset + limit]

    return {
        "total": len(history),
        "offset": offset,
        "limit": limit,
        "transfers": paginated,
    }
