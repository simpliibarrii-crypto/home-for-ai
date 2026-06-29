"""
Home for AI — Market Data Fetcher

Provides real-time and historical price data across:
- Stocks, ETFs, Commodities, Bonds → yfinance (free, no key)
- Crypto                            → CoinGecko API (free tier)
- Forex                             → Frankfurter API (free, no key)

All prices are cached with a 60-second TTL to respect rate limits.
Returns standardised MarketData objects.
"""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

CACHE_TTL_SECONDS = 60

# CoinGecko symbol mapping (ticker → coingecko_id)
COINGECKO_IDS: Dict[str, str] = {
    "BTC-USD": "bitcoin",
    "ETH-USD": "ethereum",
    "SOL-USD": "solana",
    "BNB-USD": "binancecoin",
    "AVAX-USD": "avalanche-2",
    "ADA-USD": "cardano",
    "DOT-USD": "polkadot",
    "MATIC-USD": "matic-network",
    "LINK-USD": "chainlink",
    "UNI-USD": "uniswap",
}

# Frankfurter base currency
FRANKFURTER_BASE = "USD"
FOREX_SYMBOL_MAP: Dict[str, str] = {
    "EURUSD=X": "EUR",
    "GBPUSD=X": "GBP",
    "USDJPY=X": "JPY",
    "AUDUSD=X": "AUD",
    "USDCAD=X": "CAD",
    "USDCHF=X": "CHF",
    "NZDUSD=X": "NZD",
}


@dataclass
class MarketData:
    """Standardised market data record returned by the data fetcher."""

    symbol: str
    price: float
    change_24h: float = 0.0        # percentage
    volume: float = 0.0
    market_cap: float = 0.0
    history: List[float] = field(default_factory=list)  # last 30 closes for technicals
    source: str = ""
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "symbol": self.symbol,
            "price": self.price,
            "change_24h": round(self.change_24h, 4),
            "volume": self.volume,
            "market_cap": self.market_cap,
            "source": self.source,
            "timestamp": self.timestamp,
        }


