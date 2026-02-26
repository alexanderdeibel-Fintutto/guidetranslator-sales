// Vercel Serverless Function — sends email verification code
// Environment variables: SUPABASE_URL, SUPABASE_SERVICE_KEY, RESEND_API_KEY, EMAIL_FROM

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

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (applyRateLimit(req, res, { endpoint: "verification", limit: 5, windowMs: 300_000 })) return;

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Missing email" });

  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(500).json({ error: "Database not configured" });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return res.status(500).json({ error: "Email service not configured" });

  const code = generateCode();
  const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

  try {
    // Upsert lead with verification code
    await supabase
      .from("gt_leads")
      .upsert({
        email,
        verification_code: code,
        verification_code_expires: expires,
        email_verified: false,
        source: "sales_calculator",
        last_activity: new Date().toISOString(),
      }, { onConflict: "email", ignoreDuplicates: false })
      .select();

    // Send verification email via Resend
    const from = process.env.EMAIL_FROM || "GuideTranslator <onboarding@resend.dev>";

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a1628;font-family:'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a1628;padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
        <tr><td style="text-align:center;padding:24px 0 32px">
          <div style="display:inline-block;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#c8a84e,#a08030);text-align:center;line-height:52px;font-weight:700;font-size:18px;color:#0a1628;font-family:Georgia,serif">GT</div>
          <div style="color:#f0f2f5;font-family:Georgia,serif;font-size:20px;font-weight:600;margin-top:12px">GuideTranslator</div>
        </td></tr>
        <tr><td style="background:#132038;border-radius:16px;padding:32px 28px;border:1px solid #1a2d4a;text-align:center">
          <div style="color:#f0f2f5;font-size:16px;margin-bottom:20px">Ihr Bestätigungscode:</div>
          <div style="font-family:monospace;font-size:36px;font-weight:700;color:#c8a84e;letter-spacing:8px;padding:16px;background:#0a1628;border-radius:12px;border:1px solid #1a2d4a;display:inline-block">${code}</div>
          <div style="color:#94a3b8;font-size:13px;margin-top:20px">Gültig für 15 Minuten. Bitte geben Sie diesen Code auf der Registrierungsseite ein.</div>
        </td></tr>
        <tr><td style="text-align:center;padding:24px 0 8px">
          <div style="color:#6b7a8d;font-size:11px;line-height:1.8">&copy; ${new Date().getFullYear()} GuideTranslator. Alle Rechte vorbehalten.
            <br><a href="mailto:enterprise@guidetranslator.com?subject=Abmeldung" style="color:#6b7a8d;text-decoration:underline">Abmelden</a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "Ihr GuideTranslator Bestätigungscode",
        html,
        text: `Ihr Bestätigungscode: ${code}\n\nGültig für 15 Minuten.`,
      }),
    });

    if (!emailRes.ok) {
      const errData = await emailRes.json();
      console.error("Resend error:", errData);
      return res.status(500).json({ error: "E-Mail konnte nicht gesendet werden" });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Verification error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
