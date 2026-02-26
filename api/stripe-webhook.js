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

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function verifyStripeSignature(rawBody, sigHeader, secret) {
  const parts = sigHeader.split(",").reduce((acc, part) => {
    const [key, value] = part.split("=");
    acc[key] = value;
    return acc;
  }, {});

  const timestamp = parts.t;
  const signature = parts.v1;
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

        if (supabase && email) {
          // Update lead with Stripe info
          await supabase
            .from("gt_leads")
            .update({
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              pipeline_stage: "gewonnen",
              status: "active_subscriber",
              last_activity: new Date().toISOString(),
            })
            .eq("email", email);

          // Log the event
          const { data: lead } = await supabase
            .from("gt_leads")
            .select("id")
            .eq("email", email)
            .single();

          if (lead) {
            await supabase.from("gt_lead_notes").insert({
              lead_id: lead.id,
              text: `Stripe Subscription aktiviert: ${subscriptionId}`,
              note_type: "note",
            });
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