class DataFetcher:
    """
    Async market data fetcher with in-memory TTL cache.

    Automatically routes to the correct data source based on symbol format.
    """

    def __init__(self) -> None:
        self._cache: Dict[str, tuple[MarketData, float]] = {}  # symbol → (data, expiry)
        self._http_client: Optional[httpx.AsyncClient] = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._http_client is None or self._http_client.is_closed:
            self._http_client = httpx.AsyncClient(timeout=15.0)
        return self._http_client

    async def close(self) -> None:
        if self._http_client and not self._http_client.is_closed:
            await self._http_client.aclose()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def fetch_prices(
        self, symbols: List[str]
    ) -> Dict[str, MarketData]:
        """
        Fetch prices for a list of symbols in parallel.

        Routes each symbol to the correct source:
        - "-USD" suffix → CoinGecko (crypto)
        - "=X" suffix   → Frankfurter (forex)
        - Otherwise     → yfinance (stocks/ETFs/commodities/bonds)
        """
        tasks: Dict[str, asyncio.Task[Optional[MarketData]]] = {}

        for symbol in symbols:
            # Check cache first
            cached = self._get_cached(symbol)
            if cached:
                tasks[symbol] = asyncio.create_task(
                    self._return_cached(cached), name=f"cache-{symbol}"
                )
            elif symbol in COINGECKO_IDS:
                tasks[symbol] = asyncio.create_task(
                    self._fetch_crypto(symbol), name=f"crypto-{symbol}"
                )
            elif symbol.endswith("=X"):
                tasks[symbol] = asyncio.create_task(
                    self._fetch_forex(symbol), name=f"forex-{symbol}"
                )
            else:
                tasks[symbol] = asyncio.create_task(
                    self._fetch_yfinance(symbol), name=f"yf-{symbol}"
                )

        results = await asyncio.gather(*tasks.values(), return_exceptions=True)
        output: Dict[str, MarketData] = {}

        for symbol, result in zip(tasks.keys(), results):
            if isinstance(result, Exception):
                logger.warning("Failed to fetch %s: %s", symbol, result)
            elif result is not None:
                output[symbol] = result
                self._set_cache(symbol, result)

        return output

    async def fetch_single(self, symbol: str) -> Optional[MarketData]:
        """Convenience method to fetch a single symbol."""
        results = await self.fetch_prices([symbol])
        return results.get(symbol)

    # ------------------------------------------------------------------
    # Source-specific fetchers
    # ------------------------------------------------------------------

    async def _fetch_yfinance(self, symbol: str) -> Optional[MarketData]:
        """
        Fetch via yfinance. Runs in a thread pool to avoid blocking the
        async event loop (yfinance is synchronous).
        """
        def _sync_fetch() -> Optional[MarketData]:
            try:
                import yfinance as yf
                ticker = yf.Ticker(symbol)
                # Fast info (no full download)
                info = ticker.fast_info
                hist = ticker.history(period="1mo", interval="1d")

                price = float(info.last_price or 0)
                prev_close = float(info.previous_close or price)
                change_24h = ((price - prev_close) / prev_close * 100) if prev_close else 0.0
                volume = float(info.three_month_average_volume or 0)

                history_closes: List[float] = []
                if not hist.empty:
                    history_closes = hist["Close"].tolist()

                return MarketData(
                    symbol=symbol,
                    price=price,
                    change_24h=change_24h,
                    volume=volume,
                    history=history_closes,
                    source="yfinance",
                )
            except Exception as exc:
                logger.warning("yfinance fetch failed for %s: %s", symbol, exc)
                return None

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _sync_fetch)

    async def _fetch_crypto(self, symbol: str) -> Optional[MarketData]:
        """Fetch crypto data from CoinGecko free tier."""
        coin_id = COINGECKO_IDS.get(symbol)
        if not coin_id:
            return None

        client = self._get_client()
        url = (
            f"https://api.coingecko.com/api/v3/coins/{coin_id}"
            "?localization=false&tickers=false&community_data=false&developer_data=false"
        )
        try:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()

            market = data.get("market_data", {})
            price = float(market.get("current_price", {}).get("usd", 0))
            change_24h = float(market.get("price_change_percentage_24h", 0))
            volume = float(market.get("total_volume", {}).get("usd", 0))
            market_cap = float(market.get("market_cap", {}).get("usd", 0))

            # Fetch 30-day history for technicals
            history_closes = await self._fetch_crypto_history(coin_id)

            return MarketData(
                symbol=symbol,
                price=price,
                change_24h=change_24h,
                volume=volume,
                market_cap=market_cap,
                history=history_closes,
                source="coingecko",
            )
        except Exception as exc:
            logger.warning("CoinGecko fetch failed for %s: %s", symbol, exc)
            return None

    async def _fetch_crypto_history(self, coin_id: str) -> List[float]:
        """Fetch 30-day daily closing prices from CoinGecko."""
        client = self._get_client()
        url = (
            f"https://api.coingecko.com/api/v3/coins/{coin_id}/market_chart"
            "?vs_currency=usd&days=30&interval=daily"
        )
        try:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
            prices = data.get("prices", [])
            return [float(p[1]) for p in prices]
        except Exception:
            return []

    async def _fetch_forex(self, symbol: str) -> Optional[MarketData]:
        """Fetch forex rates from Frankfurter API (free, no key required)."""
        currency = FOREX_SYMBOL_MAP.get(symbol)
        if not currency:
            return None

        client = self._get_client()
        url = f"https://api.frankfurter.app/latest?from=USD&to={currency}"
        try:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
            rate = float(data.get("rates", {}).get(currency, 1))

            # For USD/JPY style: price = rate; for EUR/USD: price = 1/rate
            if symbol.startswith("USD"):
                price = rate
            else:
                price = 1.0 / rate if rate else 1.0

            return MarketData(
                symbol=symbol,
                price=round(price, 6),
                change_24h=0.0,  # Frankfurter free tier doesn't provide 24h change
                source="frankfurter",
            )
        except Exception as exc:
            logger.warning("Frankfurter fetch failed for %s: %s", symbol, exc)
            return None

    # ------------------------------------------------------------------
    # Cache helpers
    # ------------------------------------------------------------------

    def _get_cached(self, symbol: str) -> Optional[MarketData]:
        entry = self._cache.get(symbol)
        if entry and time.monotonic() < entry[1]:
            return entry[0]
        return None

    def _set_cache(self, symbol: str, data: MarketData) -> None:
        self._cache[symbol] = (data, time.monotonic() + CACHE_TTL_SECONDS)

    @staticmethod
    async def _return_cached(data: MarketData) -> MarketData:
        return data
