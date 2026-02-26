// Vercel Serverless Function — Stripe Webhook Handler
// Environment variables:
//   STRIPE_SECRET_KEY    — sk_live_xxx
//   STRIPE_WEBHOOK_SECRET — whsec_xxx (from Stripe Dashboard → Webhooks)
//   SUPABASE_URL
//   SUPABASE_SERVICE_KEY

import { createClient } from "@supabase/supabase-js";
import { buffer } from "micro";
import crypto from "crypto";

// Disable body parsing — we need the raw body for signature verification
export const config = { api: { bodyParser: false } };

// Reverse lookup: Stripe priceId → tier name
const PRICE_TO_TIER = {
  "price_1T51ek52lqSgjCzeuIeICocy": "starter",
  "price_1T51ek52lqSgjCzeW2zweQle": "pro",
  "price_1T51ek52lqSgjCze5T0497Og": "business",
  "price_1T51el52lqSgjCzeSxSZHZ21": "enterprise",
  "price_1T51el52lqSgjCzeCSoj2LBz": "fleet_starter",
  "price_1T51em52lqSgjCzek7VTl2Pp": "fleet_pro",
};

async function fetchSubscriptionPriceId(stripeKey, subscriptionId) {
  if (!subscriptionId) return null;
  try {
    const res = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
      headers: { Authorization: `Bearer ${stripeKey}` },
    });
    const sub = await res.json();
    return sub.items?.data?.[0]?.price?.id || null;
  } catch {
    return null;
  }
}

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

async function sendWelcomeEmail(email, name, tempPassword, tierName) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  const from = process.env.EMAIL_FROM || "GuideTranslator <onboarding@resend.dev>";
  const appUrl = process.env.APP_URL || "https://sales.guidetranslator.com";
  const loginUrl = `${appUrl}/login`;

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
            <tr><td style="padding:0 0 12px;color:#f0f2f5;font-size:16px">Willkommen, ${name}!</td></tr>
            <tr><td style="padding:4px 0;color:#c8d6e5;font-size:15px;line-height:1.7">
              Ihr <strong style="color:#c8a84e">${tierName || "GuideTranslator"}</strong> Abonnement ist jetzt aktiv.
              Sie können sich ab sofort in Ihrem Kunden-Dashboard anmelden und Sub-Accounts für Ihr Team anlegen.
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
              <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#c8a84e,#a08030);color:#0a1628;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:16px">Zum Dashboard</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="text-align:center;padding:24px 0 8px">
          <div style="color:#6b7a8d;font-size:11px">&copy; ${new Date().getFullYear()} GuideTranslator. Alle Rechte vorbehalten.</div>
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
        from,
        to: [email],
        subject: "Willkommen bei GuideTranslator — Ihr Zugang ist bereit",
        html,
        text: `Willkommen, ${name}!\n\nIhr Abonnement ist aktiv.\n\nE-Mail: ${email}\nTemporäres Passwort: ${tempPassword}\n\nAnmelden: ${loginUrl}\n\nBitte ändern Sie Ihr Passwort nach der ersten Anmeldung.`,
      }),
    });
  } catch (err) {
    console.error("Welcome email failed:", err);
  }
}

async function provisionCustomerAccount(supabase, email, lead, tierName) {
  // Check if auth user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existing = existingUsers?.users?.find(u => u.email === email);

  if (existing) {
    // User already has an auth account — ensure role + organization exist
    const { data: existingRole } = await supabase.from("gt_roles")
      .select("organization_id").eq("user_id", existing.id).single();

    if (!existingRole?.organization_id) {
      const orgId = await ensureOrganization(supabase, existing.id, lead);
      await supabase.from("gt_roles").upsert({
        user_id: existing.id,
        role: "customer",
        segment: lead?.segment || null,
        organization_id: orgId,
      }, { onConflict: "user_id" });
    }
    // Link lead to auth user
    if (lead?.id) {
      await supabase.from("gt_leads").update({ auth_user_id: existing.id }).eq("id", lead.id);
    }
    return;
  }

  // Create new Supabase Auth user
  const tempPassword = generateTempPassword();
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      name: lead?.name || "",
      company: lead?.company || "",
    },
  });

  if (authError || !authUser?.user) {
    console.error("Auth user creation failed:", authError);
    return;
  }

  const userId = authUser.user.id;

  // Create organization for the customer
  const orgId = await ensureOrganization(supabase, userId, lead);

  // Assign "customer" role with organization
  await supabase.from("gt_roles").upsert({
    user_id: userId,
    role: "customer",
    segment: lead?.segment || null,
    organization_id: orgId,
  }, { onConflict: "user_id" });

  // Link lead to auth user
  if (lead?.id) {
    await supabase.from("gt_leads").update({ auth_user_id: userId }).eq("id", lead.id);
  }

  // Send welcome email with credentials
  await sendWelcomeEmail(email, lead?.name || email, tempPassword, tierName);

  // Log the provisioning
  if (lead?.id) {
    await supabase.from("gt_lead_notes").insert({
      lead_id: lead.id,
      text: `Kunden-Account automatisch erstellt (Rolle: customer, Organisation: ${lead?.company || "—"}). Willkommens-Email gesendet.`,
      note_type: "system",
    });
  }
}

