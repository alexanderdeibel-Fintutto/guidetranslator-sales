// Vercel Serverless Function — One-time seed: creates initial admin accounts
// Run once via: POST /api/seed-admin with { secret: "..." }
// Environment variables needed:
//   SUPABASE_URL, SUPABASE_SERVICE_KEY, SEED_SECRET

import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const SEED_ACCOUNTS = [
  {
    email: "alexander@guidetranslator.com",
    password: null, // Will be set via env or generated
    name: "Alexander Deibel",
    role: "super_admin",
  },
  {
    email: "ulrich@guidetranslator.com",
    password: null,
    name: "Ulrich Deibel",
    role: "admin",
  },
];

function generatePassword() {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$";
  let pw = "";
  for (let i = 0; i < 16; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Verify seed secret
  const seedSecret = process.env.SEED_SECRET;
  if (!seedSecret) return res.status(500).json({ error: "SEED_SECRET not configured" });
  if (req.body?.secret !== seedSecret) {
    return res.status(403).json({ error: "Invalid seed secret" });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const results = [];

  for (const account of SEED_ACCOUNTS) {
    try {
      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existing = existingUsers?.users?.find(u => u.email === account.email);

      let userId;
      let password = account.password || process.env[`SEED_PW_${account.role.toUpperCase()}`] || generatePassword();

      if (existing) {
        userId = existing.id;
        // Update password
        await supabaseAdmin.auth.admin.updateUser(userId, { password });
        results.push({
          email: account.email,
          role: account.role,
          status: "updated",
          password,
        });
      } else {
        // Create user
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: account.email,
          password,
          email_confirm: true,
          user_metadata: { name: account.name, role: account.role },
        });
        if (error) {
          results.push({ email: account.email, status: "error", error: error.message });
          continue;
        }
        userId = data.user.id;
        results.push({
          email: account.email,
          role: account.role,
          status: "created",
          password,
        });
      }

      // Upsert role
      await supabaseAdmin.from("gt_roles").upsert({
        user_id: userId,
        role: account.role,
        segment: null,
        organization_id: null,
        created_by: userId,
      }, { onConflict: "user_id" });

    } catch (err) {
      results.push({ email: account.email, status: "error", error: err.message });
    }
  }

  return res.status(200).json({
    success: true,
    message: "Seed completed. SAVE THESE PASSWORDS — they won't be shown again!",
    accounts: results,
  });
}
