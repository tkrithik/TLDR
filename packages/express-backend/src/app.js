import express from "express";
import cors from "cors";
import { sourcesRouter } from "./routes/sources.js";
import { articlesRouter } from "./routes/articles.js";
import { scrapeRouter } from "./routes/scrape.js";
import { authRouter } from "./routes/auth.js";

/**
 * Allowed browser origins for CORS (comma-separated env or defaults).
 * @returns {string[]}
 */
function getAllowedOrigins() {
  const fromEnv = process.env.CORS_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean);
  if (fromEnv?.length) return fromEnv;
  const defaults = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    process.env.FRONTEND_URL,
    "https://react-frontend-five-phi.vercel.app",
  ].filter(Boolean);
  return [...new Set(defaults)];
}

/**
 * @returns {import("express").Express}
 */
export function createApp() {
  const app = express();
  const allowedOrigins = getAllowedOrigins();

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      credentials: true,
    }),
  );
  app.use(express.json());

  app.get("/", (_req, res) => {
    res.json({ name: "TLDR API", version: "0.1.0" });
  });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/sources", sourcesRouter);
  app.use("/api/articles", articlesRouter);
  app.use("/api/scrape", scrapeRouter);
  app.use("/api/auth", authRouter);

  return app;
}

export const app = createApp();
