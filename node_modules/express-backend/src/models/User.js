import mongoose from "mongoose";
import crypto from "node:crypto";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: { type: String, trim: true, default: "" },
    passwordHash: { type: String, default: "" },  // empty = magic-link only
    salt: { type: String, default: "" },
    bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Article" }],
    preferredCategories: [{ type: String }],
  },
  { timestamps: true },
);

/**
 * Hash a plaintext password with PBKDF2.
 * @param {string} password
 * @param {string} salt - hex salt; generated if not provided
 * @returns {{ hash: string, salt: string }}
 */
userSchema.statics.hashPassword = function (password, salt) {
  const s = salt ?? crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, s, 100_000, 64, "sha512")
    .toString("hex");
  return { hash, salt: s };
};

/**
 * @param {string} password
 * @param {string} storedHash
 * @param {string} storedSalt
 * @returns {boolean}
 */
userSchema.statics.verifyPassword = function (password, storedHash, storedSalt) {
  const { hash } = this.hashPassword(password, storedSalt);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(storedHash, "hex"));
};

export const User = mongoose.model("User", userSchema);
