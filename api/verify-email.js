// Vercel Serverless Function — verifies email code
// Environment variables: SUPABASE_URL, SUPABASE_SERVICE_KEY

import { createClient } from "@supabase/supabase-js";
import { setCorsHeaders } from "./_cors.js";
import { applyRateLimit } from "./_ratelimit.js";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (applyRateLimit(req, res, { endpoint: "verify", limit: 10, windowMs: 300_000 })) return;

  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: "Missing email or code" });

  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(500).json({ error: "Database not configured" });

  try {
    const { data: lead } = await supabase
      .from("gt_leads")
      .select("verification_code, verification_code_expires")
      .eq("email", email)
      .single();

    if (!lead) {
      return res.status(404).json({ error: "E-Mail nicht gefunden" });
    }

    if (!lead.verification_code) {
      return res.status(400).json({ error: "Kein Code angefordert" });
    }

    // Check expiry
    if (new Date(lead.verification_code_expires) < new Date()) {
      return res.status(400).json({ error: "Code abgelaufen. Bitte fordern Sie einen neuen an." });
    }

    // Timing-safe comparison isn't critical here (6-digit code, rate-limited)
    if (lead.verification_code !== String(code).trim()) {
      return res.status(400).json({ error: "Ungültiger Code" });
    }

    // Mark as verified, clear code
    await supabase
      .from("gt_leads")
      .update({
        email_verified: true,
        verification_code: null,
        verification_code_expires: null,
        last_activity: new Date().toISOString(),
      })
      .eq("email", email);

    return res.status(200).json({ verified: true });
  } catch (err) {
    console.error("Verify error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
