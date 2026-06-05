/**
 * Generates a complete AI-written news article from clean source article text.
 * The rest of the app stores this in the legacy `summary` field, so this module
 * must never return a one-line blurb unless the source itself is unusable.
 */

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

function cleanText(value) {
  return String(value ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function cleanArticleOutput(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitSentences(value) {
  return cleanText(value)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.split(/\s+/).length >= 8);
}

function paragraphize(sentences, sentencesPerParagraph = 2) {
  const paragraphs = [];
  for (let i = 0; i < sentences.length; i += sentencesPerParagraph) {
    const paragraph = sentences.slice(i, i + sentencesPerParagraph).join(" ").trim();
    if (paragraph.split(/\s+/).length >= 18) paragraphs.push(paragraph);
  }
  return paragraphs.join("\n\n");
}

export function isFullArticleText(value) {
  const text = cleanArticleOutput(value);
  const words = cleanText(text).split(/\s+/).filter(Boolean);
  const paragraphs = text.split(/\n{2,}/).map((p) => cleanText(p)).filter((p) => p.split(/\s+/).length >= 18);
  const sentences = splitSentences(text);
  return words.length >= 180 && paragraphs.length >= 4 && sentences.length >= 6;
}

function fallbackArticle(text) {
  const value = cleanText(text);
  if (!value) return "";

  const sentences = splitSentences(value).slice(0, 16);
  if (sentences.length >= 8) {
    const article = paragraphize(sentences, 2);
    return isFullArticleText(article) ? article : "";
  }

  const words = value.split(/\s+/).filter(Boolean).slice(0, 700);
  if (words.length < 180) return "";

  const paragraphs = [];
  for (let i = 0; i < words.length; i += 90) {
    const paragraph = words.slice(i, i + 90).join(" ").trim();
    if (paragraph.split(/\s+/).length >= 35) paragraphs.push(paragraph);
    if (paragraphs.length >= 7) break;
  }
  const article = paragraphs.join("\n\n");
  return isFullArticleText(article) ? article : "";
}

async function callAnthropic(prompt, apiKey) {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      // Sonnet follows length/structure instructions much better than Haiku here.
      model: process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest",
      max_tokens: Number(process.env.ANTHROPIC_MAX_TOKENS || 2600),
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.warn("[summarize] Anthropic API error:", res.status, err);
    return "";
  }

  const data = await res.json();
  return cleanArticleOutput(data.content?.[0]?.text ?? "");
}

function promptFor(text, retry = false) {
  return `Write a complete, neutral, publication-ready news article from the source material below.

This must be a full article, not a short summary or blurb.

Hard requirements:
- Write 6-10 short paragraphs.
- Write at least 300 words when the source material supports it.
- Every paragraph must add useful news information.
- Start with the most important development, then explain key details, context, impact, and what may happen next.
- Use professional news style and plain text only.
- Do not use markdown, bullets, labels, headings, or a title.
- Separate paragraphs with blank lines.
- Do not mention source names unless a source is a direct actor in the story.
- Do not write phrases like "CNN reports", "according to the article", "the source says", or "this article".
- Remove duplicate facts and ignore ads, newsletter copy, navigation, copyright text, QR/app prompts, alerts, and unrelated site text.
- If the material is not a real news article or does not contain enough facts for at least four useful paragraphs, return exactly: EMPTY_ARTICLE
${retry ? "\nThe previous output was too short. Expand the article with more context from the source material while staying factual.\n" : ""}
Source material:
${text.slice(0, 16000)}`;
}

/**
 * @param {string} text - Clean source article body text.
 * @returns {Promise<string>} multi-paragraph AI-written article, or empty string when source is unusable.
 */
export async function summarize(text) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const fallback = fallbackArticle(text);
  if (!apiKey) return fallback;

  try {
    let article = await callAnthropic(promptFor(text), apiKey);
    if (/^EMPTY_ARTICLE\.?$/i.test(cleanText(article))) return "";
    if (!isFullArticleText(article)) {
      article = await callAnthropic(promptFor(text, true), apiKey);
      if (/^EMPTY_ARTICLE\.?$/i.test(cleanText(article))) return "";
    }
    return isFullArticleText(article) ? article : fallback;
  } catch (err) {
    console.warn("[summarize] fetch failed:", err.message);
    return fallback;
  }
}
