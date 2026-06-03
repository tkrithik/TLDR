"""
news_scraper.py
---------------
Scrape and summarize news from reputable sources.

Usage:
    # Summarize news by topic
    results = fetch_news(topic="technology", max_articles=5)

    # Fetch all hot/trending news
    results = fetch_news(all_hot=True, max_articles=10)

Dependencies:
    pip install requests feedparser newspaper3k lxml_html_clean anthropic
"""

import feedparser
import requests
import anthropic
from dataclasses import dataclass, field
from typing import Optional
from newspaper import Article

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# RSS feeds grouped by topic.
# Add or swap feeds to suit your site's editorial choices.
TOPIC_FEEDS: dict[str, list[str]] = {
    "technology": [
        "https://feeds.arstechnica.com/arstechnica/technology-lab",
        "https://www.wired.com/feed/rss",
        "https://techcrunch.com/feed/",
    ],
    "science": [
        "https://www.sciencedaily.com/rss/all.xml",
        "https://www.newscientist.com/feed/home/",
        "https://feeds.feedburner.com/NatGeoMainChannel",
    ],
    "business": [
        "https://feeds.bloomberg.com/markets/news.rss",
        "https://www.ft.com/rss/home",
        "https://feeds.reuters.com/reuters/businessNews",
    ],
    "world": [
        "https://feeds.bbci.co.uk/news/world/rss.xml",
        "https://www.aljazeera.com/xml/rss/all.xml",
        "https://feeds.reuters.com/Reuters/worldNews",
    ],
    "health": [
        "https://rss.cnn.com/rss/cnn_health.rss",
        "https://www.webmd.com/rss/rss.aspx?rss=3776",
        "https://feeds.reuters.com/reuters/healthNews",
    ],
    "politics": [
        "https://feeds.bbci.co.uk/news/politics/rss.xml",
        "https://rss.politico.com/politics-news.xml",
        "https://thehill.com/feed/",
    ],
    "sports": [
        "https://www.espn.com/espn/rss/news",
        "https://feeds.bbci.co.uk/sport/rss.xml",
        "https://api.foxsports.com/v1/rss?partnerKey=zBaFxRyJ&",
    ],
    "entertainment": [
        "https://variety.com/feed/",
        "https://deadline.com/feed/",
        "https://www.hollywoodreporter.com/feed/",
    ],
}

# "Hot news" sources — broad, high-traffic outlets
HOT_NEWS_FEEDS: list[str] = [
    "https://feeds.bbci.co.uk/news/rss.xml",
    "https://rss.cnn.com/rss/edition.rss",
    "https://feeds.reuters.com/reuters/topNews",
    "https://feeds.nbcnews.com/nbcnews/public/news",
    "https://apnews.com/rss",
]


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclass
class NewsArticle:
    title: str
    url: str
    source: str
    published: str = ""
    summary: str = ""
    full_text: str = ""
    tags: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Core helpers
# ---------------------------------------------------------------------------

def _parse_feed(feed_url: str, max_items: int = 5) -> list[dict]:
    """Return a list of raw entry dicts from an RSS/Atom feed."""
    try:
        feed = feedparser.parse(feed_url)
        entries = feed.entries[:max_items]
        source = feed.feed.get("title", feed_url)
        return [
            {
                "title": e.get("title", ""),
                "url": e.get("link", ""),
                "published": e.get("published", e.get("updated", "")),
                "source": source,
            }
            for e in entries
            if e.get("link")
        ]
    except Exception as exc:
        print(f"[WARN] Could not parse feed {feed_url}: {exc}")
        return []


def _fetch_article_text(url: str, timeout: int = 10) -> str:
    """Download and extract the main body text of an article."""
    try:
        article = Article(url)
        article.download()
        article.parse()
        return article.text.strip()
    except Exception:
        # Fallback: plain requests + first 3000 chars of body
        try:
            r = requests.get(url, timeout=timeout, headers={"User-Agent": "Mozilla/5.0"})
            r.raise_for_status()
            # Very rough extraction — good enough as a fallback
            from html.parser import HTMLParser

            class _TextExtractor(HTMLParser):
                def __init__(self):
                    super().__init__()
                    self._chunks: list[str] = []
                    self._skip = False

                def handle_starttag(self, tag, attrs):
                    if tag in ("script", "style", "nav", "footer"):
                        self._skip = True

                def handle_endtag(self, tag):
                    if tag in ("script", "style", "nav", "footer"):
                        self._skip = False

                def handle_data(self, data):
                    if not self._skip:
                        stripped = data.strip()
                        if stripped:
                            self._chunks.append(stripped)

            parser = _TextExtractor()
            parser.feed(r.text)
            return " ".join(parser._chunks)[:4000]
        except Exception:
            return ""


