"""
Home for AI — Markets Package

Market data fetching, news retrieval, portfolio management, and copy trading.
"""

from markets.data_fetcher import DataFetcher, MarketData
from markets.news_fetcher import NewsFetcher, NewsItem
from markets.portfolio_manager import PortfolioManager
from markets.copy_trade_engine import CopyTradeEngine

__all__ = [
    "DataFetcher",
    "MarketData",
    "NewsFetcher",
    "NewsItem",
    "PortfolioManager",
    "CopyTradeEngine",
]
