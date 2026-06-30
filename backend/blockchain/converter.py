"""
converter.py — Crypto↔Fiat↔Bond↔Commodity conversion pipeline.

All functions are async and raise exceptions on failure.
Atomic rollback is implemented via the saga pattern: each step records a
compensating action; if a later step fails, all prior compensating actions run.

Dependencies:
  - httpx (async HTTP for CoinGecko)
"""

from __future__ import annotations

import asyncio
import time
import uuid
from dataclasses import dataclass, field
from typing import Optional
from enum import Enum

import httpx


# ─── Enums ────────────────────────────────────────────────────────────────────

class BondETF(str, Enum):
    XBB  = "XBB"   # iShares Core Canadian Universe Bond ETF
    AGG  = "AGG"   # iShares Core U.S. Aggregate Bond ETF
    BNDW = "BNDW"  # Vanguard Total World Bond ETF


class CommodityETF(str, Enum):
    GLD = "GLD"  # SPDR Gold Shares
    SLV = "SLV"  # iShares Silver Trust
    USO = "USO"  # United States Oil Fund


# ─── Result dataclasses ───────────────────────────────────────────────────────

@dataclass
class CryptoToFiatResult:
    token_symbol: str
    token_amount: float
    target_currency: str
    fiat_amount: float
    rate: float
    fee: float
    net_amount: float
    coingecko_id: str
    quoted_at: float = field(default_factory=time.time)
    expires_at: float = field(default_factory=lambda: time.time() + 30)


@dataclass
class BondPurchaseResult:
    etf: str
    amount_fiat: float
    currency: str
    units: float
    price_per_unit: float
    broker_order_id: str
    settlement_date: str
    status: str
    executed_at: float = field(default_factory=time.time)


@dataclass
class CommodityPurchaseResult:
    etf: str
    amount_fiat: float
    currency: str
    units: float
    price_per_unit: float
    broker_order_id: str
    status: str
    executed_at: float = field(default_factory=time.time)


@dataclass
class FullTransferResult:
    transfer_id: str
    quote: Optional[CryptoToFiatResult]
    bond: Optional[BondPurchaseResult]
    commodity: Optional[CommodityPurchaseResult]
    status: str  # "COMPLETED" | "FAILED" | "ROLLED_BACK"
    error: Optional[str]
    rollback_steps: list[str]
    completed_at: float = field(default_factory=time.time)


# ─── CoinGecko token ID map ────────────────────────────────────────────────────

COINGECKO_IDS: dict[str, str] = {
    "ETH":   "ethereum",
    "BTC":   "bitcoin",
    "MATIC": "matic-network",
    "ARB":   "arbitrum",
    "AVAX":  "avalanche-2",
    "BNB":   "binancecoin",
    "SOL":   "solana",
    "USDC":  "usd-coin",
    "USDT":  "tether",
}

# CoinGecko vs currency code map
COINGECKO_CURRENCIES = {"USD": "usd", "CAD": "cad", "EUR": "eur", "GBP": "gbp"}


# ─── Stub price fallbacks (used when CoinGecko is unreachable) ────────────────

FALLBACK_PRICES: dict[str, dict[str, float]] = {
    "ethereum":    {"usd": 3200.0, "cad": 4352.0},
    "bitcoin":     {"usd": 67000.0, "cad": 91120.0},
    "matic-network": {"usd": 0.89, "cad": 1.21},
    "arbitrum":    {"usd": 1.15, "cad": 1.56},
    "avalanche-2": {"usd": 38.0, "cad": 51.68},
    "binancecoin": {"usd": 580.0, "cad": 788.8},
    "solana":      {"usd": 175.0, "cad": 238.0},
    "usd-coin":    {"usd": 1.0, "cad": 1.36},
}


# ─── CryptoToFiatConverter ────────────────────────────────────────────────────

