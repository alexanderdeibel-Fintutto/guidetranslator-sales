// Supabase Edge Function: Analytics Ingest
// Empfängt Vercel Web Analytics Drain-Daten und speichert sie in Supabase.
//
// Endpunkte (nach Deploy):
//   POST https://<project-ref>.supabase.co/functions/v1/analytics-ingest?group=translator
//   POST https://<project-ref>.supabase.co/functions/v1/analytics-ingest?group=fintutto

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-vercel-signature, x-vercel-verify",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// Hostname → Projektname Mapping
const HOSTNAME_MAP: Record<string, string> = {
  // Translator
  "app.guidetranslator.com": "guidetranslator",
  "sales.guidinggroup.com": "gt_salesmaschine",
  "sales.translator.fintutto.cloud": "gt_salesmaschine",
  "translator.fintutto.cloud": "translator.consumer",

  // Fintutto
  "fintutto.cloud": "cloud",
  "www.fintutto.cloud": "cloud",
  "app.fintutto.cloud": "fintutto",
  "commander.fintutto.cloud": "command-center",
  "hausmeisterpro.fintutto.cloud": "hausmeister-pro",
  "luggagex.fintutto.cloud": "luggagex",
  "fitness.fintutto.cloud": "personaltrainer",
  "portal.fintutto.cloud": "portal",
  "vermietify.fintutto.cloud": "vermietify",
  "zimmerpflanze.fintutto.cloud": "zimmerpflanze",
  "zaehler.fintutto.cloud": "ablesung",
  "admin.fintutto.cloud": "admin",
  "app.bescheidboxer.de": "bescheidboxer",
  "mieter.fintutto.de": "mieter",
  "biz.fintutto.cloud": "biz",
  "secondbrain.fintutto.cloud": "secondbrain",
  "ai-guide.fintutto.cloud": "ai-guide",
  "lern.fintutto.cloud": "lern-app",
  "finance.fintutto.cloud": "finance-coach",
};

// HMAC-SHA256 Signatur verifizieren
async function verifySignature(
  body: string,
  signature: string | null
): Promise<boolean> {
  const secret = Deno.env.get("DRAIN_SECRET");
  if (!secret) return true; // Skip wenn kein Secret konfiguriert

  if (!signature) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return expected === signature;
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // GET = Health check / Vercel verification
  if (req.method === "GET") {
    return new Response(
      JSON.stringify({ status: "ok", service: "analytics-drain" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(req.url);
    const group = url.searchParams.get("group");

    if (!group || !["translator", "fintutto"].includes(group)) {
      return new Response(
        JSON.stringify({
          error: "Invalid group. Use ?group=translator or ?group=fintutto",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const rawBody = await req.text();

    // Signatur prüfen
    const signature = req.headers.get("x-vercel-signature");
    if (!(await verifySignature(rawBody, signature))) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Events parsen (JSON oder NDJSON)
    let events: Record<string, unknown>[];
    try {
      const parsed = JSON.parse(rawBody);
      events = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      // NDJSON Format
      events = rawBody
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line));
    }

    // Supabase Client mit Service Role Key
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Events transformieren und speichern
    const rows = events.map((event: Record<string, unknown>) => {
      const geo = (event.geo as Record<string, string>) || {};
      const device = (event.device as Record<string, string>) || {};
      const hostname =
        (event.hostname as string) || (event.host as string) || null;

      return {
        app_group: group,
        project_name:
          HOSTNAME_MAP[hostname || ""] || hostname || "unknown",
        hostname,
        path:
          (event.path as string) ||
          (event.url as string) ||
          (event.pathname as string) ||
          "/",
        referrer:
          (event.referrer as string) ||
          (event.referrerHostname as string) ||
          null,
        country: geo.country || (event.country as string) || null,
        city: geo.city || (event.city as string) || null,
        region: geo.region || (event.region as string) || null,
        device: device.type || (event.deviceType as string) || null,
        os: device.os || (event.os as string) || null,
        browser: device.browser || (event.browser as string) || null,
        event_name:
          (event.type as string) || (event.name as string) || "pageview",
        event_data:
          (event.data as Record<string, unknown>) ||
          (event.properties as Record<string, unknown>) ||
          null,
        timestamp: event.timestamp
          ? new Date(event.timestamp as string | number).toISOString()
          : new Date().toISOString(),
      };
    });

    const { error } = await supabase
      .from("analytics_pageviews")
      .insert(rows);

    if (error) {
      console.error("Supabase insert error:", error);
      return new Response(JSON.stringify({ error: "Database error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, received: rows.length, group }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Analytics ingest error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
