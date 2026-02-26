// Vercel Serverless Function — creates a Stripe Customer Portal session
// Allows customers to manage their subscription (upgrade, cancel, update payment)
// Environment variables: STRIPE_SECRET_KEY, APP_URL

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return res.status(500).json({ error: "STRIPE_SECRET_KEY not configured" });

  const { customerId } = req.body;
  if (!customerId) return res.status(400).json({ error: "Missing customerId" });

  const appUrl = process.env.APP_URL || "https://sales.guidetranslator.com";

  try {
    const params = new URLSearchParams();
    params.append("customer", customerId);
    params.append("return_url", `${appUrl}/dashboard`);

    const response = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const session = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: session.error?.message || "Portal creation failed",
      });
    }

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Portal error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
