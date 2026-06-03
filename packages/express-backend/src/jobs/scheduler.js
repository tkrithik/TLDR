import cron from "node-cron";
import { scrapeAllSources } from "../services/scraper.js";

let task = null;

/**
 * Starts the cron job that calls scrapeAllSources on SCRAPE_CRON.
 * @returns {void}
 */
export function startScrapeScheduler() {
  const pattern = process.env.SCRAPE_CRON ?? "0 * * * *";

  if (!cron.validate(pattern)) {
    console.warn(`[scheduler] Invalid SCRAPE_CRON "${pattern}" — scheduler disabled`);
    return;
  }

  task = cron.schedule(pattern, async () => {
    console.log(`[scheduler] cron tick (${pattern}) — starting scrape`);
    try {
      const result = await scrapeAllSources();
      console.log("[scheduler] scrape finished", result);
    } catch (err) {
      console.error("[scheduler] scrape failed", err);
    }
  });

  console.log(`[scheduler] Registered scrape job: ${pattern}`);
}

/**
 * Stops the cron job (useful for tests or graceful shutdown).
 * @returns {void}
 */
export function stopScrapeScheduler() {
  if (task) {
    task.stop();
    task = null;
    console.log("[scheduler] Stopped scrape job");
  }
}
