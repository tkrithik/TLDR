import axios from "axios";
import * as cheerio from "cheerio";
import { Source } from "../models/Source.js";
import { ensureDefaultSources } from "./defaultSources.js";
import { Article } from "../models/Article.js";
import { hashContent, isDuplicate } from "./dedup.js";
import { summarize, isFullArticleText } from "./summarize.js";

const MAX_ITEMS_PER_SOURCE = Number(process.env.MAX_ITEMS_PER_SOURCE ?? 30);
const MIN_BODY_CHARS_FOR_SUMMARY = Number(process.env.MIN_BODY_CHARS_FOR_SUMMARY ?? 250);
const REQUEST_TIMEOUT_MS = Number(process.env.SCRAPER_REQUEST_TIMEOUT_MS ?? 15000);

// Category keywords map. Articles can belong to multiple categories; the first
// category is stored in `category` for older code, and the full set is stored in
// `categories`/`tags` for filtering.
const CATEGORY_KEYWORDS = {
  technology: ["tech", "technology", "software", "hardware", "ai", "artificial intelligence", "robot", "cyber", "data", "apple", "google", "microsoft", "openai", "startup", "app", "code", "developer", "bitcoin", "crypto", "semiconductor", "chip"],
  sports: ["sport", "sports", "nba", "wnba", "nfl", "mlb", "nhl", "soccer", "football", "baseball", "tennis", "golf", "olympic", "league", "championship", "match", "game", "player", "team", "coach"],
  politics: ["politic", "politics", "government", "election", "senate", "congress", "president", "democrat", "republican", "legislation", "vote", "lawmakers", "policy", "white house", "supreme court", "justice department", "campaign"],
  business: ["business", "economy", "economic", "stock", "market", "finance", "bank", "invest", "revenue", "profit", "earnings", "startup", "ipo", "trade", "tariff", "gdp", "inflation", "federal reserve", "fed", "company", "ceo"],
  science: ["science", "research", "study", "climate", "space", "nasa", "health", "medical", "medicine", "vaccine", "dna", "physics", "biology", "discovery", "scientists", "environment"],
  entertainment: ["movie", "film", "music", "celebrity", "oscar", "grammy", "netflix", "spotify", "album", "concert", "theater", "tv", "television", "show", "actor", "actress", "streaming"],
  world: ["world", "war", "conflict", "ukraine", "israel", "gaza", "hamas", "china", "russia", "iran", "nato", "united nations", "international", "foreign", "diplomat", "treaty", "europe", "asia", "africa", "middle east"],
};

const CATEGORY_ALIASES = {
  tech: "technology",
  technology: "technology",
  sports: "sports",
  sport: "sports",
  politics: "politics",
  political: "politics",
  business: "business",
  finance: "business",
  money: "business",
  economy: "business",
  science: "science",
  health: "science",
  entertainment: "entertainment",
  culture: "entertainment",
  arts: "entertainment",
  world: "world",
  international: "world",
  global: "world",
};

function normalizeCategory(value) {
  const raw = String(value || "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
  if (!raw) return "";
  if (CATEGORY_ALIASES[raw]) return CATEGORY_ALIASES[raw];
  for (const [alias, category] of Object.entries(CATEGORY_ALIASES)) {
    if (raw.includes(alias)) return category;
  }
  return "";
}

function guessCategories(title, body = "", explicit = []) {
  const found = new Set();
  for (const value of explicit || []) {
    const normalized = normalizeCategory(value);
    if (normalized) found.add(normalized);
  }

  const text = `${title} ${body}`.toLowerCase();
  const scored = Object.entries(CATEGORY_KEYWORDS)
    .map(([cat, keywords]) => {
      let score = 0;
      for (const kw of keywords) {
        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
        if (re.test(text)) score += kw.includes(" ") ? 2 : 1;
      }
      return [cat, score];
    })
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1]);

  for (const [cat, score] of scored) {
    if (score >= 2 || found.size === 0) found.add(cat);
    if (found.size >= 3) break;
  }

  return [...found].length > 0 ? [...found] : ["general"];
}

function guessCategory(title, body = "", explicit = []) {
  return guessCategories(title, body, explicit)[0] || "general";
}

