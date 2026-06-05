/**
 * Summarizes article text using the Anthropic Messages API.
 * Falls back to a truncated excerpt if the API call fails.
 */

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

/**
 * @param {string} text - Article body text to summarize.
 * @returns {Promise<string>} 2-4 sentence plain-text summary.
 */
export async function summarize(text) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Graceful degradation: return a truncated excerpt
    return text.slice(0, 280).trim() + (text.length > 280 ? "…" : "");
  }

  const prompt = `Summarize the following news article in exactly 2-4 concise sentences. Use plain text only, no markdown, no bullet points, no headers. Be factual and direct. Focus only on the central news event, key people/organizations, actions, consequences, and important context. Ignore boilerplate such as copyright notices, app download prompts, newsletters, navigation text, related links, ads, cookie notices, and source branding. If the input appears to contain boilerplate, do not mention it.\n\n${text.slice(0, 8000)}`;

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn("[summarize] Anthropic API error:", res.status, err);
      return text.slice(0, 280).trim() + "…";
    }

    const data = await res.json();
    return (data.content?.[0]?.text ?? "").trim() || text.slice(0, 280).trim() + "…";
  } catch (err) {
    console.warn("[summarize] fetch failed:", err.message);
    return text.slice(0, 280).trim() + (text.length > 280 ? "…" : "");
  }
}
