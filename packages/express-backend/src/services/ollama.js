import { Ollama } from "ollama";

/**
 * @returns {Ollama} Configured Ollama client (host + model from env).
 */
function getClient() {
  const host = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";
  return new Ollama({ host });
}

/**
 * Produces a short summary of the given text using the configured Ollama model.
 * @param {string} text - Article body or excerpt to summarize.
 * @returns {Promise<string>} Plain-text summary.
 */
export async function summarize(text) {
  const model = process.env.OLLAMA_MODEL ?? "llama3.2";
  const client = getClient();
  const prompt = `Summarize the following news article in 2-4 concise sentences. Use plain text only, no markdown:\n\n${text.slice(0, 12000)}`;

  const response = await client.generate({
    model,
    prompt,
    stream: false,
  });

  return (response.response ?? "").trim();
}