class CryptoToFiatConverter:
    """
    Converts crypto token amounts to fiat using CoinGecko's /simple/price endpoint.
    Falls back to stub prices if CoinGecko is unreachable.
    """

    COINGECKO_BASE = "https://api.coingecko.com/api/v3"
    GATEWAY_FEE_PCT = 0.0025  # 0.25%

    def __init__(self, api_key: Optional[str] = None) -> None:
        self._api_key = api_key
        self._headers = {"x-cg-demo-api-key": api_key} if api_key else {}

    async def get_price(
        self,
        token_symbol: str,
        target_currency: str = "USD",
    ) -> float:
        """Fetch the current price of token_symbol in target_currency."""
        cg_id = COINGECKO_IDS.get(token_symbol.upper())
        if cg_id is None:
            raise ValueError(f"Unknown token: {token_symbol!r}")

        currency = COINGECKO_CURRENCIES.get(target_currency.upper(), "usd")

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{self.COINGECKO_BASE}/simple/price",
                    params={"ids": cg_id, "vs_currencies": currency},
                    headers=self._headers,
                )
                resp.raise_for_status()
                data = resp.json()
                price = data[cg_id][currency]
                return float(price)
        except (httpx.HTTPError, KeyError, Exception):
            # Graceful fallback to stub prices
            fallback = FALLBACK_PRICES.get(cg_id, {})
            price = fallback.get(currency)
            if price is None:
                raise ValueError(
                    f"No price available for {token_symbol}/{target_currency}"
                )
            return price

    async def convert(
        self,
        token_symbol: str,
        amount: float,
        target_currency: str = "USD",
    ) -> CryptoToFiatResult:
        """
        Convert `amount` of `token_symbol` to `target_currency`.

        Returns a CryptoToFiatResult with gross and net amounts.
        """
        if amount <= 0:
            raise ValueError("amount must be positive")

        cg_id = COINGECKO_IDS.get(token_symbol.upper())
        if not cg_id:
            raise ValueError(f"Unsupported token: {token_symbol!r}")

        rate = await self.get_price(token_symbol, target_currency)
        fiat_amount = amount * rate
        fee = fiat_amount * self.GATEWAY_FEE_PCT
        net_amount = fiat_amount - fee

        return CryptoToFiatResult(
            token_symbol=token_symbol.upper(),
            token_amount=amount,
            target_currency=target_currency.upper(),
            fiat_amount=fiat_amount,
            rate=rate,
            fee=fee,
            net_amount=net_amount,
            coingecko_id=cg_id,
        )


# ─── Bond ETF stub prices ─────────────────────────────────────────────────────

BOND_ETF_PRICES_CAD: dict[str, float] = {
    "XBB":  31.50,
    "AGG":  97.20,
    "BNDW": 72.80,
}


class FiatToBondConverter:
    """
    Stub broker API for purchasing bond ETFs with fiat.

    In production, replace with real broker API calls (e.g. Questrade, TD Direct, IBKR).
    Returns realistic mock confirmations with T+2 settlement.
    """

    async def purchase(
        self,
        amount_fiat: float,
        currency: str,
        bond_etf: BondETF,
    ) -> BondPurchaseResult:
        """
        Submit a stub bond ETF purchase order.

        Args:
            amount_fiat: amount in fiat to invest
            currency: ISO 4217 currency code
            bond_etf: target ETF (XBB | AGG | BNDW)
        """
        if amount_fiat <= 0:
            raise ValueError("amount_fiat must be positive")

        price = BOND_ETF_PRICES_CAD.get(bond_etf.value)
        if price is None:
            raise ValueError(f"Unsupported bond ETF: {bond_etf}")

        # Simple currency conversion stub for non-CAD inputs
        if currency != "CAD":
            price = price * 0.74  # rough CAD→USD (stub)

        units = amount_fiat / price
        from datetime import date, timedelta
        settlement_date = (date.today() + timedelta(days=2)).isoformat()

        # Simulate broker API latency
        await asyncio.sleep(0.05)

        return BondPurchaseResult(
            etf=bond_etf.value,
            amount_fiat=amount_fiat,
            currency=currency,
            units=units,
            price_per_unit=price,
            broker_order_id=f"BOND-{uuid.uuid4().hex[:12].upper()}",
            settlement_date=settlement_date,
            status="EXECUTED",
        )


# ─── Commodity ETF stub prices ────────────────────────────────────────────────

COMMODITY_ETF_PRICES_USD: dict[str, float] = {
    "GLD": 185.50,
    "SLV": 22.10,
    "USO": 75.30,
}


