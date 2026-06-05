import { Source } from "../models/Source.js";

export const DEFAULT_NEWS_SOURCES = [
  { name: "BBC News", url: "https://feeds.bbci.co.uk/news/rss.xml" },
  { name: "Reuters Top News", url: "https://www.reutersagency.com/feed/?best-topics=top-news&post_type=best" },
  { name: "AP News", url: "https://apnews.com/hub/ap-top-news?output=rss" },
  { name: "NPR News", url: "https://feeds.npr.org/1001/rss.xml" },
  { name: "CNN Top Stories", url: "http://rss.cnn.com/rss/cnn_topstories.rss" },
  { name: "NBC News", url: "https://feeds.nbcnews.com/nbcnews/public/news" },
  { name: "CBS News", url: "https://www.cbsnews.com/latest/rss/main" },
  { name: "ABC News", url: "https://abcnews.go.com/abcnews/topstories" },
  { name: "Politico", url: "https://www.politico.com/rss/politicopicks.xml" },
  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
  { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
  { name: "ESPN Top Headlines", url: "https://www.espn.com/espn/rss/news" },
];

function autoSeedEnabled() {
  return String(process.env.AUTO_SEED_SOURCES ?? "true").toLowerCase() !== "false";
}

/**
 * Ensures a fresh deployment/database has usable sources. This prevents the app
 * from getting stuck at "no sources" after redeploys or database resets.
 */
export async function ensureDefaultSources() {
  if (!autoSeedEnabled()) return { created: 0, total: await Source.countDocuments() };

  const total = await Source.countDocuments();
  if (total > 0) return { created: 0, total };

  const docs = await Source.insertMany(
    DEFAULT_NEWS_SOURCES.map((source) => ({ ...source, active: true })),
    { ordered: false },
  ).catch(async (err) => {
    // Duplicate key races are harmless; re-count below.
    if (err?.code !== 11000 && err?.writeErrors?.length === undefined) throw err;
    return [];
  });

  return { created: Array.isArray(docs) ? docs.length : 0, total: await Source.countDocuments() };
}
