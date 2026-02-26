// Vercel Serverless Function — creates a Stripe Checkout Session
// Environment variables needed:
//   STRIPE_SECRET_KEY  — from Stripe Dashboard (sk_live_xxx or sk_test_xxx)
//   APP_URL            — e.g. "https://sales.guidetranslator.com"

import { setCorsHeaders } from "./_cors.js";
import { applyRateLimit } from "./_ratelimit.js";

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (applyRateLimit(req, res, { endpoint: "checkout", limit: 10, windowMs: 60_000 })) return;

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return res.status(500).json({ error: "STRIPE_SECRET_KEY not configured" });

  const { priceId, customerEmail, metadata, mode, segment } = req.body;
  if (!priceId) return res.status(400).json({ error: "Missing priceId" });

  // mode: "subscription" (default) or "payment" (for one-time add-ons)
  const checkoutMode = mode === "payment" ? "payment" : "subscription";
  const appUrl = process.env.APP_URL || "https://sales.guidetranslator.com";

  // Build segment-aware redirect URLs
  const seg = segment || "kreuzfahrt";
  const successUrl = `${appUrl}/${seg}/offer?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${appUrl}/${seg}/pricing?checkout=cancelled`;

  try {
    // Create Checkout Session via Stripe API directly (no SDK needed)
    const params = new URLSearchParams();
    params.append("mode", checkoutMode);
    params.append("success_url", successUrl);
    params.append("cancel_url", cancelUrl);
    params.append("line_items[0][price]", priceId);
    params.append("line_items[0][quantity]", "1");
    params.append("allow_promotion_codes", "true");
    params.append("billing_address_collection", "required");
    params.append("tax_id_collection[enabled]", "true");

    if (customerEmail) {
      params.append("customer_email", customerEmail);
    }

    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        params.append(`metadata[${key}]`, String(value));
      });
    }

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const session = await response.json();

    if (!response.ok) {
      console.error("Stripe error:", session);
      return res.status(response.status).json({
        error: session.error?.message || "Stripe checkout creation failed",
      });
    }

    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("Checkout error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
