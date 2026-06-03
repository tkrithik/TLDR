import { Router } from "express";
import { scrapeAllSources } from "../services/scraper.js";

export const scrapeRouter = Router();

async function runScrape(_req, res) {
  try {
    const result = await scrapeAllSources();
    return res.status(200).json({
      status: "completed",
      ...result,
    });
  } catch (err) {
    console.error("/api/scrape/run", err);
    return res.status(500).json({ error: "Failed to run scrape" });
  }
}

// POST is used by the frontend Refresh button.
scrapeRouter.post("/run", runScrape);

// GET is used by Vercel Cron Jobs. Vercel cron requests are GET requests.
scrapeRouter.get("/run", runScrape);
