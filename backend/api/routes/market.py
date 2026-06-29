"""
Home for AI — Market Data API Routes

GET /market/prices      → Current prices for a list of symbols
GET /market/news        → Latest market news (by specialty)
GET /market/symbols     → Available symbols list per market type
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query, Request

from markets.data_fetcher import DataFetcher
from markets.news_fetcher import NewsFetcher
from security.auth import get_current_user
from security.input_validator import validate_symbol
from security.rate_limiter import limiter

router = APIRouter(prefix="/market", tags=["market"])

_data_fetcher = DataFetcher()
_news_fetcher = NewsFetcher()


@router.get("/prices", response_model=Dict[str, Any])
@limiter.limit("60/minute")
async def get_prices(
    request: Request,
    symbols: str = Query(
        default="AAPL,BTC-USD,EURUSD=X",
        description="Comma-separated list of symbols (max 20)",
    ),
    _user_id: str = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Fetch current prices for the requested symbols.

    Supports stocks (AAPL), crypto (BTC-USD), forex (EURUSD=X),
    commodities (GC=F), bonds (^TNX).
    """
    symbol_list = [s.strip() for s in symbols.split(",") if s.strip()]
    symbol_list = symbol_list[:20]  # Hard cap

    # Validate each symbol
    validated = []
    errors = []
    for sym in symbol_list:
        try:
            validated.append(validate_symbol(sym))
        except Exception:
            errors.append(sym)

    price_data = await _data_fetcher.fetch_prices(validated)

    return {
        "prices": {sym: md.to_dict() for sym, md in price_data.items()},
        "failed_symbols": errors,
        "count": len(price_data),
    }


@router.get("/news", response_model=Dict[str, Any])
@limiter.limit("30/minute")
async def get_news(
    request: Request,
    market: str = Query(
        default="Stocks",
        description="Market specialty: Stocks | Crypto | Forex | Bonds | Commodities",
    ),
    limit: int = Query(default=20, ge=1, le=50),
    _user_id: str = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Fetch recent market news for the specified market specialty.

    Results are cached for 5 minutes. Returns up to 50 headlines.
    """
    valid_markets = {"Stocks", "Crypto", "Forex", "Bonds", "Commodities"}
    if market not in valid_markets:
        market = "Stocks"

    news_items = await _news_fetcher.fetch_news(market=market, max_items=limit)
    return {
        "market": market,
        "items": [item.to_dict() for item in news_items],
        "count": len(news_items),
    }


@router.get("/symbols", response_model=Dict[str, Any])
async def get_symbols(
    request: Request,
    _user_id: str = Depends(get_current_user),
) -> Dict[str, Any]:
    """Return the full symbol catalogue organised by market type."""
    return {
        "Stocks": ["AAPL", "MSFT", "GOOGL", "NVDA", "TSLA", "AMZN", "META", "SPY", "QQQ"],
        "Crypto": ["BTC-USD", "ETH-USD", "SOL-USD", "BNB-USD", "AVAX-USD", "ADA-USD"],
        "Forex": ["EURUSD=X", "GBPUSD=X", "USDJPY=X", "AUDUSD=X", "USDCAD=X", "USDCHF=X"],
        "Bonds": ["^TNX", "^TYX", "^IRX", "TLT", "IEF"],
        "Commodities": ["GC=F", "SI=F", "CL=F", "NG=F", "ZC=F"],
    }
