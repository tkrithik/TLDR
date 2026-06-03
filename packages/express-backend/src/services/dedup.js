import crypto from "node:crypto";
import { Article } from "../models/Article.js";

/**
 * SHA-256 hash of normalized text for duplicate detection (Story 3).
 * @param {string} text - Raw article text.
 * @returns {string} Hex-encoded SHA-256 digest.
 */
export function hashContent(text) {
  const normalized = String(text).replace(/\s+/g, " ").trim().toLowerCase();
  return crypto.createHash("sha256").update(normalized, "utf8").digest("hex");
}

/**
 * Returns whether an article with this content hash already exists.
 * @param {string} contentHash - Output of hashContent().
 * @returns {Promise<boolean>} True if duplicate exists in DB.
 */
export async function isDuplicate(contentHash) {
  const existing = await Article.findOne({ contentHash }).select("_id").lean();
  return Boolean(existing);
}
