// ============================================================
// API Route: /api/analytics/[group]
//
// Empfängt Vercel Web Analytics Drain-Daten und speichert
// sie in Supabase.
//
// INSTALLATION in admin-App (Next.js):
//   1. Kopiere diese Datei nach:
//      app/api/analytics/[group]/route.js
//   2. Setze SUPABASE_SERVICE_ROLE_KEY in .env.local
//   3. Setze DRAIN_SECRET in .env.local (optional, für Signatur-Verifizierung)
//
// Endpunkte:
//   POST /api/analytics/translator  ← Drain für Translator-Apps
//   POST /api/analytics/fintutto    ← Drain für Fintutto-Apps
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import crypto from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Service Role für Insert-Zugriff
);

// Hostname → Projektname Mapping
const HOSTNAME_MAP = {
  // Translator
  "app.guidetranslator.com": "guidetranslator",
  "sales.guidinggroup.com": "guidetranslator-sales",
  "sales.translator.fintutto.cloud": "guidetranslator-sales",
  "translator.fintutto.cloud": "translator",

  // Fintutto
  "fintutto.cloud": "cloud",
  "www.fintutto.cloud": "cloud",
  "app.fintutto.cloud": "fintutto-compass",
  "commander.fintutto.cloud": "command-center",
  "hausmeisterpro.fintutto.cloud": "hausmeisterPro",
  "luggagex.fintutto.cloud": "luggageX",
  "fitness.fintutto.cloud": "personaltrainer",
  "portal.fintutto.cloud": "portal",
  "vermietify.fintutto.cloud": "vermietify",
  "zimmerpflanze.fintutto.cloud": "zimmerpflanze",
  "zaehler.fintutto.cloud": "ablesung",
  "admin.fintutto.cloud": "admin",
  "app.bescheidboxer.de": "bescheidboxer",
  "mieter.fintutto.de": "mieter",
};

// Drain-Signatur verifizieren (optional, aber empfohlen)
function verifySignature(body, signature) {
  const secret = process.env.DRAIN_SECRET;
  if (!secret) return true; // Skip wenn kein Secret konfiguriert

  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature || ""),
    Buffer.from(expected)
  );
}

export async function POST(request, { params }) {
  try {
    const group = params.group; // 'translator' oder 'fintutto'

    if (!["translator", "fintutto"].includes(group)) {
      return NextResponse.json({ error: "Invalid group" }, { status: 400 });
    }

    const rawBody = await request.text();

    // Signatur prüfen
    const signature = request.headers.get("x-vercel-signature");
    if (!verifySignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Vercel sendet entweder ein einzelnes Event oder ein Array
    let events;
    try {
      const parsed = JSON.parse(rawBody);
      events = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      // NDJSON Format (eine JSON-Zeile pro Event)
      events = rawBody
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line));
    }

    // Events in Supabase speichern
    const rows = events.map((event) => ({
      app_group: group,
      project_name:
        HOSTNAME_MAP[event.hostname] ||
        HOSTNAME_MAP[event.host] ||
        event.hostname ||
        event.host ||
        "unknown",
      hostname: event.hostname || event.host || null,
      path: event.path || event.url || event.pathname || "/",
      referrer: event.referrer || event.referrerHostname || null,
      country: event.geo?.country || event.country || null,
      city: event.geo?.city || event.city || null,
      region: event.geo?.region || event.region || null,
      device: event.device?.type || event.deviceType || null,
      os: event.device?.os || event.os || null,
      browser: event.device?.browser || event.browser || null,
      event_name: event.type || event.name || "pageview",
      event_data: event.data || event.properties || null,
      timestamp: event.timestamp
        ? new Date(event.timestamp).toISOString()
        : new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("analytics_pageviews")
      .insert(rows);

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      received: rows.length,
      group,
    });
  } catch (err) {
    console.error("Analytics ingest error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Vercel sendet ggf. einen GET zur Verifizierung
export async function GET() {
  return NextResponse.json({ status: "ok", service: "analytics-drain" });
}
