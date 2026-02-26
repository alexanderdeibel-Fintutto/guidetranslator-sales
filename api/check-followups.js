// Vercel Serverless Function — Cron: Automatic follow-up reminders
// Triggered by Vercel Cron or manually: GET /api/check-followups?secret=xxx
//
// Logic:
// 1. Leads with offer_created_at > 7 days ago AND pipeline_stage = 'testet_spaeter'
//    → Send reminder email, set pipeline_stage = 'erinnert_zum_test'
// 2. Leads with follow_up_date in the past AND no recent email note (>= 2 days)
//    → Create a follow-up note to remind admin
//
// Environment: SUPABASE_URL, SUPABASE_SERVICE_KEY, RESEND_API_KEY, EMAIL_FROM, CRON_SECRET

import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function sendReminderEmail(lead) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { error: "No RESEND_API_KEY" };

  const from = process.env.EMAIL_FROM || "GuideTranslator <enterprise@guidetranslator.com>";
  const appUrl = process.env.APP_URL || "https://app.guidetranslator.com";

  const body = `Sehr geehrte/r ${lead.name || "Kunde/Kundin"},

vor einer Woche haben wir Ihnen ein Angebot für GuideTranslator erstellt. Wir möchten sichergehen, dass Sie die Möglichkeit hatten, die App zu testen.

Falls Sie noch nicht dazu gekommen sind — hier können Sie direkt starten:
${appUrl}

Die Testversion ist kostenlos und Sie können sofort loslegen. In nur 2 Minuten erleben Sie die Echtzeit-Übersetzung live.

Haben Sie Fragen? Wir sind gerne für Sie da.

Beste Grüße
GuideTranslator Team
enterprise@guidetranslator.com`;

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
        <tr><td style="background:#132038;border-radius:16px;padding:32px 28px;border:1px solid #1a2d4a">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:0 0 8px;color:#f0f2f5;font-size:16px">Sehr geehrte/r ${lead.name || "Kunde/Kundin"},</td></tr>
            <tr><td style="padding:8px 0;color:#c8d6e5;font-size:15px;line-height:1.7">
              Vor einer Woche haben wir Ihnen ein Angebot erstellt. Haben Sie schon die Möglichkeit gehabt, GuideTranslator zu testen?
            </td></tr>
            <tr><td style="padding:16px 0;text-align:center">
              <a href="${appUrl}" style="display:inline-block;background:linear-gradient(135deg,#c8a84e,#a08030);color:#0a1628;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:16px">Jetzt kostenlos testen</a>
            </td></tr>
            <tr><td style="padding:8px 0;color:#c8d6e5;font-size:15px;line-height:1.7">
              Die Testversion ist kostenlos — in 2 Minuten erleben Sie die Echtzeit-Übersetzung live.
            </td></tr>
            <tr><td style="padding:24px 0 4px;color:#c8d6e5;font-size:15px;border-top:1px solid #1a2d4a">Beste Grüße</td></tr>
            <tr><td style="padding:2px 0;color:#c8d6e5;font-size:15px">GuideTranslator Team</td></tr>
            <tr><td style="padding:2px 0"><a href="mailto:enterprise@guidetranslator.com" style="color:#c8a84e;font-size:14px;text-decoration:none">enterprise@guidetranslator.com</a></td></tr>
          </table>
        </td></tr>
        <tr><td style="text-align:center;padding:24px 0 8px">
          <div style="color:#6b7a8d;font-size:11px">© ${new Date().getFullYear()} GuideTranslator. Alle Rechte vorbehalten.</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from, to: [lead.email],
        subject: "Haben Sie GuideTranslator schon getestet?",
        html, text: body,
        reply_to: "enterprise@guidetranslator.com",
      }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.message };
    return { success: true, id: data.id };
  } catch (err) {
    return { error: err.message };
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Verify cron secret
  const secret = req.query?.secret || req.headers["x-cron-secret"];
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && secret !== cronSecret) {
    return res.status(403).json({ error: "Invalid cron secret" });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(500).json({ error: "DB not configured" });

  const results = { reminders_sent: 0, notes_created: 0, errors: [] };
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

  try {
    // 1. Leads who chose "later" 7+ days ago and haven't tested yet
    const { data: laterLeads } = await supabase
      .from("gt_leads")
      .select("*")
      .eq("pipeline_stage", "testet_spaeter")
      .lt("offer_created_at", sevenDaysAgo)
      .is("tested_at", null)
      .is("test_reminder_sent_at", null);

    for (const lead of (laterLeads || [])) {
      if (!lead.email) continue;

      const emailResult = await sendReminderEmail(lead);

      if (emailResult.success) {
        // Update lead
        await supabase.from("gt_leads").update({
          pipeline_stage: "erinnert_zum_test",
          test_reminder_sent_at: new Date().toISOString(),
          last_activity: new Date().toISOString(),
          follow_up_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // next follow-up in 7 days
        }).eq("id", lead.id);

        // Log note
        await supabase.from("gt_lead_notes").insert({
          lead_id: lead.id,
          text: `Automatische Test-Erinnerung gesendet (7 Tage nach Angebot)`,
          note_type: "email",
        });

        results.reminders_sent++;
      } else {
        results.errors.push({ leadId: lead.id, error: emailResult.error });
      }
    }

    // 2. Create admin reminder notes for overdue follow-ups
    const { data: overdueLeads } = await supabase
      .from("gt_leads")
      .select("id, name, company, follow_up_date")
      .lt("follow_up_date", new Date().toISOString())
      .not("pipeline_stage", "in", '("gewonnen","verloren")');

    for (const lead of (overdueLeads || [])) {
      // Check if we already created a reminder note recently
      const { data: recentNotes } = await supabase
        .from("gt_lead_notes")
        .select("id")
        .eq("lead_id", lead.id)
        .eq("note_type", "note")
        .ilike("text", "%Automatische Erinnerung%")
        .gt("created_at", twoDaysAgo)
        .limit(1);

      if (recentNotes?.length > 0) continue;

      await supabase.from("gt_lead_notes").insert({
        lead_id: lead.id,
        text: `Automatische Erinnerung: Wiedervorlage für ${lead.name} (${lead.company || "?"}) ist überfällig seit ${new Date(lead.follow_up_date).toLocaleDateString("de-DE")}`,
        note_type: "note",
      });

      results.notes_created++;
    }
  } catch (err) {
    results.errors.push({ error: err.message });
  }

  return res.status(200).json({
    success: true,
    timestamp: new Date().toISOString(),
    ...results,
  });
}
