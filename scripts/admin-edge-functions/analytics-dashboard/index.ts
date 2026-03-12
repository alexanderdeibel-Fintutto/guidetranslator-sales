// Supabase Edge Function: Analytics Dashboard API
// Liefert aggregierte Analytics-Daten für das Admin-Dashboard.
//
// Abfragen:
//   GET .../analytics-dashboard?range=7d
//   GET .../analytics-dashboard?range=30d&group=translator
//   GET .../analytics-dashboard?range=24h&hostname=sales.guidinggroup.com

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function getTimeRange(range: string): string {
  const now = Date.now();
  const ms: Record<string, number> = {
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
    "90d": 90 * 24 * 60 * 60 * 1000,
  };
  return new Date(now - (ms[range] || ms["7d"])).toISOString();
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(req.url);
    const range = url.searchParams.get("range") || "7d";
    const group = url.searchParams.get("group");
    const hostname = url.searchParams.get("hostname");

    const since = getTimeRange(range);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let query = supabase
      .from("analytics_pageviews")
      .select(
        "app_group, hostname, path, country, device, browser, timestamp"
      )
      .gte("timestamp", since)
      .order("timestamp", { ascending: false });

    if (group) query = query.eq("app_group", group);
    if (hostname) query = query.eq("hostname", hostname);

    const { data: rawEvents, error } = await query.limit(10000);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Aggregieren
    const byApp: Record<string, number> = {};
    const byCountry: Record<string, number> = {};
    const byDevice: Record<string, number> = {};
    const byPath: Record<
      string,
      { hostname: string; path: string; views: number }
    > = {};
    const byDay: Record<string, { date: string; pageviews: number }> = {};

    for (const event of rawEvents || []) {
      const key = event.hostname || "unknown";
      byApp[key] = (byApp[key] || 0) + 1;

      if (event.country) {
        byCountry[event.country] = (byCountry[event.country] || 0) + 1;
      }

      if (event.device) {
        byDevice[event.device] = (byDevice[event.device] || 0) + 1;
      }

      const pathKey = `${key}${event.path}`;
      byPath[pathKey] = byPath[pathKey] || {
        hostname: key,
        path: event.path,
        views: 0,
      };
      byPath[pathKey].views++;

      const day = event.timestamp?.split("T")[0];
      if (day) {
        byDay[day] = byDay[day] || { date: day, pageviews: 0 };
        byDay[day].pageviews++;
      }
    }

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

    return new Response(
      JSON.stringify({
        range,
        group: group || "all",
        total_pageviews: (rawEvents || []).length,
        apps: topApps,
        countries: topCountries,
        devices: byDevice,
        top_pages: topPages,
        timeline,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Dashboard API error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
