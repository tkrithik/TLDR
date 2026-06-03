import mongoose from "mongoose";

/**
 * Validates that a string is an http(s) URL.
 * @param {string} value - URL string to validate.
 * @returns {boolean} True if valid http(s) URL.
 */
function isHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

const sourceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    url: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      validate: {
        validator: isHttpUrl,
        message: "url must be a valid http or https URL",
      },
    },
    active: { type: Boolean, default: true },
    lastScrapedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const Source = mongoose.model("Source", sourceSchema);
