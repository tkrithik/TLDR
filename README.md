# TLDR — AI News Aggregator

AI-curated news, summarized. Built with React, Express, MongoDB, and Claude AI.

## Features

- **Real-time scraping** of any RSS feed or news website
- **AI summaries** via Claude (Anthropic API) — 2-4 sentence summaries per article
- **Video support** — embeds YouTube and native video found in articles  
- **Category detection** — auto-classifies articles (Technology, Sports, Politics, etc.)
- **User accounts** — email + password registration/login with JWT sessions
- **Bookmarks** — save articles to your account
- **Search & filter** — search by keyword, filter by category or video-only
- **Deduplication** — SHA-256 content hashing prevents duplicate articles
- **Scheduled scraping** — configurable cron job (default: hourly)
- **Dark/light mode** — persisted per user

## Project Structure

```
packages/
  express-backend/   — Node.js + Express + MongoDB API
  react-frontend/    — React + Vite SPA
```

## Quick Start (Local)

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### Backend

```bash
cd packages/express-backend
cp .env.example .env
# Edit .env — set MONGO_URI and JWT_SECRET at minimum
npm install
npm run dev        # starts on port 8000
```

### Frontend

```bash
cd packages/react-frontend
cp .env.example .env
# VITE_API_URL is empty by default — Vite proxies /api → localhost:8000
npm install
npm run dev        # starts on port 5173
```

Open http://localhost:5173

### Adding sources

1. Go to **Sources** in the nav
2. Add an RSS feed URL (e.g. `https://feeds.bbci.co.uk/news/rss.xml`) or a news homepage
3. Go to **Feed** → click **⟳ Refresh** to trigger a manual scrape (requires sign-in)
4. Articles appear in the feed with AI summaries

## Deployment

### Backend → Vercel (Serverless)

The `api/index.js` entry point is already set up for Vercel serverless.

```bash
cd packages/express-backend
vercel --prod
```

Set these environment variables in the Vercel dashboard:
- `MONGO_URI` — MongoDB Atlas connection string
- `JWT_SECRET` — long random string
- `FRONTEND_URL` — your frontend Vercel URL (for CORS)
- `ANTHROPIC_API_KEY` — from https://console.anthropic.com (optional but recommended)
- `SCRAPE_CRON` — cron pattern, default `0 * * * *`

### Frontend → Vercel

```bash
cd packages/react-frontend
# Set VITE_API_URL in .env or Vercel env vars:
# VITE_API_URL=https://your-backend.vercel.app
vercel --prod
```

### Enabling the scheduler on Vercel

Vercel serverless functions don't run cron jobs natively. Options:
1. **Vercel Cron** (Pro plan) — add to `vercel.json`:
   ```json
   { "crons": [{ "path": "/api/scrape/run", "schedule": "0 * * * *" }] }
   ```
2. **External cron** — use cron-job.org or GitHub Actions to POST to `/api/scrape/run`
3. **Self-hosted** — deploy backend to Railway/Render where the scheduler runs continuously

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | Secret for JWT signing (use a long random string) |
| `PORT` | — | Server port (default: 8000) |
| `FRONTEND_URL` | — | Frontend origin for CORS |
| `CORS_ORIGINS` | — | Comma-separated allowed origins |
| `ANTHROPIC_API_KEY` | — | Claude API key for AI summaries |
| `MAX_ITEMS_PER_SOURCE` | — | Max articles per scrape per source (default: 15) |
| `MIN_BODY_CHARS_FOR_SUMMARY` | — | Min article length before summarizing (default: 250) |
| `SCRAPER_REQUEST_TIMEOUT_MS` | — | Scraper HTTP timeout (default: 15000) |
| `SCRAPE_CRON` | — | Cron pattern for auto-scrape (default: `0 * * * *`) |

## RSS Feed Examples

Add these in Sources to get started:

```
BBC News       https://feeds.bbci.co.uk/news/rss.xml
TechCrunch     https://techcrunch.com/feed/
The Verge      https://www.theverge.com/rss/index.xml
Reuters        https://feeds.reuters.com/reuters/topNews
AP News        https://rsshub.app/apnews/topics/apf-topnews
Hacker News    https://hnrss.org/frontpage
NPR News       https://feeds.npr.org/1001/rss.xml
ESPN           https://www.espn.com/espn/rss/news
```
