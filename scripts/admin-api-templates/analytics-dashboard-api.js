// ============================================================
// API Route: /api/analytics/dashboard
//
// Dashboard-API für die Admin-App.
// Liefert aggregierte Analytics-Daten für alle Apps.
//
// INSTALLATION in admin-App (Next.js):
//   Kopiere nach: app/api/analytics/dashboard/route.js
//
// Abfragen:
//   GET /api/analytics/dashboard?range=7d
//   GET /api/analytics/dashboard?range=30d&group=translator
//   GET /api/analytics/dashboard?range=24h&hostname=sales.guidinggroup.com
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getTimeRange(range) {
  const now = new Date();
  switch (range) {
    case "24h":
      return new Date(now - 24 * 60 * 60 * 1000).toISOString();
    case "7d":
      return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    case "30d":
      return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
    case "90d":
      return new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "7d";
    const group = searchParams.get("group"); // 'translator' | 'fintutto' | null
    const hostname = searchParams.get("hostname");

    const since = getTimeRange(range);

    // --- Übersicht: Pageviews pro App ---
    let overviewQuery = supabase
      .from("analytics_pageviews")
      .select("app_group, hostname, path, country, device, browser, timestamp")
      .gte("timestamp", since)
      .order("timestamp", { ascending: false });

    if (group) overviewQuery = overviewQuery.eq("app_group", group);
    if (hostname) overviewQuery = overviewQuery.eq("hostname", hostname);

    const { data: rawEvents, error } = await overviewQuery.limit(10000);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Aggregieren
    const byApp = {};
    const byCountry = {};
    const byDevice = {};
    const byPath = {};
    const byDay = {};

    for (const event of rawEvents) {
      // Pro App
      const key = event.hostname || "unknown";
      byApp[key] = (byApp[key] || 0) + 1;

      // Pro Land
      if (event.country) {
        byCountry[event.country] = (byCountry[event.country] || 0) + 1;
      }

      // Pro Device
      if (event.device) {
        byDevice[event.device] = (byDevice[event.device] || 0) + 1;
      }

      // Pro Seite
      const pathKey = `${key}${event.path}`;
      byPath[pathKey] = byPath[pathKey] || {
        hostname: key,
        path: event.path,
        views: 0,
      };
      byPath[pathKey].views++;

      // Pro Tag
      const day = event.timestamp?.split("T")[0];
      if (day) {
        byDay[day] = byDay[day] || { date: day, pageviews: 0 };
        byDay[day].pageviews++;
      }
    }

    // Sortieren
    const topApps = Object.entries(byApp)
      .map(([hostname, views]) => ({ hostname, views }))
      .sort((a, b) => b.views - a.views);

    const topCountries = Object.entries(byCountry)
      .map(([country, views]) => ({ country, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 20);

    const topPages = Object.values(byPath)
      .sort((a, b) => b.views - a.views)
      .slice(0, 50);

    const timeline = Object.values(byDay).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    return NextResponse.json({
      range,
      group: group || "all",
      total_pageviews: rawEvents.length,
      apps: topApps,
      countries: topCountries,
      devices: byDevice,
      top_pages: topPages,
      timeline,
    });
  } catch (err) {
    console.error("Dashboard API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
