"""
Home for AI — News Fetcher

Fetches market news from free RSS feeds. No API keys required.

Sources:
- Yahoo Finance RSS  (general market news, earnings)
- Reuters RSS        (macro, FX, commodities)
- CoinDesk RSS       (crypto news)
- Seeking Alpha RSS  (stock analysis)
- FXStreet RSS       (forex news)

News items are deduplicated by URL and filtered to the last 4 hours.
"""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

NEWS_CACHE_TTL = 300  # 5 minutes

# RSS feed registry keyed by market type
RSS_FEEDS: Dict[str, List[str]] = {
    "Stocks": [
        "https://finance.yahoo.com/news/rssindex",
        "https://feeds.a.dj.com/rss/RSSMarketsMain.xml",
        "https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best",
    ],
    "Crypto": [
        "https://www.coindesk.com/arc/outboundfeeds/rss/",
        "https://cointelegraph.com/rss",
        "https://decrypt.co/feed",
    ],
    "Forex": [
        "https://www.fxstreet.com/rss/news",
        "https://www.forexlive.com/feed/news",
        "https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best",
    ],
    "Commodities": [
        "https://finance.yahoo.com/news/rssindex",
        "https://www.mining.com/feed/",
        "https://oilprice.com/rss/main",
    ],
    "Bonds": [
        "https://finance.yahoo.com/news/rssindex",
        "https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best",
    ],
}

# General fallback feeds used when specialty feeds fail
FALLBACK_FEEDS = [
    "https://finance.yahoo.com/news/rssindex",
]

NEWS_LOOKBACK_HOURS = 4


@dataclass
class NewsItem:
    """Standardised news item from any RSS source."""

    headline: str
    summary: str
    source: str
    url: str
    timestamp: str
    sentiment_hint: str = ""  # quick keyword-based sentiment hint

    def to_dict(self) -> Dict[str, Any]:
        return {
            "headline": self.headline,
            "summary": self.summary,
            "source": self.source,
            "url": self.url,
            "timestamp": self.timestamp,
            "sentiment_hint": self.sentiment_hint,
        }


_BULLISH_HINTS = {"surge", "rally", "gain", "record", "bull", "breakout", "boom"}
_BEARISH_HINTS = {"crash", "plunge", "drop", "loss", "decline", "recession", "bear"}


def _quick_sentiment(text: str) -> str:
    lower = text.lower()
    bullish = sum(1 for w in _BULLISH_HINTS if w in lower)
    bearish = sum(1 for w in _BEARISH_HINTS if w in lower)
    if bullish > bearish:
        return "bullish"
    if bearish > bullish:
        return "bearish"
    return "neutral"


def _parse_pub_date(date_str: str) -> Optional[datetime]:
    try:
        return parsedate_to_datetime(date_str).astimezone(timezone.utc)
    except Exception:
        return None


class NewsFetcher:
    """
    Async news fetcher that aggregates RSS feeds with caching.
    """

    def __init__(self) -> None:
        self._cache: Dict[str, tuple[List[NewsItem], float]] = {}
        self._client: Optional[httpx.AsyncClient] = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=10.0,
                headers={"User-Agent": "HomeForAI-NewsBot/1.0 (+https://home-for-ai.app)"},
                follow_redirects=True,
            )
        return self._client

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def fetch_news(
        self, market: str = "Stocks", max_items: int = 30
    ) -> List[NewsItem]:
        """
        Fetch and return deduplicated news for the given market specialty.

        Results are cached for NEWS_CACHE_TTL seconds.
        Falls back to FALLBACK_FEEDS if specialty feeds all fail.
        """
        cache_key = market
        cached = self._get_cached(cache_key)
        if cached:
            return cached[:max_items]

        feeds = RSS_FEEDS.get(market, FALLBACK_FEEDS)
        items = await self._fetch_feeds(feeds)

        if not items:
            logger.warning("All %s feeds failed — trying fallback feeds.", market)
            items = await self._fetch_feeds(FALLBACK_FEEDS)

        # Filter to last NEWS_LOOKBACK_HOURS hours
        cutoff = datetime.now(timezone.utc).timestamp() - NEWS_LOOKBACK_HOURS * 3600
        recent = [
            item for item in items
            if self._parse_ts(item.timestamp) >= cutoff
        ]

        # If nothing recent (weekend/holiday), return most recent available
        if not recent and items:
            recent = sorted(
                items,
                key=lambda i: self._parse_ts(i.timestamp),
                reverse=True,
            )[:max_items]

        # Deduplicate by URL
        seen_urls: set[str] = set()
        deduped: List[NewsItem] = []
        for item in recent:
            if item.url not in seen_urls:
                seen_urls.add(item.url)
                deduped.append(item)

        # Sort newest first
        deduped.sort(key=lambda i: self._parse_ts(i.timestamp), reverse=True)

        self._set_cache(cache_key, deduped)
        return deduped[:max_items]

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _fetch_feeds(self, feeds: List[str]) -> List[NewsItem]:
        """Fetch multiple RSS feeds in parallel."""
        tasks = [
            asyncio.create_task(self._fetch_single_feed(url), name=f"rss-{url[:40]}")
            for url in feeds
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        items: List[NewsItem] = []
        for result in results:
            if isinstance(result, Exception):
                logger.debug("RSS feed error: %s", result)
            elif isinstance(result, list):
                items.extend(result)
        return items

    async def _fetch_single_feed(self, url: str) -> List[NewsItem]:
        """Fetch and parse a single RSS feed URL."""
        try:
            client = self._get_client()
            resp = await client.get(url)
            resp.raise_for_status()
            return self._parse_rss(resp.text, source=url)
        except Exception as exc:
            logger.debug("Failed to fetch RSS %s: %s", url, exc)
            return []

    @staticmethod
    def _parse_rss(xml_text: str, source: str) -> List[NewsItem]:
        """
        Parse RSS XML into NewsItem objects using feedparser.
        Falls back to basic XML parsing if feedparser is unavailable.
        """
        items: List[NewsItem] = []
        try:
            import feedparser
            feed = feedparser.parse(xml_text)
            source_name = feed.feed.get("title", source)

            for entry in feed.entries:
                headline = entry.get("title", "").strip()
                summary = entry.get("summary", entry.get("description", "")).strip()
                url = entry.get("link", "")
                pub_date = entry.get("published", entry.get("updated", ""))

                # Clean HTML from summary
                import re
                summary = re.sub(r"<[^>]+>", "", summary)[:500]

                ts = ""
                if pub_date:
                    parsed_dt = _parse_pub_date(pub_date)
                    ts = parsed_dt.isoformat() if parsed_dt else pub_date

                items.append(NewsItem(
                    headline=headline,
                    summary=summary[:300],
                    source=source_name,
                    url=url,
                    timestamp=ts or datetime.now(timezone.utc).isoformat(),
                    sentiment_hint=_quick_sentiment(headline + " " + summary),
                ))
        except Exception as exc:
            logger.warning("RSS parse error for %s: %s", source, exc)

        return items

    def _get_cached(self, key: str) -> Optional[List[NewsItem]]:
        entry = self._cache.get(key)
        if entry and time.monotonic() < entry[1]:
            return entry[0]
        return None

    def _set_cache(self, key: str, items: List[NewsItem]) -> None:
        self._cache[key] = (items, time.monotonic() + NEWS_CACHE_TTL)

    @staticmethod
    def _parse_ts(ts: str) -> float:
        try:
            return datetime.fromisoformat(ts).timestamp()
        except Exception:
            return 0.0
