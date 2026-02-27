// Simple in-memory rate limiter for Vercel Serverless Functions
// Note: Each serverless instance has its own memory, so this is per-instance.
// For production, consider Vercel KV or Upstash Redis.

const store = new Map();

const CLEANUP_INTERVAL = 60_000; // 1 minute
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now - entry.start > entry.window) store.delete(key);
  }
}

/**
 * @param {string} key - Unique identifier (e.g. IP + endpoint)
 * @param {number} limit - Max requests per window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {{ allowed: boolean, remaining: number }}
 */
export function rateLimit(key, limit = 10, windowMs = 60_000) {
  cleanup();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.start > windowMs) {
    store.set(key, { count: 1, start: now, window: windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  entry.count++;
  if (entry.count > limit) {
    return { allowed: false, remaining: 0 };
  }
  return { allowed: true, remaining: limit - entry.count };
}

/**
 * Get client IP from Vercel headers
 */
export function getClientIp(req) {
  return req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "unknown";
}

/**
 * Apply rate limiting middleware-style. Returns true if blocked.
 */
export function applyRateLimit(req, res, { endpoint, limit = 10, windowMs = 60_000 } = {}) {
  const ip = getClientIp(req);
  const key = `${ip}:${endpoint || req.url}`;
  const result = rateLimit(key, limit, windowMs);

  res.setHeader("X-RateLimit-Limit", String(limit));
  res.setHeader("X-RateLimit-Remaining", String(result.remaining));

  if (!result.allowed) {
    res.status(429).json({ error: "Zu viele Anfragen. Bitte versuchen Sie es später erneut." });
    return true;
  }
  return false;
}
