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
  const defaults = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    process.env.FRONTEND_URL,
  ];

  const fromEnv = process.env.CORS_ORIGINS?.split(",");
  return [...new Set([...(fromEnv || []), ...defaults].map((o) => o?.trim()).filter(Boolean))];
}

/**
 * @param {string | undefined} origin
 * @param {string[]} allowedOrigins
 * @returns {boolean}
 */
function isAllowedOrigin(origin, allowedOrigins) {
  if (!origin) return true;
  if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) return true;
  return /^https:\/\/tldr-react-frontend.*\.vercel\.app$/.test(origin);
}

/**
 * @returns {import("express").Express}
 */
export function createApp() {
  const app = express();
  const allowedOrigins = getAllowedOrigins();

  const corsOptions = {
    origin(origin, callback) {
      if (isAllowedOrigin(origin, allowedOrigins)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  };

  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));
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
