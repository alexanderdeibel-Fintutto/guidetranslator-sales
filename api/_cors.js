// Shared CORS helper for API routes
// Allows same-origin requests + configured APP_URL + Vercel preview URLs

export function setCorsHeaders(req, res) {
  const origin = req.headers.origin || "";
  const appUrl = process.env.APP_URL || "https://sales.guidetranslator.com";
  const appOrigin = new URL(appUrl).origin;

  const allowed =
    origin === appOrigin ||
    origin.endsWith(".vercel.app") ||
    origin === "http://localhost:5173" ||
    origin === "http://localhost:3000";

  res.setHeader("Access-Control-Allow-Origin", allowed ? origin : appOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Vary", "Origin");
}