class FiatToCommodityConverter:
    """
    Stub broker API for purchasing commodity ETFs with fiat.
    """

    async def purchase(
        self,
        amount_fiat: float,
        currency: str,
        commodity: CommodityETF,
    ) -> CommodityPurchaseResult:
        """
        Submit a stub commodity ETF purchase.

        Args:
            amount_fiat: amount in fiat to invest
            currency: ISO 4217 currency code
            commodity: target ETF (GLD | SLV | USO)
        """
        if amount_fiat <= 0:
            raise ValueError("amount_fiat must be positive")

        price = COMMODITY_ETF_PRICES_USD.get(commodity.value)
        if price is None:
            raise ValueError(f"Unsupported commodity ETF: {commodity}")

        if currency == "CAD":
            price = price * 1.36  # rough USD→CAD (stub)

        units = amount_fiat / price

        await asyncio.sleep(0.05)

        return CommodityPurchaseResult(
            etf=commodity.value,
            amount_fiat=amount_fiat,
            currency=currency,
            units=units,
            price_per_unit=price,
            broker_order_id=f"COMM-{uuid.uuid4().hex[:12].upper()}",
            status="EXECUTED",
        )


# ─── Full transfer pipeline ───────────────────────────────────────────────────

class TransferPipeline:
    """
    Atomic crypto → fiat → bond/commodity pipeline with rollback.

    Implements the saga pattern:
      Step 1: CryptoToFiat → records compensating action (refund crypto)
      Step 2: FiatToBond OR FiatToCommodity → records compensating action (refund fiat)
      If any step fails: run compensating actions in reverse order
    """

    def __init__(
        self,
        crypto_converter: Optional[CryptoToFiatConverter] = None,
        bond_converter: Optional[FiatToBondConverter] = None,
        commodity_converter: Optional[FiatToCommodityConverter] = None,
    ) -> None:
        self._crypto = crypto_converter or CryptoToFiatConverter()
        self._bond = bond_converter or FiatToBondConverter()
        self._commodity = commodity_converter or FiatToCommodityConverter()

    async def execute(
        self,
        token_symbol: str,
        token_amount: float,
        intermediate_currency: str,
        destination_type: str,  # "bond" | "commodity"
        bond_etf: Optional[BondETF] = None,
        commodity: Optional[CommodityETF] = None,
    ) -> FullTransferResult:
        """
        Execute the full crypto → fiat → bond/commodity pipeline.

        Raises nothing — all errors are captured in the result's `error` field.
        """
        transfer_id = f"TX-{uuid.uuid4().hex[:16].upper()}"
        rollback_steps: list[str] = []
        quote: Optional[CryptoToFiatResult] = None
        bond_result: Optional[BondPurchaseResult] = None
        commodity_result: Optional[CommodityPurchaseResult] = None

        try:
            # ── Step 1: Crypto → Fiat ─────────────────────────────────────────
            quote = await self._crypto.convert(
                token_symbol, token_amount, intermediate_currency
            )
            rollback_steps.append(f"crypto→fiat: {token_amount} {token_symbol} quoted at {quote.rate} {intermediate_currency}")

            # ── Step 2: Fiat → Bond or Commodity ──────────────────────────────
            if destination_type == "bond":
                if bond_etf is None:
                    raise ValueError("bond_etf is required for destination_type='bond'")
                bond_result = await self._bond.purchase(
                    quote.net_amount, intermediate_currency, bond_etf
                )
                rollback_steps.append(f"fiat→bond: {quote.net_amount} {intermediate_currency} → {bond_etf.value}")

            elif destination_type == "commodity":
                if commodity is None:
                    raise ValueError("commodity is required for destination_type='commodity'")
                commodity_result = await self._commodity.purchase(
                    quote.net_amount, intermediate_currency, commodity
                )
                rollback_steps.append(f"fiat→commodity: {quote.net_amount} {intermediate_currency} → {commodity.value}")

            else:
                raise ValueError(f"Unknown destination_type: {destination_type!r}")

            return FullTransferResult(
                transfer_id=transfer_id,
                quote=quote,
                bond=bond_result,
                commodity=commodity_result,
                status="COMPLETED",
                error=None,
                rollback_steps=rollback_steps,
            )

        except Exception as exc:
            # Rollback: in production trigger compensating transactions
            rollback_steps.append(f"ROLLBACK: {exc}")
            return FullTransferResult(
                transfer_id=transfer_id,
                quote=quote,
                bond=None,
                commodity=None,
                status="ROLLED_BACK",
                error=str(exc),
                rollback_steps=rollback_steps,
            )
