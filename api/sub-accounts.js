// Vercel Serverless Function — manage sub-accounts (for customers)
// Allows customers to create/list/remove sub-accounts for their organization
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

function generateTempPassword() {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let pw = "";
  for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

async function sendSubAccountEmail(email, name, tempPassword, companyName) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  const from = process.env.EMAIL_FROM || "GuideTranslator <onboarding@resend.dev>";
  const appUrl = process.env.APP_URL || "https://sales.guidetranslator.com";

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
            <tr><td style="padding:0 0 12px;color:#f0f2f5;font-size:16px">Hallo ${name},</td></tr>
            <tr><td style="padding:4px 0;color:#c8d6e5;font-size:15px;line-height:1.7">
              <strong style="color:#c8a84e">${companyName}</strong> hat einen GuideTranslator-Zugang für Sie erstellt.
              Sie können sich ab sofort anmelden und die App nutzen.
            </td></tr>
            <tr><td style="padding:16px 0">
              <div style="background:#0a1628;border-radius:10px;padding:16px;border:1px solid #1a2d4a">
                <div style="color:#94a3b8;font-size:12px;margin-bottom:4px">E-Mail</div>
                <div style="color:#f0f2f5;font-size:15px;margin-bottom:12px">${email}</div>
                <div style="color:#94a3b8;font-size:12px;margin-bottom:4px">Temporäres Passwort</div>
                <div style="color:#c8a84e;font-size:18px;font-weight:700;font-family:monospace">${tempPassword}</div>
              </div>
            </td></tr>
            <tr><td style="color:#94a3b8;font-size:13px;padding:0 0 16px">
              Bitte ändern Sie Ihr Passwort nach der ersten Anmeldung.
            </td></tr>
            <tr><td style="padding:8px 0;text-align:center">
              <a href="${appUrl}/login" style="display:inline-block;background:linear-gradient(135deg,#c8a84e,#a08030);color:#0a1628;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:16px">Anmelden</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="text-align:center;padding:24px 0 8px">
          <div style="color:#6b7a8d;font-size:11px">&copy; ${new Date().getFullYear()} GuideTranslator.</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from, to: [email],
        subject: `Ihr GuideTranslator-Zugang von ${companyName}`,
        html,
        text: `Hallo ${name},\n\n${companyName} hat einen GuideTranslator-Zugang für Sie erstellt.\n\nE-Mail: ${email}\nTemporäres Passwort: ${tempPassword}\n\nAnmelden: ${appUrl}/login`,
      }),
    });
  } catch (err) {
    console.error("Sub-account email failed:", err);
  }
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (!["POST", "GET", "DELETE"].includes(req.method)) {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (applyRateLimit(req, res, { endpoint: "sub-accounts", limit: 20, windowMs: 60_000 })) return;

  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(500).json({ error: "Database not configured" });

  // Verify caller's auth token
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing authorization" });
  }

  const { data: { user: caller }, error: authError } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", "")
  );
  if (authError || !caller) {
    return res.status(401).json({ error: "Invalid auth token" });
  }

  // Get caller's role and organization
  const { data: callerRole } = await supabase
    .from("gt_roles")
    .select("role, organization_id")
    .eq("user_id", caller.id)
    .single();

  if (!callerRole) {
    return res.status(403).json({ error: "Keine Rolle zugewiesen" });
  }

  // Allow customers, admins, and super_admins
  const isCustomer = callerRole.role === "customer";
  const isAdmin = ["admin", "super_admin"].includes(callerRole.role);
  if (!isCustomer && !isAdmin) {
    return res.status(403).json({ error: "Keine Berechtigung" });
  }

  const orgId = callerRole.organization_id;
  if (!orgId && isCustomer) {
    return res.status(400).json({ error: "Keine Organisation zugewiesen. Bitte kontaktieren Sie den Support." });
  }

  try {
    // ─── LIST sub-accounts ─────────────────────────────────
    if (req.method === "GET") {
      const targetOrgId = isAdmin ? (req.query?.orgId || orgId) : orgId;

      const { data: subRoles } = await supabase
        .from("gt_roles")
        .select("user_id, role, created_at")
        .eq("organization_id", targetOrgId)
        .eq("role", "sub_account");

      if (!subRoles?.length) {
        return res.status(200).json({ subAccounts: [] });
      }

      // Get user details for each sub-account
      const { data: allUsers } = await supabase.auth.admin.listUsers();
      const subAccounts = subRoles.map(sr => {
        const u = allUsers?.users?.find(u => u.id === sr.user_id);
        return {
          id: sr.user_id,
          email: u?.email || "—",
          name: u?.user_metadata?.name || "—",
          created_at: sr.created_at,
        };
      });

      return res.status(200).json({ subAccounts });
    }

    // ─── CREATE sub-account ────────────────────────────────
    if (req.method === "POST") {
      const { email, name } = req.body;
      if (!email || !name) {
        return res.status(400).json({ error: "E-Mail und Name erforderlich" });
      }

      // Check if user already exists
      const { data: allUsers } = await supabase.auth.admin.listUsers();
      const existingUser = allUsers?.users?.find(u => u.email === email);

      if (existingUser) {
        // Check if already a sub-account in this org
        const { data: existingRole } = await supabase
          .from("gt_roles")
          .select("role, organization_id")
          .eq("user_id", existingUser.id)
          .single();

        if (existingRole) {
          return res.status(400).json({ error: "Dieser Benutzer hat bereits einen Account" });
        }
      }

      let userId;
      let tempPassword = null;

      if (existingUser) {
        userId = existingUser.id;
      } else {
        tempPassword = generateTempPassword();
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { name },
        });
        if (createError) {
          return res.status(400).json({ error: `Account-Erstellung fehlgeschlagen: ${createError.message}` });
        }
        userId = newUser.user.id;
      }

      // Assign sub_account role with same organization
      const targetOrgId = isAdmin ? (req.body.orgId || orgId) : orgId;
      await supabase.from("gt_roles").upsert({
        user_id: userId,
        role: "sub_account",
        organization_id: targetOrgId,
        segment: callerRole.segment || null,
        created_by: caller.id,
      }, { onConflict: "user_id" });

      // Send invite email
      if (tempPassword) {
        const companyName = caller.user_metadata?.company || caller.user_metadata?.name || "Ihr Unternehmen";
        await sendSubAccountEmail(email, name, tempPassword, companyName);
      }

      return res.status(200).json({
        success: true,
        userId,
        isNew: !!tempPassword,
        emailSent: !!tempPassword,
      });
    }

    // ─── DELETE sub-account ────────────────────────────────
    if (req.method === "DELETE") {
      const { userId: targetUserId } = req.body;
      if (!targetUserId) {
        return res.status(400).json({ error: "userId erforderlich" });
      }

      // Verify the target is a sub_account in the caller's org
      const { data: targetRole } = await supabase
        .from("gt_roles")
        .select("role, organization_id")
        .eq("user_id", targetUserId)
        .single();

      if (!targetRole || targetRole.role !== "sub_account") {
        return res.status(400).json({ error: "Benutzer ist kein Sub-Account" });
      }

      if (isCustomer && targetRole.organization_id !== orgId) {
        return res.status(403).json({ error: "Nicht Ihre Organisation" });
      }

      // Remove role (keeps auth user but removes access)
      await supabase.from("gt_roles").delete().eq("user_id", targetUserId);

      return res.status(200).json({ success: true });
    }
  } catch (err) {
    console.error("Sub-accounts error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
