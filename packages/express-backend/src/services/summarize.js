/**
 * Generates a complete AI-written news article from clean source article text.
 * Falls back to a longer cleaned article excerpt if the API call fails.
 */

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

function cleanText(value) {
  return String(value ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function fallbackArticle(text) {
  const value = cleanText(text);
  if (!value) return "";
  const clipped = value.slice(0, 2200).trim();
  return clipped + (value.length > clipped.length ? "…" : "");
}

/**
 * @param {string} text - Clean article body text.
 * @returns {Promise<string>} 250-600 word plain-text synthesized article.
 */
export async function summarize(text) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fallbackArticle(text);

  const prompt = `Write a complete, neutral, publication-ready news article from the source material below.

Requirements:
- Do not call it a summary.
- Write 5-10 short paragraphs, roughly 250-600 words.
- Start with the most important development, then explain key details, context, impact, and what may happen next.
- Use professional news style and plain text only.
- Do not use markdown, bullets, labels, or headings.
- Do not mention source names unless a source is a direct actor in the story.
- Do not write phrases like "CNN reports", "according to the article", or "the source says".
- Remove duplicate facts and ignore ads, newsletter copy, navigation, copyright text, QR/app prompts, alerts, and unrelated site text.
- If the material is not a real news article, return an empty string.

Source material:
${text.slice(0, 14000)}`;

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest",
        max_tokens: 1100,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn("[summarize] Anthropic API error:", res.status, err);
      return fallbackArticle(text);
    }

    const data = await res.json();
    return cleanText(data.content?.[0]?.text ?? "") || fallbackArticle(text);
  } catch (err) {
    console.warn("[summarize] fetch failed:", err.message);
    return fallbackArticle(text);
  }
}
