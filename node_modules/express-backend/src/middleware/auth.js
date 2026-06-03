import { getUserFromToken } from "../services/auth.js";

/**
 * Optional auth: attaches req.user when a valid Bearer token is present.
 */
export async function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    req.user = await getUserFromToken(token);
  } catch {
    req.user = null;
  }
  return next();
}

/**
 * Requires a valid Bearer token.
 */
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }
  try {
    const user = await getUserFromToken(token);
    if (!user) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    req.user = user;
    return next();
  } catch (err) {
    console.error("Auth middleware error", err.message);
    return res.status(500).json({ error: "Authentication is not configured on the server" });
  }
}
