import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set in the environment");
  return secret;
}

export function isValidEmail(email) {
  return typeof email === "string" && EMAIL_RE.test(email.trim());
}

function makeToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email },
    getJwtSecret(),
    { expiresIn: "30d" },
  );
}

function userPayload(user) {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name || "",
    bookmarks: (user.bookmarks ?? []).map(String),
    preferredCategories: user.preferredCategories ?? [],
  };
}

/**
 * Register a new user with email + password.
 */
export async function register(email, password, name = "") {
  const normalized = email.trim().toLowerCase();
  if (!isValidEmail(normalized)) {
    const e = new Error("Invalid email address"); e.status = 400; throw e;
  }
  if (!password || password.length < 6) {
    const e = new Error("Password must be at least 6 characters"); e.status = 400; throw e;
  }
  const existing = await User.findOne({ email: normalized });
  if (existing) {
    const e = new Error("An account with this email already exists"); e.status = 409; throw e;
  }
  const { hash, salt } = User.hashPassword(password);
  const user = await User.create({
    email: normalized,
    name: name.trim(),
    passwordHash: hash,
    salt,
  });
  return { token: makeToken(user), user: userPayload(user) };
}

/**
 * Sign in with email + password.
 */
export async function loginWithPassword(email, password) {
  const normalized = email.trim().toLowerCase();
  if (!isValidEmail(normalized)) {
    const e = new Error("Invalid email address"); e.status = 400; throw e;
  }
  const user = await User.findOne({ email: normalized });
  // Magic-link accounts have no password; prompt them to set one
  if (!user || !user.passwordHash) {
    const e = new Error("No account found with this email, or account uses magic-link sign-in");
    e.status = 401; throw e;
  }
  const ok = User.verifyPassword(password, user.passwordHash, user.salt);
  if (!ok) {
    const e = new Error("Incorrect password"); e.status = 401; throw e;
  }
  return { token: makeToken(user), user: userPayload(user) };
}

/**
 * Magic-link / email-only sign-in (creates account if first time).
 */
export async function loginWithEmail(email) {
  const normalized = email.trim().toLowerCase();
  if (!isValidEmail(normalized)) {
    const e = new Error("Invalid email address"); e.status = 400; throw e;
  }
  let user = await User.findOne({ email: normalized });
  if (!user) user = await User.create({ email: normalized });
  return { token: makeToken(user), user: userPayload(user) };
}

export async function getUserFromToken(token) {
  try {
    const payload = jwt.verify(token, getJwtSecret());
    const user = await User.findById(payload.sub).lean();
    if (!user) return null;
    return userPayload(user);
  } catch {
    return null;
  }
}
