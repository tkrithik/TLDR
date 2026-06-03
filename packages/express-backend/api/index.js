import { app } from "../src/app.js";
import { connectDb } from "../src/db.js";

let dbReady = false;

/**
 * Vercel serverless entry — connects to MongoDB once per warm instance, then runs Express.
 * @param {import("http").IncomingMessage} req
 * @param {import("http").ServerResponse} res
 */
export default async function handler(req, res) {
  try {
    if (!dbReady) {
      await connectDb();
      dbReady = true;
    }
    return app(req, res);
  } catch (err) {
    console.error("API handler error", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Server error" });
    }
  }
}
