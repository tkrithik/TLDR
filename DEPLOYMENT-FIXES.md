# TLDR deployment fixes

This zip includes fixes for the three production issues:

1. Auto scrape on Vercel
   - Added `GET /api/scrape/run` because Vercel Cron Jobs call GET URLs.
   - Added a Vercel cron in `packages/express-backend/vercel.json` to scrape hourly.
   - Kept `POST /api/scrape/run` for the in-app Refresh button.

2. Login
   - Login/register require MongoDB and `JWT_SECRET` environment variables.
   - Auth middleware now returns a useful server config error instead of crashing when auth env is missing.

3. Videos
   - Scraper now detects YouTube links, YouTube embeds, RSS video enclosures, `media:player`, `og:video`, and direct video URLs.
   - Article player now normalizes normal YouTube, youtu.be, embed, and Shorts URLs.

## Required Vercel environment variables

Backend project:

```txt
MONGO_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/tldr?retryWrites=true&w=majority
JWT_SECRET=generate-a-long-random-string
FRONTEND_URL=https://your-frontend.vercel.app
CORS_ORIGINS=https://your-frontend.vercel.app,http://localhost:5173
ANTHROPIC_API_KEY=optional
```

Frontend project:

```txt
VITE_API_URL=https://your-backend.vercel.app
```

After adding env vars, redeploy both Vercel projects.