async function ensureOrganization(supabase, userId, lead) {
  // Check if org already exists for this user
  const { data: existingOrg } = await supabase
    .from("gt_organizations")
    .select("id")
    .eq("owner_user_id", userId)
    .single();

  if (existingOrg) return existingOrg.id;

  // Create new organization
  const { data: org } = await supabase
    .from("gt_organizations")
    .insert({
      name: lead?.company || lead?.name || "Organisation",
      segment: lead?.segment || "kreuzfahrt",
      owner_user_id: userId,
      stripe_customer_id: lead?.stripe_customer_id || null,
    })
    .select("id")
    .single();

  return org?.id || null;
}

function verifyStripeSignature(rawBody, sigHeader, secret) {
  const parts = sigHeader.split(",").reduce((acc, part) => {
    const [key, value] = part.split("=");
    acc[key] = value;
    return acc;
  }, {});

  const timestamp = parts.t;
  const signature = parts.v1;

  if (!timestamp || !signature) return false;

  // Reject events older than 5 minutes (replay attack protection)
  const tolerance = 300; // 5 minutes in seconds
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > tolerance) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");

  // Timing-safe comparison
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    return res.status(500).json({ error: "Stripe config missing" });
  }

  let rawBody;
  try {
    rawBody = (await buffer(req)).toString("utf8");
  } catch (err) {
    return res.status(400).json({ error: "Could not read body" });
  }

  const sigHeader = req.headers["stripe-signature"];
  if (!sigHeader || !verifyStripeSignature(rawBody, sigHeader, webhookSecret)) {
    return res.status(400).json({ error: "Invalid signature" });
  }

  const event = JSON.parse(rawBody);
  const supabase = getSupabaseAdmin();

  try {
    switch (event.type) {
      // ─── Checkout completed → activate subscription ──────
      case "checkout.session.completed": {
        const session = event.data.object;
        const customerId = session.customer;
        const email = session.customer_email || session.customer_details?.email;
        const subscriptionId = session.subscription;
        const mode = session.mode; // "subscription" or "payment"

        if (supabase && email) {
          // Resolve subscription_tier from metadata or by fetching the subscription
          let tierName = session.metadata?.tier_id || null;

          if (!tierName && subscriptionId) {
            const priceId = await fetchSubscriptionPriceId(stripeKey, subscriptionId);
            if (priceId) tierName = PRICE_TO_TIER[priceId] || null;
          }

          // Build update payload
          const leadUpdate = {
            stripe_customer_id: customerId,
            pipeline_stage: "gewonnen",
            status: "active_subscriber",
            last_activity: new Date().toISOString(),
          };

          if (mode === "subscription" && subscriptionId) {
            leadUpdate.stripe_subscription_id = subscriptionId;
            leadUpdate.subscription_status = "active";
          }

          if (tierName) {
            leadUpdate.subscription_tier = tierName;
          }

          await supabase
            .from("gt_leads")
            .update(leadUpdate)
            .eq("email", email);

          // Log the event
          const { data: lead } = await supabase
            .from("gt_leads")
            .select("id")
            .eq("email", email)
            .single();

          if (lead) {
            const noteText = mode === "subscription"
              ? `Stripe Subscription aktiviert: ${subscriptionId} (Tier: ${tierName || "unbekannt"})`
              : `Stripe Einmalzahlung abgeschlossen (${tierName || "Add-On"})`;

            await supabase.from("gt_lead_notes").insert({
              lead_id: lead.id,
              text: noteText,
              note_type: "system",
            });

            // Auto-provision customer auth account (for subscriptions)
            if (mode === "subscription") {
              const { data: fullLead } = await supabase
                .from("gt_leads")
                .select("*")
                .eq("id", lead.id)
                .single();
              await provisionCustomerAccount(supabase, email, fullLead, tierName);
            }
          }
        }
        break;
      }

      // ─── Subscription updated (upgrade/downgrade) ──────
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const status = subscription.status;

        if (supabase) {
          const updates = {
            subscription_status: status,
            last_activity: new Date().toISOString(),
          };

          // Resolve tier from current subscription price
          const currentPriceId = subscription.items?.data?.[0]?.price?.id;
          if (currentPriceId && PRICE_TO_TIER[currentPriceId]) {
            updates.subscription_tier = PRICE_TO_TIER[currentPriceId];
          }

          if (status === "active") {
            updates.pipeline_stage = "gewonnen";
          } else if (status === "past_due") {
            updates.pipeline_stage = "verhandlung";
          }

          await supabase
            .from("gt_leads")
            .update(updates)
            .eq("stripe_customer_id", customerId);
        }
        break;
      }

      // ─── Subscription cancelled ──────────────────────────
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        if (supabase) {
          await supabase
            .from("gt_leads")
            .update({
              subscription_status: "cancelled",
              pipeline_stage: "verloren",
              last_activity: new Date().toISOString(),
            })
            .eq("stripe_customer_id", customerId);
        }
        break;
      }

      // ─── Invoice paid ──────────────────────────────────────
      case "invoice.paid": {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        const amount = invoice.amount_paid;

        if (supabase) {
          await supabase
            .from("gt_leads")
            .update({
              last_payment_at: new Date().toISOString(),
              last_payment_amount: amount / 100, // Stripe uses cents
              last_activity: new Date().toISOString(),
            })
            .eq("stripe_customer_id", customerId);
        }
        break;
      }

      // ─── Payment failed ──────────────────────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        if (supabase) {
          await supabase
            .from("gt_leads")
            .update({
              subscription_status: "payment_failed",
              last_activity: new Date().toISOString(),
            })
            .eq("stripe_customer_id", customerId);
        }
        break;
      }

      default:
        // Unhandled event type — acknowledge it
        break;
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    // Still return 200 to prevent Stripe retries
  }

  return res.status(200).json({ received: true });
}
