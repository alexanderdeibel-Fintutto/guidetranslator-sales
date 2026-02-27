// Vercel Serverless Function — One-time: Creates all Stripe products + prices
// Call: POST /api/setup-stripe with { secret: "your SEED_SECRET" }
// Returns all price IDs to enter into pricing.js

const PRODUCTS = [
  { id: "starter", name: "GuideTranslator Starter", price: 1900, description: "120 Min/Monat, 10 Sprachen, 20 Hörer" },
  { id: "pro", name: "GuideTranslator Professional", price: 4900, description: "500 Min/Monat, 30 Sprachen, 50 Hörer, 3 Sub-Accounts" },
  { id: "business", name: "GuideTranslator Business", price: 14900, description: "2.000 Min/Monat, 50 Sprachen, 200 Hörer, 15 Guide-Accounts" },
  { id: "enterprise", name: "GuideTranslator Enterprise", price: 49900, description: "10.000 Min/Monat, 130+ Sprachen, 2.000 Hörer, 50 Guide-Accounts" },
  { id: "fleet_starter", name: "GuideTranslator Fleet Starter", price: 29900, description: "Bis zu 2 Schiffe, 5.000 Min/Monat, 30 Sprachen" },
  { id: "fleet_pro", name: "GuideTranslator Fleet Professional", price: 79900, description: "Bis zu 10 Schiffe, 20.000 Min/Monat, 80 Sprachen" },
  // Add-Ons
  { id: "extra_minutes_100", name: "GT Add-On: +100 Minuten", price: 900, description: "Zusätzliche 100 Übersetzungsminuten" },
  { id: "extra_minutes_500", name: "GT Add-On: +500 Minuten", price: 3900, description: "Zusätzliche 500 Übersetzungsminuten" },
  { id: "extra_minutes_2000", name: "GT Add-On: +2.000 Minuten", price: 12900, description: "Zusätzliche 2.000 Übersetzungsminuten" },
  { id: "extra_listeners_50", name: "GT Add-On: +50 Hörer", price: 1900, description: "Zusätzliche 50 gleichzeitige Hörer" },
  { id: "extra_subaccounts_5", name: "GT Add-On: +5 Sub-Accounts", price: 2900, description: "5 zusätzliche Guide-Accounts" },
];

async function stripePost(endpoint, params, apiKey) {
  const res = await fetch(`https://api.stripe.com/v1/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params).toString(),
  });
  return res.json();
}

import { setCorsHeaders } from "./_cors.js";
import { applyRateLimit } from "./_ratelimit.js";

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (applyRateLimit(req, res, { endpoint: "setup-stripe", limit: 3, windowMs: 300_000 })) return;

  const seedSecret = process.env.SEED_SECRET;
  if (!seedSecret || req.body?.secret !== seedSecret) {
    return res.status(403).json({ error: "Invalid secret" });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return res.status(500).json({ error: "STRIPE_SECRET_KEY not configured" });

  const results = {};

  for (const prod of PRODUCTS) {
    try {
      // Create product
      const product = await stripePost("products", {
        name: prod.name,
        description: prod.description,
        "metadata[gt_tier_id]": prod.id,
      }, stripeKey);

      if (product.error) {
        results[prod.id] = { error: product.error.message };
        continue;
      }

      // Determine if subscription or one-time
      const isAddon = prod.id.startsWith("extra_");

      // Create price
      const priceParams = {
        product: product.id,
        unit_amount: String(prod.price),
        currency: "eur",
        "metadata[gt_tier_id]": prod.id,
      };

      if (isAddon) {
        // Add-ons are one-time payments
        // (no recurring)
      } else {
        // Subscriptions
        priceParams["recurring[interval]"] = "month";
      }

      const price = await stripePost("prices", priceParams, stripeKey);

      if (price.error) {
        results[prod.id] = { productId: product.id, error: price.error.message };
        continue;
      }

      results[prod.id] = {
        productId: product.id,
        priceId: price.id,
        amount: `€${(prod.price / 100).toFixed(0)}`,
        type: isAddon ? "one_time" : "recurring",
      };
    } catch (err) {
      results[prod.id] = { error: err.message };
    }
  }

  // Format as pricing.js snippet
  const snippet = Object.entries(results)
    .filter(([, v]) => v.priceId)
    .map(([id, v]) => `  ${id}: "${v.priceId}",`)
    .join("\n");

  return res.status(200).json({
    success: true,
    message: "Stripe products created! Copy the priceIds below into pricing.js",
    results,
    pricingJsSnippet: `// Paste into pricing.js stripePriceId fields:\n{\n${snippet}\n}`,
  });
}
