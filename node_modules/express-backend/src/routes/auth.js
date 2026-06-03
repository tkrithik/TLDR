import { Router } from "express";
import { loginWithEmail, loginWithPassword, register } from "../services/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { User } from "../models/User.js";

export const authRouter = Router();

// Register
authRouter.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body ?? {};
    if (!email) return res.status(400).json({ error: "Email is required" });
    if (!password) return res.status(400).json({ error: "Password is required" });
    const result = await register(email, password, name ?? "");
    res.status(201).json(result);
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error("POST /api/auth/register", err);
    res.status(status).json({ error: err.message || "Registration failed" });
  }
});

// Login with email + password
authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email) return res.status(400).json({ error: "Email is required" });
    // Support both password-based and magic-link
    const result = password
      ? await loginWithPassword(email, password)
      : await loginWithEmail(email);
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error("POST /api/auth/login", err);
    res.status(status).json({ error: err.message || "Login failed" });
  }
});

// Current user
authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Update preferences / name
authRouter.patch("/me", requireAuth, async (req, res) => {
  try {
    const { name, preferredCategories } = req.body ?? {};
    const updates = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (Array.isArray(preferredCategories)) updates.preferredCategories = preferredCategories;
    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).lean();
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name || "",
        bookmarks: (user.bookmarks ?? []).map(String),
        preferredCategories: user.preferredCategories ?? [],
      },
    });
  } catch (err) {
    console.error("PATCH /api/auth/me", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// Bookmarks
authRouter.post("/bookmarks/:articleId", requireAuth, async (req, res) => {
  try {
    const { articleId } = req.params;
    await User.findByIdAndUpdate(req.user.id, { $addToSet: { bookmarks: articleId } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to add bookmark" });
  }
});

authRouter.delete("/bookmarks/:articleId", requireAuth, async (req, res) => {
  try {
    const { articleId } = req.params;
    await User.findByIdAndUpdate(req.user.id, { $pull: { bookmarks: articleId } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to remove bookmark" });
  }
});
