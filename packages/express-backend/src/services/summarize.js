/**
 * Generates a complete AI-written news article from clean source article text.
 * Falls back to a longer cleaned article excerpt if the API call fails.
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

function paragraphize(sentences, sentencesPerParagraph = 2) {
  const paragraphs = [];
  for (let i = 0; i < sentences.length; i += sentencesPerParagraph) {
    const paragraph = sentences.slice(i, i + sentencesPerParagraph).join(" ").trim();
    if (paragraph) paragraphs.push(paragraph);
  }
  return paragraphs.join("\n\n");
}

function fallbackArticle(text) {
  const value = cleanText(text);
  if (!value) return "";
  const sentences = value
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.split(/\s+/).length >= 8)
    .slice(0, 12);

  if (sentences.length >= 4) return paragraphize(sentences, 2);

  const words = value.split(/\s+/).slice(0, 550);
  const paragraphs = [];
  for (let i = 0; i < words.length; i += 90) {
    const paragraph = words.slice(i, i + 90).join(" ").trim();
    if (paragraph.split(/\s+/).length >= 25) paragraphs.push(paragraph);
  }
  return paragraphs.join("\n\n");
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
- Write 6-10 short paragraphs, at least 300 words when the source material supports it.
- Start with the most important development, then explain key details, context, impact, and what may happen next.
- Use professional news style and plain text only.
- Do not use markdown, bullets, labels, or headings. Separate paragraphs with blank lines.
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
        max_tokens: 1800,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn("[summarize] Anthropic API error:", res.status, err);
      return fallbackArticle(text);
    }

    const data = await res.json();
    return cleanArticleOutput(data.content?.[0]?.text ?? "") || fallbackArticle(text);
  } catch (err) {
    console.warn("[summarize] fetch failed:", err.message);
    return fallbackArticle(text);
  }
}
