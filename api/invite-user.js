// Vercel Serverless Function — creates a Supabase Auth user + assigns a role
// Environment variables needed:
//   SUPABASE_URL           — Supabase project URL
//   SUPABASE_SERVICE_KEY   — Supabase service_role key (NOT anon key!)
//   RESEND_API_KEY         — for sending invite emails
//   EMAIL_FROM             — sender address

import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function sendInviteEmail({ to, name, tempPassword, role, inviterName }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { error: "RESEND_API_KEY not configured" };

  const from = process.env.EMAIL_FROM || "GuideTranslator <enterprise@guidetranslator.com>";
  const loginUrl = `${process.env.APP_URL || "https://sales.guidetranslator.com"}/login`;

  const roleLabel = {
    super_admin: "Super-Admin",
    admin: "Admin",
    sales: "Sales",
    customer: "Kunde",
    sub_account: "Sub-Account",
  }[role] || role;

  const body = `Sehr geehrte/r ${name},

Sie wurden von ${inviterName || "GuideTranslator"} als ${roleLabel} eingeladen.

Ihre Zugangsdaten:
E-Mail: ${to}
Temporäres Passwort: ${tempPassword}

Bitte melden Sie sich an und ändern Sie Ihr Passwort:
${loginUrl}

Mit freundlichen Grüßen
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
            <tr><td style="padding:0 0 8px;color:#f0f2f5;font-size:16px">Sehr geehrte/r ${name},</td></tr>
            <tr><td style="padding:8px 0;color:#c8d6e5;font-size:15px;line-height:1.7">
              Sie wurden als <strong style="color:#c8a84e">${roleLabel}</strong> eingeladen.
            </td></tr>
            <tr><td style="padding:16px 0">
              <div style="background:#0a1628;border-radius:10px;padding:16px;border:1px solid #1a2d4a">
                <div style="color:#94a3b8;font-size:12px;margin-bottom:4px">E-Mail</div>
                <div style="color:#f0f2f5;font-size:15px;margin-bottom:12px">${to}</div>
                <div style="color:#94a3b8;font-size:12px;margin-bottom:4px">Temporäres Passwort</div>
                <div style="color:#c8a84e;font-size:18px;font-weight:700;font-family:monospace">${tempPassword}</div>
              </div>
            </td></tr>
            <tr><td style="padding:16px 0;text-align:center">
              <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#c8a84e,#a08030);color:#0a1628;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:16px">Jetzt anmelden</a>
            </td></tr>
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
      body: JSON.stringify({ from, to: [to], subject: `Ihre Einladung zu GuideTranslator (${roleLabel})`, html, text: body }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.message || "Email send failed" };
    return { success: true, emailId: data.id };
  } catch (err) {
    return { error: err.message };
  }
}

function generateTempPassword() {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let pw = "";
  for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Verify the caller is an admin via their JWT
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing authorization header" });
  }

  const supabaseAdmin = getSupabaseAdmin();

  // Verify caller's token and role
  const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
  if (authError || !caller) {
    return res.status(401).json({ error: "Invalid auth token" });
  }

  // Check caller has admin role
  const { data: callerRole } = await supabaseAdmin
    .from("gt_roles")
    .select("role")
    .eq("user_id", caller.id)
    .single();

  if (!callerRole || !["admin", "super_admin"].includes(callerRole.role)) {
    return res.status(403).json({ error: "Insufficient permissions — admin role required" });
  }

  const { email, name, role, segment, organizationId } = req.body;
  if (!email || !name || !role) {
    return res.status(400).json({ error: "Missing required fields: email, name, role" });
  }

  const validRoles = ["admin", "sales", "customer", "sub_account"];
  // Only super_admin can create admins
  if (role === "admin" && callerRole.role !== "super_admin") {
    return res.status(403).json({ error: "Nur Super-Admins können Admin-Accounts erstellen" });
  }
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Valid: ${validRoles.join(", ")}` });
  }

  try {
    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existing = existingUsers?.users?.find(u => u.email === email);

    let userId;
    let tempPassword = null;

    if (existing) {
      userId = existing.id;
      // Update role if user already exists
    } else {
      // Create new auth user
      tempPassword = generateTempPassword();
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { name, role },
      });
      if (createError) {
        return res.status(400).json({ error: `User creation failed: ${createError.message}` });
      }
      userId = newUser.user.id;
    }

    // Upsert role
    const { error: roleError } = await supabaseAdmin
      .from("gt_roles")
      .upsert({
        user_id: userId,
        role,
        segment: segment || null,
        organization_id: organizationId || null,
        created_by: caller.id,
      }, { onConflict: "user_id" });

    if (roleError) {
      return res.status(500).json({ error: `Role assignment failed: ${roleError.message}` });
    }

    // Send invite email (only for new users)
    let emailResult = null;
    if (tempPassword) {
      emailResult = await sendInviteEmail({
        to: email,
        name,
        tempPassword,
        role,
        inviterName: caller.user_metadata?.name || "Admin",
      });
    }

    return res.status(200).json({
      success: true,
      userId,
      isNew: !!tempPassword,
      emailSent: emailResult?.success || false,
      emailError: emailResult?.error || null,
    });
  } catch (err) {
    console.error("invite-user error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
