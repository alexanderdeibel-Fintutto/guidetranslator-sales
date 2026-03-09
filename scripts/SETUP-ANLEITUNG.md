# Zentrale Vercel Analytics - Setup Anleitung

## Architektur

```
Translator Apps                              Admin App (admin.fintutto.cloud)
  translator.fintutto.cloud    ──┐
  sales.guidinggroup.com       ──┤ POST    ┌─────────────────────────┐
  app.guidetranslator.com      ──┼────────→│ /api/analytics/translator│──→ Supabase
                                 │         └─────────────────────────┘    (analytics_
Fintutto Apps                    │                                         pageviews)
  fintutto.cloud               ──┤ POST    ┌─────────────────────────┐
  commander.fintutto.cloud     ──┤         │ /api/analytics/fintutto  │──→ Supabase
  hausmeisterpro.fintutto.cloud──┼────────→│                         │
  app.bescheidboxer.de         ──┤         └─────────────────────────┘
  ... (10 weitere)             ──┘
                                           ┌─────────────────────────┐
  Admin Dashboard              ←───────────│ /api/analytics/dashboard │──→ Supabase
                                           └─────────────────────────┘
```

## Schritte (in dieser Reihenfolge)

### Schritt 1: Supabase Tabellen anlegen

1. Gehe zu deinem Supabase Dashboard
2. Offne den SQL Editor
3. Kopiere den Inhalt von `supabase-analytics-schema.sql`
4. Ausfuhren

### Schritt 2: API-Endpoints in Admin-App installieren

Kopiere die Dateien in deine Admin-App (`admin` Repo):

```bash
# Im admin Repo:

# Ingest-Endpoint (empfangt Drain-Daten)
cp admin-api-templates/analytics-ingest.js \
   app/api/analytics/[group]/route.js

# Dashboard-API (liefert aggregierte Daten)
cp admin-api-templates/analytics-dashboard-api.js \
   app/api/analytics/dashboard/route.js
```

Dann in `.env.local` der Admin-App:

```env
SUPABASE_SERVICE_ROLE_KEY=eyJ...dein-service-role-key
DRAIN_SECRET=dein-drain-secret  # Optional, aus Vercel Drain Config
```

Deploye die Admin-App auf Vercel.

### Schritt 3: Drains fur alle Apps einrichten

```bash
# 1. Vercel Token holen: https://vercel.com/account/tokens
export VERCEL_TOKEN="dein-token-hier"

# 2. Team ID finden: Vercel Dashboard URL → /team_xxx
export VERCEL_TEAM_ID="team_xxx"

# 3. Script ausfuhren
bash scripts/setup-analytics-drains.sh
```

Das Script:
- Aktiviert Analytics fur alle 15 Projekte
- Erstellt Drains die auf admin.fintutto.cloud zeigen
- Translator-Apps → `/api/analytics/translator`
- Fintutto-Apps → `/api/analytics/fintutto`

### Schritt 4: Verifizieren

```bash
# Test: Manuell ein Event senden
curl -X POST https://admin.fintutto.cloud/api/analytics/translator \
  -H "Content-Type: application/json" \
  -d '{"hostname":"sales.guidinggroup.com","path":"/test","country":"DE"}'

# Erwartete Antwort: {"ok":true,"received":1,"group":"translator"}
```

## Dashboard-API Nutzung

```
GET /api/analytics/dashboard?range=7d              → Alle Apps, letzte 7 Tage
GET /api/analytics/dashboard?range=30d&group=translator → Nur Translator, 30 Tage
GET /api/analytics/dashboard?range=24h&hostname=sales.guidinggroup.com → Eine App
```

Antwort-Format:
```json
{
  "range": "7d",
  "group": "all",
  "total_pageviews": 1234,
  "apps": [
    { "hostname": "app.bescheidboxer.de", "views": 456 },
    { "hostname": "fintutto.cloud", "views": 321 }
  ],
  "countries": [
    { "country": "DE", "views": 890 },
    { "country": "AT", "views": 120 }
  ],
  "devices": { "desktop": 700, "mobile": 500, "tablet": 34 },
  "top_pages": [...],
  "timeline": [
    { "date": "2026-03-03", "pageviews": 180 },
    { "date": "2026-03-04", "pageviews": 210 }
  ]
}
```

## Dateien-Ubersicht

| Datei | Zweck |
|-------|-------|
| `setup-analytics-drains.sh` | Aktiviert Analytics + Drains fur alle Apps |
| `supabase-analytics-schema.sql` | Datenbank-Tabellen, Indices, Views |
| `admin-api-templates/analytics-ingest.js` | Empfangt Drain-Daten → Supabase |
| `admin-api-templates/analytics-dashboard-api.js` | Dashboard-Abfragen |

## FAQ

**Muss ich in jeder App Code andern?**
Nein! Die Drains funktionieren serverseitig. Du brauchst nur:
- Analytics im Vercel Dashboard aktiviert (macht das Script)
- Die `<Analytics />` Komponente ODER `<script>` Tag in der App

In diesem Repo (guidetranslator-sales) ist die Komponente bereits eingebaut.
Fur die anderen Apps reicht es, im Vercel Dashboard Analytics zu aktivieren.

**Was kostet das?**
Vercel Drains: $0.50/GB auf Pro-Plan. Web Analytics selbst ist im Pro-Plan inklusive.

**Kann ich das Drain-Secret nutzen?**
Ja, empfohlen! Das Secret wird beim Erstellen des Drains im Vercel Dashboard angezeigt.
Trage es als `DRAIN_SECRET` in der Admin-App `.env.local` ein.
