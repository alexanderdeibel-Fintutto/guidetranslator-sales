// Vercel Serverless Function — sends emails via Resend API
// Environment variables needed in Vercel:
//   RESEND_API_KEY  — from https://resend.com/api-keys
//   EMAIL_FROM      — e.g. "GuideTranslator <enterprise@guidetranslator.com>"
//                     (or "onboarding@resend.dev" for testing without domain verification)

function wrapHtml(body, { recipientName, ctaUrl, ctaLabel }) {
  const lines = body.split("\n").filter(l => l.trim());
  let htmlBody = "";

  for (const line of lines) {
    const trimmed = line.trim();
    // Detect bullet points
    if (trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*")) {
      htmlBody += `<tr><td style="padding:2px 0 2px 16px;color:#c8d6e5;font-size:15px;line-height:1.7">
        <span style="color:#c8a84e;margin-right:8px">&#9654;</span>${trimmed.replace(/^[•\-*]\s*/, "")}</td></tr>`;
    }
    // Detect links
    else if (trimmed.startsWith("http")) {
      htmlBody += `<tr><td style="padding:16px 0;text-align:center">
        <a href="${trimmed}" style="display:inline-block;background:linear-gradient(135deg,#c8a84e,#a08030);color:#0a1628;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:16px;letter-spacing:0.5px">${ctaLabel || "Zum Kalkulator"}</a>
        <br><a href="${trimmed}" style="color:#6b7a8d;font-size:12px;margin-top:8px;display:inline-block;word-break:break-all">${trimmed}</a>
      </td></tr>`;
    }
    // Greeting line
    else if (trimmed.startsWith("Sehr geehrte") || trimmed.startsWith("Liebe")) {
      htmlBody += `<tr><td style="padding:0 0 8px;color:#f0f2f5;font-size:16px;line-height:1.7">${trimmed}</td></tr>`;
    }
    // Signature block
    else if (trimmed === "Mit freundlichen Grüßen" || trimmed === "Beste Grüße") {
      htmlBody += `<tr><td style="padding:24px 0 4px;color:#c8d6e5;font-size:15px;border-top:1px solid #1a2d4a;margin-top:16px">${trimmed}</td></tr>`;
    }
    else if (trimmed.includes("@guidetranslator.com")) {
      htmlBody += `<tr><td style="padding:2px 0;color:#c8a84e;font-size:14px"><a href="mailto:${trimmed}" style="color:#c8a84e;text-decoration:none">${trimmed}</a></td></tr>`;
    }
    // Regular paragraph
    else {
      htmlBody += `<tr><td style="padding:4px 0;color:#c8d6e5;font-size:15px;line-height:1.7">${trimmed}</td></tr>`;
    }
  }

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a1628;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a1628;padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
        <!-- Header -->
        <tr><td style="text-align:center;padding:24px 0 32px">
          <div style="display:inline-block;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#c8a84e,#a08030);text-align:center;line-height:52px;font-weight:700;font-size:18px;color:#0a1628;font-family:Georgia,serif">GT</div>
          <div style="color:#f0f2f5;font-family:Georgia,serif;font-size:20px;font-weight:600;margin-top:12px">GuideTranslator</div>
          <div style="color:#6b7a8d;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin-top:4px">Enterprise</div>
        </td></tr>
        <!-- Content Card -->
        <tr><td style="background:#132038;border-radius:16px;padding:32px 28px;border:1px solid #1a2d4a">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${htmlBody}
          </table>
        </td></tr>
        <!-- Footer -->
        <tr><td style="text-align:center;padding:24px 0 8px">
          <div style="color:#6b7a8d;font-size:11px;line-height:1.8">
            GuideTranslator &mdash; KI-gest&uuml;tzte Echtzeit-&Uuml;bersetzung
            <br>&copy; ${new Date().getFullYear()} GuideTranslator. Alle Rechte vorbehalten.
            <br><a href="mailto:enterprise@guidetranslator.com?subject=Abmeldung" style="color:#6b7a8d;text-decoration:underline">Abmelden</a>
            &nbsp;&middot;&nbsp;
            <a href="${process.env.APP_URL || 'https://sales.guidetranslator.com'}/datenschutz" style="color:#6b7a8d;text-decoration:underline">Datenschutz</a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

import { setCorsHeaders } from "./_cors.js";
import { applyRateLimit } from "./_ratelimit.js";

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (applyRateLimit(req, res, { endpoint: "email", limit: 5, windowMs: 60_000 })) return;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "RESEND_API_KEY not configured" });
  }

  const { to, subject, body, replyTo, ctaLabel } = req.body;
  if (!to || !subject || !body) {
    return res.status(400).json({ error: "Missing required fields: to, subject, body" });
  }

  const from = process.env.EMAIL_FROM || "GuideTranslator <onboarding@resend.dev>";

  // Generate branded HTML version
  const html = wrapHtml(body, {
    recipientName: "",
    ctaUrl: "",
    ctaLabel: ctaLabel || "Zum Kalkulator",
  });

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        text: body,
        reply_to: replyTo || "enterprise@guidetranslator.com",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", data);
      return res.status(response.status).json({ error: data.message || "Email send failed" });
    }

    return res.status(200).json({ success: true, id: data.id });
  } catch (err) {
    console.error("Email send error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
