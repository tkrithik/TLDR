import { Router } from "express";
import mongoose from "mongoose";
import { Article } from "../models/Article.js";
import { optionalAuth } from "../middleware/auth.js";
import { User } from "../models/User.js";

export const articlesRouter = Router();

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "from", "that", "this", "are", "was", "were", "will", "has", "have", "had", "not", "but", "you", "your", "their", "they", "his", "her", "its", "about", "after", "before", "over", "under", "into", "than", "then", "when", "what", "who", "why", "how", "new", "news", "says", "said", "live", "video", "photos", "update", "updates", "latest",
]);

function parsePositiveInt(value, fallback) {
  const n = parseInt(String(value), 10);
  if (Number.isNaN(n) || n < 1) return fallback;
  return n;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function storyTokens(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4 && !STOP_WORDS.has(token))
    .slice(0, 12);
}

function jaccard(aTokens, bTokens) {
  const a = new Set(aTokens);
  const b = new Set(bTokens);
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  return intersection / new Set([...a, ...b]).size;
}

function areSameStory(article, group) {
  const maxAgeMs = Number(process.env.STORY_GROUP_WINDOW_HOURS ?? 72) * 60 * 60 * 1000;
  const articleTime = new Date(article.publishedAt || article.scrapedAt || article.createdAt).getTime();
  const groupTime = new Date(group.primary.publishedAt || group.primary.scrapedAt || group.primary.createdAt).getTime();
  if (Number.isFinite(articleTime) && Number.isFinite(groupTime) && Math.abs(articleTime - groupTime) > maxAgeMs) {
    return false;
  }
  if (article.category && group.primary.category && article.category !== group.primary.category) {
    return false;
  }
  const score = jaccard(storyTokens(article.title), group.tokens);
  if (score >= 0.34) return true;
  const articleTokenSet = new Set(storyTokens(article.title));
  const shared = group.tokens.filter((token) => articleTokenSet.has(token));
  return shared.length >= 3;
}

function makeStoryId(articles) {
  return `story_${articles.map((article) => article._id.toString()).sort().join("_")}`;
}

function splitStoryId(id) {
  if (!String(id).startsWith("story_")) return [];
  return String(id).slice(6).split("_").filter((part) => mongoose.isValidObjectId(part));
}

function sourceName(article) {
  return article.sourceId?.name || "Source";
}

function sourceUrl(article) {
  return article.sourceId?.url || article.url;
}

function combinedSummary(articles) {
  const pieces = articles
    .map((article) => ({ name: sourceName(article), text: String(article.summary || article.title || "").trim() }))
    .filter((item) => item.text);

  if (pieces.length <= 1) return pieces[0]?.text || "";

  const lead = `This combined story draws from ${pieces.length} sources: ${pieces.map((item) => item.name).join(", ")}.`;
  const body = pieces
    .slice(0, 5)
    .map((item) => `${item.name}: ${item.text}`)
    .join(" ");
  return `${lead} ${body}`;
}

function toStory(group) {
  const articles = group.articles;
  const primary = articles[0];
  const allSources = articles.map((article) => ({
    name: sourceName(article),
    url: sourceUrl(article),
    articleUrl: article.url,
  }));
  const withVideo = articles.find((article) => article.videoEmbed || article.videoUrl);
  const withImage = articles.find((article) => article.imageUrl);

  return {
    ...primary,
    _id: makeStoryId(articles),
    isCombinedStory: articles.length > 1,
    sourceCount: new Set(allSources.map((source) => source.name)).size,
    relatedArticleIds: articles.map((article) => article._id.toString()),
    relatedSources: allSources,
    title: primary.title,
    url: primary.url,
    summary: combinedSummary(articles),
    imageUrl: withImage?.imageUrl || primary.imageUrl || "",
    videoUrl: withVideo?.videoUrl || primary.videoUrl || "",
    videoEmbed: withVideo?.videoEmbed || primary.videoEmbed || "",
    sourceId: articles.length > 1
      ? { name: `${new Set(allSources.map((source) => source.name)).size} sources`, url: primary.sourceId?.url || "" }
      : primary.sourceId,
  };
}

function groupArticles(articles) {
  const groups = [];
  for (const article of articles) {
    const match = groups.find((group) => areSameStory(article, group));
    if (match) {
      match.articles.push(article);
      match.tokens = [...new Set([...match.tokens, ...storyTokens(article.title)])];
    } else {
      groups.push({ primary: article, tokens: storyTokens(article.title), articles: [article] });
    }
  }
  return groups.map(toStory);
}

// GET /api/articles — paginated combined story list with optional filters
articlesRouter.get("/", optionalAuth, async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit, 12), 100);

    const query = {};
    if (req.query.sourceId && mongoose.isValidObjectId(req.query.sourceId)) {
      query.sourceId = req.query.sourceId;
    }
    if (req.query.category) {
      query.category = req.query.category;
    }
    if (req.query.q) {
      const re = new RegExp(escapeRegExp(req.query.q), "i");
      query.$or = [{ title: re }, { summary: re }];
    }
    if (req.query.hasVideo === "true") {
      query.$or = [
        { videoUrl: { $ne: "" } },
        { videoEmbed: { $ne: "" } },
      ];
    }

    const rawItems = await Article.find(query)
      .sort({ publishedAt: -1, scrapedAt: -1, createdAt: -1 })
      .limit(500)
      .populate("sourceId", "name url")
      .lean();

    const groupedItems = groupArticles(rawItems);
    const total = groupedItems.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    const skip = (page - 1) * limit;
    const items = groupedItems.slice(skip, skip + limit);

    res.json({ items, total, page, pages, limit });
  } catch (err) {
    console.error("GET /api/articles", err);
    res.status(500).json({ error: "Failed to list articles" });
  }
});

// GET /api/articles/categories — distinct category list
articlesRouter.get("/categories", async (_req, res) => {
  try {
    const cats = await Article.distinct("category");
    res.json({ categories: cats.sort() });
  } catch (err) {
    res.status(500).json({ error: "Failed to list categories" });
  }
});

// GET /api/articles/:id — supports normal article ids and combined story ids
articlesRouter.get("/:id", optionalAuth, async (req, res) => {
  try {
    const storyIds = splitStoryId(req.params.id);
    if (storyIds.length > 0) {
      const docs = await Article.find({ _id: { $in: storyIds } })
        .sort({ publishedAt: -1, scrapedAt: -1, createdAt: -1 })
        .populate("sourceId", "name url")
        .lean();
      if (docs.length === 0) return res.status(404).json({ error: "Story not found" });
      return res.json(toStory({ articles: docs }));
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const doc = await Article.findById(req.params.id)
      .populate("sourceId", "name url")
      .lean();
    if (!doc) return res.status(404).json({ error: "Article not found" });

    let bookmarked = false;
    if (req.user) {
      const u = await User.findById(req.user.id).select("bookmarks").lean();
      bookmarked = (u?.bookmarks ?? []).some((b) => b.toString() === req.params.id);
    }
    return res.json({ ...doc, bookmarked });
  } catch (err) {
    console.error("GET /api/articles/:id", err);
    return res.status(500).json({ error: "Failed to get article" });
  }
});

// DELETE /api/articles/:id
articlesRouter.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const doc = await Article.findByIdAndDelete(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: "Article not found" });
    return res.status(204).send();
  } catch (err) {
    console.error("DELETE /api/articles/:id", err);
    return res.status(500).json({ error: "Failed to delete article" });
  }
});
