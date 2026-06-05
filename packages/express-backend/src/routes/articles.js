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

function storyTokens(...parts) {
  return parts
    .map((part) => String(part || ""))
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4 && !STOP_WORDS.has(token))
    .slice(0, 30);
}

function articleTokens(article) {
  return storyTokens(article.title, article.summary);
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

function sourceKey(article) {
  return article.sourceId?._id?.toString?.() || article.sourceId?.toString?.() || article.url;
}

function samePublishedDay(a, b) {
  const da = new Date(a.publishedAt || a.scrapedAt || a.createdAt);
  const db = new Date(b.publishedAt || b.scrapedAt || b.createdAt);
  if (Number.isNaN(da.valueOf()) || Number.isNaN(db.valueOf())) return true;
  return Math.abs(da.getTime() - db.getTime()) <= (Number(process.env.STORY_GROUP_WINDOW_HOURS ?? 168) * 60 * 60 * 1000);
}

function areSameStory(article, group) {
  if (!samePublishedDay(article, group.primary)) return false;

  const tokens = articleTokens(article);
  const score = jaccard(tokens, group.tokens);
  const tokenSet = new Set(tokens);
  const shared = group.tokens.filter((token) => tokenSet.has(token));

  // Be intentionally more aggressive than exact-title dedupe: different outlets often
  // describe the same event with different headlines. Two shared meaningful words or
  // a modest Jaccard score is enough to create a multi-source story cluster.
  if (score >= 0.18) return true;
  if (shared.length >= 2) return true;

  return false;
}

function makeStoryId(articles) {
  return `story_${articles.map((article) => article._id.toString()).sort().join("_")}`;
}

function splitStoryId(id) {
  if (!String(id).startsWith("story_")) return [];
  return String(id).slice(6).split("_").filter((part) => mongoose.isValidObjectId(part));
}

function hostFromUrl(value) {
  try {
    const host = new URL(value).hostname.replace(/^www\./, "");
    return host || "";
  } catch {
    return "";
  }
}

function prettifyHost(host) {
  const clean = String(host || "").replace(/^www\./, "");
  const known = {
    "cnn.com": "CNN",
    "nytimes.com": "New York Times",
    "washingtonpost.com": "Washington Post",
    "reuters.com": "Reuters",
    "apnews.com": "AP News",
    "nbcnews.com": "NBC News",
    "cbsnews.com": "CBS News",
    "abcnews.go.com": "ABC News",
    "foxnews.com": "Fox News",
    "bbc.com": "BBC",
    "bbc.co.uk": "BBC",
    "theguardian.com": "The Guardian",
    "npr.org": "NPR",
    "politico.com": "Politico",
    "axios.com": "Axios",
    "thehill.com": "The Hill",
  };
  if (known[clean]) return known[clean];
  const parts = clean.split(".").filter(Boolean);
  const base = parts.length >= 2 ? parts[parts.length - 2] : clean;
  return base
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") || "Source";
}

function sourceName(article) {
  const populatedName = typeof article.sourceId === "object" ? article.sourceId?.name : "";
  const rawName = article.sourceName || populatedName || "";
  const badNames = /^(source|sources?|no sources?|unknown|untitled)$/i;
  if (rawName && !badNames.test(String(rawName).trim())) return String(rawName).trim();
  return prettifyHost(hostFromUrl(article.url || article.sourceId?.url));
}

function sourceUrl(article) {
  return (typeof article.sourceId === "object" && article.sourceId?.url) || article.sourceUrl || article.url;
}

function uniqueSourceList(articles) {
  const seen = new Set();
  const sources = [];
  for (const article of articles) {
    const name = sourceName(article);
    const url = sourceUrl(article);
    const key = `${name.toLowerCase()}|${hostFromUrl(url)}`;
    if (!name || seen.has(key)) continue;
    seen.add(key);
    sources.push({ name, url, articleUrl: article.url });
  }
  return sources;
}

const BAD_TITLE_PATTERNS = [
  /^skip (advertisement|to (site index|content|main content|navigation))$/i,
  /^(advertisement|site index|skip to content|skip to main content|skip navigation)$/i,
  /^(home|latest news|breaking news|news alerts?|top stories|watch live|live updates)$/i,
  /^(subscribe|sign up|log in|login|menu|search|share|follow us)$/i,
  /^\s*(news|video|photos?)\s*$/i,
];

function hasUsefulTitle(value) {
  const title = String(value || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  if (title.length < 15 || title.length > 220) return false;
  if (BAD_TITLE_PATTERNS.some((pattern) => pattern.test(title))) return false;
  const words = title.split(/\s+/).filter(Boolean);
  if (words.length < 3) return false;
  const navWords = words.filter((word) => /^(skip|advertisement|site|index|content|home|menu|search|subscribe|login|share)$/i.test(word)).length;
  return navWords / words.length <= 0.45;
}

const SUMMARY_NON_NEWS_PATTERNS = [
  /news alerts? there are no new alerts at this time/i,
  /highlights of .* in-depth, investigative, and interactive reporting/i,
  /top stories on .* culture and politics/i,
  /top trending stories to stay in the know/i,
  /there are no new alerts/i,
  /manage alerts|breaking news alerts|email newsletters/i,
];

const SUMMARY_BOILERPLATE_PATTERNS = [
  /©\s*\d{4}/i,
  /all rights reserved/i,
  /warner bros\. discovery company/i,
  /cnn sans/i,
  /scan the qr code/i,
  /download the .* app/i,
  /google play|apple store/i,
  /unlock your personalized feed/i,
  /email updates on topics you follow/i,
  /^show all$/i,
  /^view the latest news and videos/i,
  /^everything you need to know about/i,
  /cookies?|privacy policy|terms of service/i,
  /subscribe|sign up|log in|newsletter/i,
  /advertisement/i,
];

function hasUsefulSummary(value) {
  const text = String(value || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  if (text.length < 650) return false;
  if (SUMMARY_NON_NEWS_PATTERNS.some((pattern) => pattern.test(text))) return false;
  if (SUMMARY_BOILERPLATE_PATTERNS.some((pattern) => pattern.test(text))) return false;
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const uniqueWords = new Set(words.filter((word) => word.length >= 4));
  const sentenceCount = text.split(/(?<=[.!?])\s+/).filter((sentence) => sentence.split(/\s+/).length >= 8).length;
  return words.length >= 120 && uniqueWords.size >= 70 && sentenceCount >= 5;
}

function cleanSummaryText(value) {
  const seen = new Set();
  const sentences = String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 30)
    .filter((sentence) => !SUMMARY_NON_NEWS_PATTERNS.some((pattern) => pattern.test(sentence)))
    .filter((sentence) => !SUMMARY_BOILERPLATE_PATTERNS.some((pattern) => pattern.test(sentence)))
    .filter((sentence) => {
      const key = sentence.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return sentences.join(" ").trim();
}

function trimSummary(value, maxLength = 420) {
  const text = cleanSummaryText(value);
  if (text.length <= maxLength) return text;
  const clipped = text.slice(0, maxLength);
  const cutAt = Math.max(clipped.lastIndexOf("."), clipped.lastIndexOf(" "));
  return clipped.slice(0, cutAt > 120 ? cutAt : maxLength).trim() + "…";
}

function splitParagraphs(value) {
  const text = cleanSummaryText(value);
  if (!text) return [];
  const explicit = text.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  if (explicit.length >= 3) return explicit;
  const sentences = text.split(/(?<=[.!?])\s+/).map((part) => part.trim()).filter(Boolean);
  const paragraphs = [];
  for (let i = 0; i < sentences.length; i += 2) {
    paragraphs.push(sentences.slice(i, i + 2).join(" "));
  }
  return paragraphs.filter((para) => para.split(/\s+/).length >= 12);
}

function sentenceKey(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").split(/\s+/).filter((word) => word.length >= 5).slice(0, 18).join(" ");
}

function combinedSummary(articles) {
  const paragraphs = [];
  const seen = new Set();

  for (const article of articles) {
    for (const para of splitParagraphs(article.summary)) {
      if (SUMMARY_BOILERPLATE_PATTERNS.some((pattern) => pattern.test(para))) continue;
      const key = sentenceKey(para);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      paragraphs.push(para);
      if (paragraphs.length >= 9) break;
    }
    if (paragraphs.length >= 9) break;
  }

  const articleText = paragraphs.join("\n\n").trim();
  if (articleText.split(/\s+/).length >= 180) return articleText;

  return cleanSummaryText(articles.map((article) => article.summary).join(" "));
}

function makeBlurb(value, maxLength = 260) {
  const text = cleanSummaryText(value).replace(/\n+/g, " ");
  if (text.length <= maxLength) return text;
  const clipped = text.slice(0, maxLength);
  const cutAt = Math.max(clipped.lastIndexOf("."), clipped.lastIndexOf(" "));
  return clipped.slice(0, cutAt > 120 ? cutAt : maxLength).trim() + "…";
}

function toStory(group) {
  const articles = group.articles;
  const primary = articles[0];
  const allSources = uniqueSourceList(articles);
  const withVideo = articles.find((article) => article.videoEmbed || article.videoUrl);
  const withImage = articles.find((article) => article.imageUrl);

  return {
    ...primary,
    _id: makeStoryId(articles),
    isCombinedStory: articles.length > 1,
    sourceCount: allSources.length || 1,
    relatedArticleIds: articles.map((article) => article._id.toString()),
    relatedSources: allSources,
    title: primary.title,
    url: primary.url,
    summary: combinedSummary(articles),
    blurb: makeBlurb(combinedSummary(articles)),
    imageUrl: withImage?.imageUrl || primary.imageUrl || "",
    videoUrl: withVideo?.videoUrl || primary.videoUrl || "",
    videoEmbed: withVideo?.videoEmbed || primary.videoEmbed || "",
    sourceId: articles.length > 1
      ? { name: allSources.map((source) => source.name).slice(0, 3).join(" • "), url: sourceUrl(primary) || "" }
      : { name: sourceName(primary), url: sourceUrl(primary) },
  };
}

function groupArticles(articles) {
  const groups = [];
  for (const article of articles) {
    if (!hasUsefulTitle(article.title) || !hasUsefulSummary(article.summary)) continue;
    const match = groups.find((group) => areSameStory(article, group));
    if (match) {
      match.articles.push(article);
      match.tokens = [...new Set([...match.tokens, ...articleTokens(article)])];
    } else {
      groups.push({ primary: article, tokens: articleTokens(article), articles: [article] });
    }
  }

  // Only call it a combined story when it actually contains multiple source names.
  // Single-source clusters stay as normal article cards.
  return groups.map((group) => {
    const uniqueSources = new Set(group.articles.map(sourceKey));
    if (uniqueSources.size < 2) {
      return group.articles.map((article) => toStory({ articles: [article] }));
    }
    return [toStory(group)];
  }).flat();
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
    } else {
      query.summary = { $exists: true, $nin: ["", null] };
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

    const groupedItems = groupArticles(rawItems).filter((item) => hasUsefulSummary(item.summary));
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
      const usefulDocs = docs.filter((article) => hasUsefulTitle(article.title) && hasUsefulSummary(article.summary));
      if (usefulDocs.length === 0) return res.status(404).json({ error: "Story not found" });
      return res.json(toStory({ articles: usefulDocs }));
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const doc = await Article.findById(req.params.id)
      .populate("sourceId", "name url")
      .lean();
    if (!doc || !hasUsefulTitle(doc.title) || !hasUsefulSummary(doc.summary)) return res.status(404).json({ error: "Article not found" });

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
