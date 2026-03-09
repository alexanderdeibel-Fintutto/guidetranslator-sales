# Analytics Edge Functions - Deploy Anleitung

## Dateien ins Admin-Repo kopieren

Kopiere diese Dateien in dein `admin` Repo:

```
admin/
└── supabase/
    ├── functions/
    │   ├── analytics-ingest/
    │   │   └── index.ts          ← Empfängt Vercel Drain-Daten
    │   └── analytics-dashboard/
    │       └── index.ts          ← Dashboard API
    └── migrations/
        └── 20260309000000_analytics_schema.sql
```

## Schritt 1: SQL Schema ausführen

Falls noch nicht geschehen, führe `analytics_schema.sql` im **Supabase SQL Editor** aus:
https://supabase.com/dashboard/project/aaefocdqgdgexkcrjhks/sql

## Schritt 2: Edge Functions deployen

```bash
cd admin
supabase functions deploy analytics-ingest
supabase functions deploy analytics-dashboard
```

Falls du Supabase CLI noch nicht hast:
```bash
npm install -g supabase
supabase login
supabase link --project-ref aaefocdqgdgexkcrjhks
```

## Schritt 3: Drains einrichten

```bash
export VERCEL_TOKEN="dein-neuer-token"
export VERCEL_TEAM_ID="team_BWJ5UWVCsjATty1unzcfH96u"
bash supabase/functions/setup-analytics-drains.sh
```

## Endpoints nach Deploy

- **Ingest (Translator):** `https://aaefocdqgdgexkcrjhks.supabase.co/functions/v1/analytics-ingest?group=translator`
- **Ingest (Fintutto):** `https://aaefocdqgdgexkcrjhks.supabase.co/functions/v1/analytics-ingest?group=fintutto`
- **Dashboard:** `https://aaefocdqgdgexkcrjhks.supabase.co/functions/v1/analytics-dashboard?range=7d`

## Testen

```bash
# Health Check
curl https://aaefocdqgdgexkcrjhks.supabase.co/functions/v1/analytics-ingest

# Test-Event senden
curl -X POST "https://aaefocdqgdgexkcrjhks.supabase.co/functions/v1/analytics-ingest?group=fintutto" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer DEIN_SUPABASE_ANON_KEY" \
  -d '[{"hostname":"admin.fintutto.cloud","path":"/test","country":"DE","device":"desktop","browser":"Chrome"}]'

# Dashboard abfragen
curl "https://aaefocdqgdgexkcrjhks.supabase.co/functions/v1/analytics-dashboard?range=7d" \
  -H "Authorization: Bearer DEIN_SUPABASE_ANON_KEY"
```