function toAbsoluteUrl(baseUrl, maybeUrl) {
  try { return new URL(maybeUrl, baseUrl).toString(); } catch { return null; }
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(value) {
  const $ = cheerio.load(String(value ?? ""));
  return cleanText($.text());
}

const NON_ARTICLE_URL_PATTERN = /\/(?:alerts?|newsletter|newsletters|topics?|section|sections|category|categories|tag|author|authors|search|privacy|terms|about|contact|video|videos|live)(?:\/|$)|[?&](?:output|view)=|\.(?:jpg|jpeg|png|gif|webp|mp4|pdf)(?:[?#]|$)/i;


const BAD_TITLE_PATTERNS = [
  /^skip (advertisement|to (site index|content|main content|navigation))$/i,
  /^(advertisement|site index|skip to content|skip to main content|skip navigation)$/i,
  /^(home|latest news|breaking news|news alerts?|top stories|watch live|live updates)$/i,
  /^(subscribe|sign up|log in|login|menu|search|share|follow us)$/i,
  /^\s*(news|video|photos?)\s*$/i,
];

function isValidNewsTitle(title) {
  const value = cleanText(title).replace(/^[\s:|\-–—]+|[\s:|\-–—]+$/g, "");
  if (value.length < 15 || value.length > 220) return false;
  if (BAD_TITLE_PATTERNS.some((pattern) => pattern.test(value))) return false;
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length < 3) return false;
  const navWords = words.filter((word) => /^(skip|advertisement|site|index|content|home|menu|search|subscribe|login|share)$/i.test(word)).length;
  if (navWords / words.length > 0.45) return false;
  return /[a-z]/i.test(value);
}

function chooseTitle(...titles) {
  for (const title of titles) {
    const value = cleanText(title).replace(/\s+[|—-]\s+(CNN|NBC News|The New York Times|Fox News|Reuters|AP News|BBC News|NPR).*$/i, "");
    if (isValidNewsTitle(value)) return value;
  }
  return "";
}

const BOILERPLATE_PATTERNS = [
  /^(advertisement|subscribe|sign up|log in|login|share|follow us|read more|related|cookie|privacy|terms|all rights reserved)$/i,
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
  /cookies? (policy|settings|preferences)/i,
  /accept (all )?cookies/i,
  /privacy policy|terms of service/i,
  /newsletter|sign up for/i,
  /already have an account/i,
  /enable javascript/i,
];

function isLowValueText(text) {
  const value = cleanText(text);
  if (value.length < 45) return true;
  if (BOILERPLATE_PATTERNS.some((pattern) => pattern.test(value))) return true;
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length < 8) return true;
  const linkOrUiWords = words.filter((word) => /^(click|tap|menu|subscribe|login|share|follow|download|app|cookies?|privacy|terms)$/i.test(word)).length;
  return words.length > 0 && linkOrUiWords / words.length > 0.35;
}

function cleanArticleText(text) {
  const seen = new Set();
  const sentences = cleanText(text)
    .split(/(?<=[.!?])\s+|\n+/)
    .map((part) => cleanText(part))
    .filter((part) => part && !isLowValueText(part))
    .filter((part) => {
      const key = part.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return cleanText(sentences.join(" "));
}


const NON_NEWS_PATTERNS = [
  /news alerts? there are no new alerts at this time/i,
  /highlights of .* in-depth, investigative, and interactive reporting/i,
  /top stories on .* culture and politics/i,
  /top trending stories to stay in the know/i,
  /there are no new alerts/i,
  /manage alerts|breaking news alerts|email newsletters/i,
  /download the .* app|scan the qr code/i,
  /all rights reserved|privacy policy|terms of service/i,
];

function hasEnoughNewsSignals(text) {
  const value = cleanText(text);
  if (value.length < MIN_BODY_CHARS_FOR_SUMMARY) return false;
  if (NON_NEWS_PATTERNS.some((pattern) => pattern.test(value))) return false;
  const sentences = value.split(/(?<=[.!?])\s+/).filter((sentence) => sentence.split(/\s+/).length >= 9);
  if (sentences.length < 2) return false;
  const boilerplateHits = BOILERPLATE_PATTERNS.filter((pattern) => pattern.test(value)).length;
  if (boilerplateHits >= 2) return false;
  const uniqueWords = new Set(value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((word) => word.length >= 4));
  return uniqueWords.size >= 35;
}

function isValidNewsSummary(summary) {
  const value = cleanText(summary);
  // Save gate: strict enough to block nav/ad pages, loose enough not to drop all
  // articles when the model returns a concise article or fallback text is used.
  if (value.length < 80) return false;
  if (NON_NEWS_PATTERNS.some((pattern) => pattern.test(value))) return false;
  const boilerplateHits = BOILERPLATE_PATTERNS.filter((pattern) => pattern.test(value)).length;
  if (boilerplateHits >= 2) return false;
  const words = value.split(/\s+/).filter(Boolean);
  const uniqueWords = new Set(words.map((word) => word.toLowerCase().replace(/[^a-z0-9]/g, "")).filter((word) => word.length >= 4));
  const sentenceCount = value.split(/(?<=[.!?])\s+/).filter((part) => part.split(/\s+/).length >= 7).length;
  return words.length >= 20 && uniqueWords.size >= 15 && sentenceCount >= 1;
}


function isLongEnoughGeneratedArticle(summary) {
  return isFullArticleText(summary);
}

function findFirstUrl(text) {
  const match = String(text || "").match(/https?:\/\/[^\s"'<>]+/i);
  return match ? match[0] : "";
}

function findYouTubeUrl(text) {
  const match = String(text || "").match(/https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/[^\s"'<>]+/i);
  return match ? match[0] : "";
}

function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

function extractYouTubeId(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return u.pathname.split("/").filter(Boolean)[0] || null;
    if (host.endsWith("youtube.com")) {
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2] || null;
      if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] || null;
      return u.searchParams.get("v");
    }
  } catch {}
  return null;
}

function youtubeEmbedUrl(url) {
  const id = extractYouTubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : "";
}

function isVideoUrl(url) {
  return /\.(mp4|webm|ogg|mov|m3u8)(\?|$)/i.test(String(url));
}

function extractImageFromHtml($, baseUrl) {
  const og = $("meta[property='og:image']").attr("content") ||
             $("meta[name='twitter:image']").attr("content");
  if (og) return toAbsoluteUrl(baseUrl, og) || og;
  const img = $("article img, main img, .article-body img, img").first().attr("src");
  return img ? (toAbsoluteUrl(baseUrl, img) || img) : "";
}

function extractVideoFromHtml($, baseUrl) {
  const pageText = $.html() || "";

  const canonical = $("link[rel='canonical']").attr("href") || baseUrl;
  const canonicalEmbed = youtubeEmbedUrl(canonical);
  if (canonicalEmbed) return { videoUrl: "", videoEmbed: canonicalEmbed };

  // JSON-LD often contains VideoObject content even when no simple <video> tag exists.
  let jsonLdVideo = "";
  $("script[type='application/ld+json']").each((_i, el) => {
    if (jsonLdVideo) return;
    const raw = $(el).contents().text();
    try {
      const parsed = JSON.parse(raw);
      const stack = Array.isArray(parsed) ? [...parsed] : [parsed];
      while (stack.length) {
        const item = stack.shift();
        if (!item || typeof item !== "object") continue;
        const type = Array.isArray(item["@type"]) ? item["@type"].join(" ") : String(item["@type"] || "");
        if (/VideoObject/i.test(type)) {
          jsonLdVideo = item.embedUrl || item.contentUrl || item.url || "";
          break;
        }
        for (const value of Object.values(item)) {
          if (Array.isArray(value)) stack.push(...value);
          else if (value && typeof value === "object") stack.push(value);
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  });
  if (jsonLdVideo) {
    const abs = toAbsoluteUrl(baseUrl, jsonLdVideo) || jsonLdVideo;
    const embed = youtubeEmbedUrl(abs);
    return embed ? { videoUrl: "", videoEmbed: embed } : { videoUrl: abs, videoEmbed: "" };
  }

  const ogV = $("meta[property='og:video']").attr("content") ||
              $("meta[property='og:video:url']").attr("content") ||
              $("meta[property='og:video:secure_url']").attr("content") ||
              $("meta[name='twitter:player']").attr("content");
  if (ogV) {
    const abs = toAbsoluteUrl(baseUrl, ogV) || ogV;
    const embed = youtubeEmbedUrl(abs);
    return embed ? { videoUrl: "", videoEmbed: embed } : { videoUrl: abs, videoEmbed: "" };
  }

  const iframe = $("iframe[src], embed[src]").filter((_i, el) => /youtube|youtu\.be|vimeo|video|player/i.test($(el).attr("src") || "")).first().attr("src");
  if (iframe) {
    const abs = toAbsoluteUrl(baseUrl, iframe) || iframe;
    const embed = youtubeEmbedUrl(abs);
    return { videoUrl: "", videoEmbed: embed || abs };
  }

  const vid = $("video[src], video source[src]").first().attr("src");
  if (vid) {
    const abs = toAbsoluteUrl(baseUrl, vid);
    return abs ? { videoUrl: abs, videoEmbed: "" } : { videoUrl: "", videoEmbed: "" };
  }

  const yt = findYouTubeUrl(pageText);
  const ytEmbed = youtubeEmbedUrl(yt);
  if (ytEmbed) return { videoUrl: "", videoEmbed: ytEmbed };

  return { videoUrl: "", videoEmbed: "" };
}

function parseRss(url, body) {
  const $ = cheerio.load(body, { xmlMode: true });
  const items = [];
  const nodes = $("item").length > 0 ? $("item") : $("entry");
  nodes.each((_idx, el) => {
    const rssTitle = cleanText($(el).find("title").first().text());
    const title = chooseTitle(rssTitle);
    const linkTag = $(el).find("link").first();
    const linkRaw = cleanText(linkTag.attr("href") || linkTag.text());
    const description = cleanText($(el).find("description").first().text());
    const summaryText = cleanText($(el).find("summary").first().text());
    const contentEncoded = cleanText($(el).find("content\\:encoded").first().text());
    const contentText = cleanText($(el).find("content").first().text());
    const pubDateRaw =
      cleanText($(el).find("pubDate").first().text()) ||
      cleanText($(el).find("updated").first().text()) ||
      cleanText($(el).find("published").first().text());
    const rssCategories = [];
    $(el).find("category, media\:category").each((_i, catEl) => {
      const value = cleanText($(catEl).text() || $(catEl).attr("label") || $(catEl).attr("term"));
      if (value) rssCategories.push(value);
    });
    const imageRaw =
      $(el).find("media\\:thumbnail").attr("url") ||
      $(el).find("enclosure[type^='image']").attr("url") ||
      $(el).find("media\\:content[medium='image']").attr("url") || "";
    const videoRaw =
      $(el).find("enclosure[type^='video']").attr("url") ||
      $(el).find("media\\:content[medium='video']").attr("url") ||
      $(el).find("media\\:content[type^='video']").attr("url") ||
      $(el).find("media\\:player").attr("url") ||
      findYouTubeUrl(`${description} ${summaryText} ${contentEncoded}`) ||
      findFirstUrl($(el).find("link[rel='enclosure']").attr("href") || "") || "";
    const link = toAbsoluteUrl(url, linkRaw);
    if (!title || !link) return;
    if (NON_ARTICLE_URL_PATTERN.test(link)) return;
    const videoAbs = videoRaw ? (toAbsoluteUrl(url, videoRaw) || videoRaw) : "";
    items.push({
      title,
      url: link,
      body: stripHtml(contentEncoded || contentText || summaryText || description || title),
      publishedAt: parseDate(pubDateRaw),
      imageUrl: imageRaw ? (toAbsoluteUrl(url, imageRaw) || imageRaw) : "",
      videoUrl: videoAbs && isVideoUrl(videoAbs) ? videoAbs : "",
      videoEmbed: youtubeEmbedUrl(videoAbs || link || description || contentEncoded),
      tags: rssCategories,
    });
  });
  return items;
}

function parseHtml(url, body) {
  const $ = cheerio.load(body);
  const seen = new Set();
  const items = [];
  $("a[href]").each((_idx, el) => {
    if (items.length >= MAX_ITEMS_PER_SOURCE) return;
    const href = $(el).attr("href");
    const title = chooseTitle($(el).attr("aria-label"), $(el).attr("title"), $(el).text());
    const link = toAbsoluteUrl(url, href);
    if (!title || !link) return;
    if (!/^https?:\/\//i.test(link)) return;
    if (NON_ARTICLE_URL_PATTERN.test(link)) return;
    if (seen.has(link)) return;
    seen.add(link);
    items.push({ title, url: link, body: title, publishedAt: null, imageUrl: "", videoUrl: "", videoEmbed: youtubeEmbedUrl(link) });
  });
  return items;
}

async function fetchPage(url) {
  const response = await axios.get(url, {
    timeout: REQUEST_TIMEOUT_MS,
    maxRedirects: 5,
    headers: {
      "User-Agent": "TLDRBot/1.0 (+https://tldr.news)",
      Accept: "application/rss+xml, application/xml, text/xml, text/html;q=0.9, */*;q=0.8",
    },
  });
  return String(response.data ?? "");
}

function extractJsonLdArticleMeta($) {
  const meta = { title: "", body: "" };
  $("script[type='application/ld+json']").each((_i, el) => {
    if (meta.title && meta.body) return;
    const raw = $(el).contents().text();
    try {
      const parsed = JSON.parse(raw);
      const stack = Array.isArray(parsed) ? [...parsed] : [parsed];
      while (stack.length) {
        const item = stack.shift();
        if (!item || typeof item !== "object") continue;
        const type = Array.isArray(item["@type"]) ? item["@type"].join(" ") : String(item["@type"] || "");
        if (/NewsArticle|Article|BlogPosting/i.test(type)) {
          if (!meta.title) meta.title = chooseTitle(item.headline, item.name);
          if (!meta.body && item.articleBody) meta.body = cleanText(item.articleBody);
        }
        for (const value of Object.values(item)) {
          if (Array.isArray(value)) stack.push(...value);
          else if (value && typeof value === "object") stack.push(value);
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  });
  return meta;
}

function extractBestTitle($, fallbackTitle = "") {
  const jsonLd = extractJsonLdArticleMeta($);
  return chooseTitle(
    jsonLd.title,
    $("meta[property='og:title']").attr("content"),
    $("meta[name='twitter:title']").attr("content"),
    $("h1").first().text(),
    fallbackTitle,
    $("title").first().text(),
  );
}

function extractJsonLdArticleBody($) {
  return extractJsonLdArticleMeta($).body;
}

function scoreArticleContainer($, el) {
  const clone = $(el).clone();
  clone.find("script, style, noscript, nav, header, footer, aside, form, button, iframe, figure, figcaption, [aria-label*='share' i], [class*='ad' i], [id*='ad' i], [class*='promo' i], [class*='newsletter' i], [class*='related' i], [class*='comment' i], [class*='share' i], [class*='social' i], [class*='signup' i], [class*='paywall' i], [class*='breadcrumb' i], [data-testid*='ad' i], [data-testid*='share' i], [data-testid*='related' i]").remove();
  const paragraphs = clone.find("p, [data-testid*='paragraph' i]")
    .map((_i, p) => cleanText($(p).text()))
    .get()
    .filter((text) => !isLowValueText(text));
  const text = cleanArticleText(paragraphs.join(" "));
  const linkText = cleanText(clone.find("a").text()).length;
  const commaCount = (text.match(/,/g) || []).length;
  const paragraphScore = paragraphs.filter((para) => para.length >= 80).length * 140;
  const linkPenalty = text.length ? Math.min(700, Math.round((linkText / text.length) * 700)) : 700;
  const boilerplatePenalty = BOILERPLATE_PATTERNS.reduce((sum, pattern) => sum + (pattern.test(text) ? 500 : 0), 0);
  return { text, score: text.length + paragraphScore + commaCount * 10 - linkPenalty - boilerplatePenalty };
}

function extractArticleBodyFromHtml(html, baseUrl, fallbackText = "", fallbackTitle = "") {
  const $ = cheerio.load(html);
  const jsonLdBody = extractJsonLdArticleBody($);
  const title = extractBestTitle($, fallbackTitle);

  $("script, style, noscript, nav, header, footer, aside, form, button, svg, canvas, [aria-label*='share' i], [class*='ad' i], [id*='ad' i], [class*='promo' i], [class*='newsletter' i], [class*='related' i], [class*='comment' i], [class*='share' i], [class*='social' i], [class*='signup' i], [class*='paywall' i], [class*='breadcrumb' i], [data-testid*='ad' i], [data-testid*='share' i], [data-testid*='related' i]").remove();
  const selectors = [
    "article",
    "main article",
    '[role="article"]',
    '[itemprop="articleBody"]',
    '[data-testid*="article"]',
    '[class*="article-body"]',
    '[class*="articleBody"]',
    '[class*="story-body"]',
    '[class*="entry-content"]',
    '[class*="post-content"]',
    '[class*="body-content"]',
    "main",
  ];

  const candidates = [];
  const cleanedJsonLdBody = cleanArticleText(jsonLdBody);
  if (cleanedJsonLdBody.length >= 300) candidates.push({ text: cleanedJsonLdBody, score: cleanedJsonLdBody.length + 1000 });

  for (const selector of selectors) {
    $(selector).each((_idx, el) => {
      const candidate = scoreArticleContainer($, el);
      if (candidate.text.length >= 250) candidates.push(candidate);
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  let text = candidates[0]?.text || "";

  if (!text) {
    const metaDescription = $("meta[property='og:description']").attr("content") ||
      $("meta[name='description']").attr("content") ||
      $("meta[name='twitter:description']").attr("content") ||
      "";
    text = cleanArticleText(metaDescription) || cleanArticleText(fallbackText);
  }

  text = cleanArticleText(text);

  const imageUrl = extractImageFromHtml($, baseUrl);
  const { videoUrl, videoEmbed } = extractVideoFromHtml($, baseUrl);
  return { title, text: text.slice(0, 16000), imageUrl, videoUrl, videoEmbed };
}

async function enrichCandidate(candidate) {
  try {
    const articleHtml = await fetchPage(candidate.url);
    const extracted = extractArticleBodyFromHtml(articleHtml, candidate.url, candidate.body, candidate.title);
    if (extracted.text && extracted.text.length >= MIN_BODY_CHARS_FOR_SUMMARY) {
      return {
        title: extracted.title || candidate.title,
        text: extracted.text,
        imageUrl: extracted.imageUrl || candidate.imageUrl || "",
        videoUrl: extracted.videoUrl || candidate.videoUrl || "",
        videoEmbed: extracted.videoEmbed || candidate.videoEmbed || youtubeEmbedUrl(candidate.url),
      };
    }
  } catch (err) {
    console.warn(`[scraper] article extraction failed for ${candidate.url}:`, err.message);
  }

  return {
    title: candidate.title,
    text: cleanArticleText(stripHtml(candidate.body)),
    imageUrl: candidate.imageUrl || "",
    videoUrl: candidate.videoUrl || "",
    videoEmbed: candidate.videoEmbed || youtubeEmbedUrl(candidate.url),
  };
}

async function scrapeSource(source) {
  const body = await fetchPage(source.url);
  const looksLikeRss = /<rss|<feed|<rdf:RDF/i.test(body);
  const rawItems = looksLikeRss ? parseRss(source.url, body) : parseHtml(source.url, body);
  return rawItems.slice(0, MAX_ITEMS_PER_SOURCE);
}

async function saveCandidatesForSource(source, candidates) {
  let saved = 0;
  let duplicates = 0;
  let repaired = 0;

  for (const candidate of candidates) {
    const enriched = await enrichCandidate(candidate);
    const title = chooseTitle(enriched.title, candidate.title);
    if (!isValidNewsTitle(title)) {
      console.warn(`[scraper] skipped item with bad title: ${candidate.title} (${candidate.url})`);
      continue;
    }
    if (!hasEnoughNewsSignals(enriched.text)) {
      // RSS feeds from some publishers include only a short but useful description.
      // Use it as a fallback when the page itself was blocked or mostly boilerplate.
      const fallbackText = cleanArticleText(stripHtml(candidate.body || ""));
      if (hasEnoughNewsSignals(fallbackText)) {
        enriched.text = fallbackText;
      } else {
        console.warn(`[scraper] skipped non-article or boilerplate-only item: ${candidate.url}`);
        continue;
      }
    }
    const digest = hashContent(`${title}\n${enriched.text}`);

    let summary = "";
    try {
      const summaryInput = enriched.text && enriched.text.length >= MIN_BODY_CHARS_FOR_SUMMARY
        ? enriched.text
        : `${candidate.title}. ${enriched.text || candidate.body || candidate.title}`;
      summary = await summarize(summaryInput);
    } catch (err) {
      console.warn(`[scraper] summarize failed for ${candidate.url}:`, err.message);
    }

    // Only save/display articles that have a real multi-paragraph generated body.
    // RSS descriptions are fine as input to the model, but they should never be
    // stored as the user-facing article text because that is what caused one-
    // sentence summaries on the article page.
    if (!isFullArticleText(summary)) {
      console.warn(`[scraper] skipped item with missing/short generated article: ${candidate.url}`);
      continue;
    }

    const categories = guessCategories(title, `${enriched.text} ${summary}`, candidate.tags || []);
    const category = categories[0] || "general";

    const existingByUrl = await Article.findOne({ url: candidate.url }).select("_id title summary category categories tags videoUrl videoEmbed imageUrl publishedAt").lean();
    if (existingByUrl) {
      const updates = { title, category, categories, tags: categories };
      if (!isLongEnoughGeneratedArticle(existingByUrl.summary || "")) updates.summary = summary;
      if (!existingByUrl.videoUrl && enriched.videoUrl) updates.videoUrl = enriched.videoUrl;
      if (!existingByUrl.videoEmbed && enriched.videoEmbed) updates.videoEmbed = enriched.videoEmbed;
      if (!existingByUrl.imageUrl && enriched.imageUrl) updates.imageUrl = enriched.imageUrl;
      if (!existingByUrl.publishedAt && candidate.publishedAt instanceof Date && !Number.isNaN(candidate.publishedAt.valueOf())) updates.publishedAt = candidate.publishedAt;
      await Article.findByIdAndUpdate(existingByUrl._id, updates);
      repaired++;
      duplicates++;
      continue;
    }
    const existingByHash = await Article.findOne({ contentHash: digest }).select("_id title summary category categories tags videoUrl videoEmbed imageUrl publishedAt").lean();
    if (existingByHash) {
      const updates = { title, category, categories, tags: categories };
      if (!isLongEnoughGeneratedArticle(existingByHash.summary || "")) updates.summary = summary;
      if (!existingByHash.videoUrl && enriched.videoUrl) updates.videoUrl = enriched.videoUrl;
      if (!existingByHash.videoEmbed && enriched.videoEmbed) updates.videoEmbed = enriched.videoEmbed;
      if (!existingByHash.imageUrl && enriched.imageUrl) updates.imageUrl = enriched.imageUrl;
      if (!existingByHash.publishedAt && candidate.publishedAt instanceof Date && !Number.isNaN(candidate.publishedAt.valueOf())) updates.publishedAt = candidate.publishedAt;
      await Article.findByIdAndUpdate(existingByHash._id, updates);
      repaired++;
      duplicates++;
      continue;
    }

    await Article.create({
      sourceId: source._id,
      title,
      url: candidate.url,
      contentHash: digest,
      summary,
      imageUrl: enriched.imageUrl || "",
      videoUrl: enriched.videoUrl || "",
      videoEmbed: enriched.videoEmbed || "",
      category,
      categories,
      tags: categories,
      publishedAt: candidate.publishedAt instanceof Date && !Number.isNaN(candidate.publishedAt.valueOf())
        ? candidate.publishedAt : null,
      scrapedAt: new Date(),
    });
    saved++;
  }

  await Source.findByIdAndUpdate(source._id, { lastScrapedAt: new Date() });
  return { saved, duplicates, repaired };
}

export async function scrapeOneSource(source) {
  const candidates = await scrapeSource(source);
  const result = await saveCandidatesForSource(source, candidates);
  return {
    sourceId: String(source._id),
    discovered: candidates.length,
    ...result,
  };
}

/**
 * Scrapes all active sources and persists new deduplicated articles.
 */
export async function scrapeAllSources() {
  await ensureDefaultSources();
  let sources = await Source.find({ active: true }).lean();

  // If every source was accidentally toggled inactive, scrape all known sources
  // instead of returning zero and leaving the feed stuck.
  if (sources.length === 0) {
    await Source.updateMany({}, { $set: { active: true } });
    sources = await Source.find({ active: true }).lean();
  }
  let discovered = 0, saved = 0, duplicates = 0, repaired = 0, failedSources = 0;

  const CONCURRENCY = Number(process.env.SCRAPER_CONCURRENCY ?? 5);
  for (let i = 0; i < sources.length; i += CONCURRENCY) {
    const batch = sources.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(batch.map((s) => scrapeOneSource(s)));
    for (const r of results) {
      if (r.status === "fulfilled") {
        discovered += r.value.discovered;
        saved += r.value.saved;
        duplicates += r.value.duplicates;
        repaired += r.value.repaired || 0;
      } else {
        failedSources++;
        console.error(`[scraper] failed source`, r.reason?.message);
      }
    }
  }
  return { sources: sources.length, discovered, saved, duplicates, repaired, failedSources };
}