def _summarize_with_claude(
    title: str,
    text: str,
    client: anthropic.Anthropic,
    max_tokens: int = 200,
) -> str:
    """Call Claude to produce a concise article summary."""
    if not text:
        return "Summary unavailable — could not retrieve article text."

    prompt = (
        f"You are a news editor. Write a clear, neutral, 3–5 sentence summary "
        f"of the following article for a general audience. "
        f"Do not editorialize. Output only the summary text.\n\n"
        f"TITLE: {title}\n\n"
        f"ARTICLE:\n{text[:3000]}"
    )
    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text.strip()
    except Exception as exc:
        return f"Summary unavailable ({exc})."


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def fetch_news(
    topic: Optional[str] = None,
    all_hot: bool = False,
    max_articles: int = 10,
    summarize: bool = True,
    fetch_full_text: bool = True,
    anthropic_api_key: Optional[str] = None,
) -> list[NewsArticle]:
    """
    Fetch and optionally summarize news articles.

    Parameters
    ----------
    topic : str, optional
        One of the keys in TOPIC_FEEDS (e.g. "technology", "health").
        Ignored when all_hot=True.
    all_hot : bool
        If True, scrape hot/trending news across all top sources,
        ignoring the `topic` parameter.
    max_articles : int
        Maximum number of articles to return (default 10).
    summarize : bool
        If True, generate an AI summary for each article via Claude.
    fetch_full_text : bool
        If True, download the full article body before summarizing.
        Set to False for speed when you only need titles/URLs.
    anthropic_api_key : str, optional
        Your Anthropic API key. Falls back to the ANTHROPIC_API_KEY
        environment variable if not provided.

    Returns
    -------
    list[NewsArticle]
        Scraped (and optionally summarized) articles.

    Examples
    --------
    >>> articles = fetch_news(topic="technology", max_articles=5)
    >>> articles = fetch_news(all_hot=True, max_articles=8)
    >>> articles = fetch_news(topic="health", summarize=False)
    """
    if not all_hot and not topic:
        raise ValueError("Provide either a `topic` or set `all_hot=True`.")

    if all_hot:
        feed_urls = HOT_NEWS_FEEDS
    else:
        topic_key = topic.lower().strip()
        if topic_key not in TOPIC_FEEDS:
            available = ", ".join(sorted(TOPIC_FEEDS.keys()))
            raise ValueError(
                f"Unknown topic '{topic}'. Available topics: {available}"
            )
        feed_urls = TOPIC_FEEDS[topic_key]

    # --- Collect raw entries from RSS feeds ---
    raw_entries: list[dict] = []
    per_feed = max(1, max_articles // len(feed_urls))

    for url in feed_urls:
        raw_entries.extend(_parse_feed(url, max_items=per_feed + 2))
        if len(raw_entries) >= max_articles * 2:
            break

    # Deduplicate by URL and cap
    seen_urls: set[str] = set()
    unique_entries: list[dict] = []
    for entry in raw_entries:
        if entry["url"] not in seen_urls:
            seen_urls.add(entry["url"])
            unique_entries.append(entry)
        if len(unique_entries) >= max_articles:
            break

    # --- Build NewsArticle objects ---
    client = anthropic.Anthropic(api_key=anthropic_api_key) if summarize else None

    articles: list[NewsArticle] = []
    for entry in unique_entries:
        full_text = ""
        if fetch_full_text or summarize:
            print(f"  Fetching: {entry['title'][:60]}…")
            full_text = _fetch_article_text(entry["url"])

        summary = ""
        if summarize and client:
            summary = _summarize_with_claude(entry["title"], full_text, client)

        articles.append(
            NewsArticle(
                title=entry["title"],
                url=entry["url"],
                source=entry["source"],
                published=entry["published"],
                summary=summary,
                full_text=full_text,
            )
        )

    return articles


# ---------------------------------------------------------------------------
# Quick CLI demo
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import json

    print("=== Hot News (no summaries, fast) ===")
    hot = fetch_news(all_hot=True, max_articles=5, summarize=False, fetch_full_text=False)
    for a in hot:
        print(f"[{a.source}] {a.title}")
        print(f"  {a.url}\n")

    print("\n=== Technology — with AI summaries ===")
    tech = fetch_news(topic="technology", max_articles=3, summarize=True)
    for a in tech:
        print(f"[{a.source}] {a.title}")
        print(f"  Summary: {a.summary}\n")
