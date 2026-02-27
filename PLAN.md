# GuideTranslator Plattform-Erweiterung — Vollständiger Implementierungsplan

## IST-Zustand (Aktuell)

| Bereich | Status |
|---------|--------|
| App-Typ | Single-Page React App (State-basiertes Routing, kein React Router) |
| Seiten | landing, register, calculator, saved, contact, admin |
| Zielgruppe | NUR Kreuzfahrt-Enterprise (Segment 5) |
| Auth | Einfaches Passwort (Admin + Lead-Registration) |
| DB-Tabellen | `gt_leads`, `gt_calculations`, `gt_contact_requests`, `gt_lead_notes` |
| Bezahlung | Keine (kein Stripe, keine Pakete) |
| Nutzungs-Tracking | Nicht vorhanden |
| Rollen | Nur Admin (Passwort-geschützt) |
| E-Mail | Resend API (gerade eingerichtet) |

---

## SOLL-Zustand (Ziel)

Eine **Multi-Segment SaaS-Plattform** mit:
- 6 Zielgruppen-spezifische Sales-Flows
- Rollen-System (Super-Admin → Admin → Sales → Kunde → Guide/Sub-Account)
- Stripe Pricing (Free → Pakete → Enterprise → Credits)
- Nutzungs-Tracking (Minuten, Sprachen, Hörer)
- Kunden-Dashboard mit Sub-Account-Verwaltung
- Automatisierte Follow-up-Workflows

---

## Phase 1: Fundament — Auth, Rollen, Routing

### 1.1 Supabase Auth einführen (statt einfachem Passwort)

**Neue Tabellen:**
```sql
-- Benutzer-Profil (ergänzt Supabase auth.users)
CREATE TABLE gt_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  role TEXT NOT NULL DEFAULT 'customer',  -- 'super_admin', 'admin', 'sales', 'customer'
  display_name TEXT,
  company TEXT,
  phone TEXT,
  created_by UUID REFERENCES gt_profiles(id),  -- wer hat den Account angelegt
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Organisationen (für Großkunden mit Sub-Accounts)
CREATE TABLE gt_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  segment TEXT NOT NULL,  -- 'stadtfuehrer', 'agentur', 'veranstalter', 'kreuzfahrt', 'grossveranstalter', 'fintutto_single'
  stripe_customer_id TEXT,
  subscription_tier TEXT,  -- aktuelles Paket
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Org-Mitgliedschaft
CREATE TABLE gt_org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES gt_organizations(id),
  user_id UUID REFERENCES gt_profiles(id),
  role TEXT DEFAULT 'member',  -- 'owner', 'admin', 'guide', 'member'
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Row Level Security (RLS):**
- Super-Admin/Admin: Sieht alles
- Sales: Sieht eigene zugewiesene Leads + Organisationen
- Customer/Owner: Sieht nur eigene Organisation + Sub-Accounts
- Guide/Member: Sieht nur eigenen Account + eigene Nutzung

**Dateien:**
- `src/auth/AuthProvider.jsx` — Supabase Auth Context
- `src/auth/LoginPage.jsx` — Login für alle Rollen
- `src/auth/ProtectedRoute.jsx` — Zugriffskontrolle nach Rolle
- `api/auth-hook.js` — Webhook für Post-Registration (Profil anlegen)

### 1.2 React Router einführen

Umstellung von State-basiertem Routing auf `react-router-dom`:

```
/                          → Segment-Auswahl oder Landing
/stadtfuehrer              → Landing für Stadtführer
/agenturen                 → Landing für Agenturen
/veranstalter              → Landing für Veranstalter
/kreuzfahrt                → Landing für Kreuzfahrt
/enterprise                → Landing für Großveranstalter
/sales                     → Sales-Kalkulator (nach Login/Registration)
/sales/calculator          → Segment-spezifischer Kalkulator
/sales/saved               → Gespeicherte Angebote
/sales/contact             → Anfrage senden / Demo anfordern
/howto                     → Anleitung für app.guidetranslator.com
/app                       → Direkt-Link zu app.guidetranslator.com
/admin                     → Admin-Dashboard (bestehend, erweitert)
/admin/accounts            → Account-Verwaltung (NEU)
/admin/templates           → E-Mail-Vorlagen Verwaltung
/dashboard                 → Kunden-Dashboard (Nutzung, Sub-Accounts)
/dashboard/usage           → Nutzungsübersicht
/dashboard/team            → Sub-Accounts/Guides verwalten
/dashboard/billing         → Paket, Credits, Rechnungen
```

**Dateien:**
- `src/Router.jsx` — Haupt-Router
- `package.json` — `react-router-dom` hinzufügen
- `vercel.json` — SPA Rewrites anpassen

---

## Phase 2: Zielgruppen-Differenzierung

### 2.1 Segment-Konfiguration

Neue Datei `src/config/segments.js`:

```js
export const SEGMENTS = {
  stadtfuehrer: {
    id: 'stadtfuehrer',
    label: 'Stadtführer',
    icon: 'mic',
    color: '#27ae60',
    calcParams: {
      // Touren pro Monat, Minuten pro Tour, Sprachen, Hörer pro Tour
      fields: ['toursPerMonth', 'minutesPerTour', 'languages', 'listenersPerTour'],
      defaults: { toursPerMonth: 20, minutesPerTour: 90, languages: 3, listenersPerTour: 15 },
    },
    templates: { invite: 'stadtfuehrer_invite', followup: 'stadtfuehrer_followup' },
    pricingTiers: ['free', 'starter_guide', 'pro_guide'],
  },
  agentur: {
    id: 'agentur',
    label: 'Agentur',
    icon: 'users',
    color: '#2a9bc0',
    calcParams: {
      fields: ['guides', 'toursPerGuideMonth', 'minutesPerTour', 'languages', 'avgListeners'],
      defaults: { guides: 5, toursPerGuideMonth: 15, minutesPerTour: 90, languages: 5, avgListeners: 20 },
    },
    templates: { invite: 'agentur_invite', followup: 'agentur_followup' },
    pricingTiers: ['starter_agency', 'pro_agency', 'enterprise_agency'],
  },
  veranstalter: {
    id: 'veranstalter',
    label: 'Veranstalter',
    icon: 'chart',
    color: '#e67e22',
    calcParams: {
      fields: ['eventsPerMonth', 'hoursPerEvent', 'languages', 'avgAttendees'],
      defaults: { eventsPerMonth: 4, hoursPerEvent: 3, languages: 4, avgAttendees: 200 },
    },
    templates: { invite: 'veranstalter_invite', followup: 'veranstalter_followup' },
    pricingTiers: ['starter_event', 'pro_event', 'enterprise_event'],
  },
  kreuzfahrt: {
    id: 'kreuzfahrt',
    label: 'Kreuzfahrt',
    icon: 'ship',
    color: '#c8a84e',
    calcParams: {
      // BESTEHEND — behalten wie aktuell
      fields: ['ships', 'paxPerShip', 'excursionDays', 'excursionsPerDay', 'paxParticipation', 'guideMinsPerExcursion', 'languages', 'costPerGuideDay', 'ttsQuality'],
      defaults: { ships: 5, paxPerShip: 4000, excursionDays: 200, excursionsPerDay: 2, paxParticipation: 60, guideMinsPerExcursion: 90, languages: 8, costPerGuideDay: 350, ttsQuality: 'neural2' },
    },
    templates: { invite: 'intro', followup: 'followup', demo: 'demo' },
    pricingTiers: ['fleet_starter', 'fleet_pro', 'fleet_enterprise'],
  },
  grossveranstalter: {
    id: 'grossveranstalter',
    label: 'Großveranstalter',
    icon: 'ship',
    color: '#9b59b6',
    calcParams: {
      fields: ['venues', 'eventsPerVenueMonth', 'hoursPerEvent', 'languages', 'avgAttendees'],
      defaults: { venues: 3, eventsPerVenueMonth: 8, hoursPerEvent: 4, languages: 6, avgAttendees: 500 },
    },
    templates: { invite: 'enterprise_invite', followup: 'enterprise_followup' },
    pricingTiers: ['enterprise_custom'],
  },
  fintutto_single: {
    id: 'fintutto_single',
    label: 'Einzelnutzer',
    sublabel: 'portal.fintutto.cloud',
    icon: 'users',
    color: '#1a6b8a',
    userTypes: ['Vermieter', 'Mieter', 'Handwerker', 'Bodybuilder', 'Pflanzenliebhaber', 'Investoren', 'bescheidboxer.de Nutzer'],
    calcParams: {
      fields: ['minutesPerMonth', 'languages', 'listeners'],
      defaults: { minutesPerMonth: 20, languages: 1, listeners: 1 },
    },
    templates: { invite: 'fintutto_invite' },
    pricingTiers: ['free_trial', 'fintutto_basic', 'fintutto_pro'],
  },
};
```

### 2.2 Segment-spezifische Landing Pages

`src/pages/SegmentLanding.jsx` — Dynamische Landing Page basierend auf Segment:
- Headline/Subline angepasst
- Pain Points segment-spezifisch
- Kalkulator-Vorschau mit passenden Parametern
- CTA → `/sales?segment=kreuzfahrt` (oder jeweiliges Segment)

### 2.3 Segment-spezifischer Kalkulator

`src/pages/SegmentCalculator.jsx` — Generischer Kalkulator der:
- Parameter aus `segments.js` liest
- Passende Slider/Felder rendert
- Segment-spezifische Berechnung durchführt
- Bestehende Kreuzfahrt-Logik als Spezialfall behält

### 2.4 E-Mail-Templates pro Segment

Erweiterung `src/Admin.jsx` — Templates werden nach Segment gruppiert:
- Pro Segment: Einladung, Follow-up, Demo-Einladung, Angebots-Template
- Platzhalter angepasst: `{{segment_label}}`, `{{calc_summary}}`

---

## Phase 3: Sales-Flow Optimierung

### 3.1 Neuer Flow: Angebot → Test → Follow-up

**Aktuell:** Landing → Register → Calculator → Speichern → Angebot
**Neu:**

```
Landing (Segment) → Register → Calculator → Speichern →
  → "Angebot anfordern" ODER "Demo anfordern"
    → Angebot wird erstellt & gespeichert (Status: "Angebot erstellt")
    → DANACH erst: "Jetzt direkt testen" (Link zu app.guidetranslator.com)
      → Status: "Getestet"
    → ODER: "Später testen"
      → Kalender-Eintrag anbieten (.ics Download mit Link zur App)
      → Status: "Testet später"
      → Nach 7 Tagen ohne Test:
        → Automatische Follow-up Mail im Dashboard vorbereiten
        → Status: "Erinnert zum Test"
```

**Dateien:**
- `src/pages/PostOffer.jsx` — Seite nach Angebotsversand
  - Button: "Jetzt testen" → Link zu app.guidetranslator.com
  - Button: "Später testen" → .ics Kalender-Download
  - Auto-Tracking in Supabase
- `src/pages/HowTo.jsx` — `/howto` Seite (Anleitung für App)

**Neue Supabase-Felder in gt_leads:**
```sql
ALTER TABLE gt_leads ADD COLUMN offer_created_at TIMESTAMPTZ;
ALTER TABLE gt_leads ADD COLUMN tested_at TIMESTAMPTZ;
ALTER TABLE gt_leads ADD COLUMN test_reminder_sent_at TIMESTAMPTZ;
```

### 3.2 /howto Seite

`src/pages/HowTo.jsx` — Anleitung für app.guidetranslator.com:
- Schritt-für-Schritt mit Screenshots/Illustrationen
- Segment-spezifische Hinweise
- Direkter Link zu app.guidetranslator.com
- FAQ-Bereich

### 3.3 Automatisches Follow-up System

Erweiterung `api/check-followups.js` (Vercel Cron Job):
- Täglich prüfen: Leads mit `offer_created_at` > 7 Tage UND `tested_at` IS NULL
- E-Mail im Dashboard als "zu senden" markieren
- Status-Änderung vorbereiten
- Admin erhält Übersicht im "Empfohlene Aktionen" Widget

Erweiterung `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/check-followups",
    "schedule": "0 8 * * *"
  }]
}
```

---

## Phase 4: Pricing & Stripe

### 4.1 Kostenanalyse (VOR Preisgestaltung!)

**Zu überprüfende Kosten:**
1. **Google Cloud Translation API:** $20/Mio Zeichen
2. **Google Cloud Text-to-Speech:**
   - WaveNet: $4/Mio Zeichen
   - Neural2: $16/Mio Zeichen
   - Chirp 3 HD: $30/Mio Zeichen
3. **Server/Infrastruktur:**
   - Vercel (Frontend): Pro Plan ~$20/Monat
   - Supabase: Pro Plan ~$25/Monat
   - app.guidetranslator.com Server-Kosten (noch zu klären)
4. **Bandbreite:** Audio-Streaming zu Hörern

**Hochrechnung pro Nutzungseinheit:**
- 1 Minute Guide-Sprache ≈ 900 Zeichen
- Translation: 900 × Anzahl_Sprachen × $0.00002 = Kosten
- TTS: 900 × Anzahl_Sprachen × $0.000016 (Neural2) = Kosten
- **Beispiel:** 90 min, 5 Sprachen = 90 × 900 × 5 × ($0.00002 + $0.000016) ≈ $1.46

### 4.2 Tier/Paket-Struktur

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        KOSTENLOSE STUFEN                                │
├─────────────────────────────────────────────────────────────────────────┤
│ ANONYM (ohne Anmeldung)                                                 │
│   5 Minuten, 1 Sprache, 1 Hörer — einmalig (IP-basiert)               │
├─────────────────────────────────────────────────────────────────────────┤
│ FREE (mit Anmeldung)                                                    │
│   20 Minuten/Monat, 1 Sprache, 1 Hörer                                │
├─────────────────────────────────────────────────────────────────────────┤
│                        EINZEL-PAKETE                                    │
├─────────────────────────────────────────────────────────────────────────┤
│ STARTER         €19/Monat                                               │
│   120 Min, 3 Sprachen, 5 Hörer                                        │
│   → Stadtführer, Fintutto-Einzelnutzer                                 │
├─────────────────────────────────────────────────────────────────────────┤
│ PRO             €49/Monat                                               │
│   500 Min, 10 Sprachen, 25 Hörer                                      │
│   → Aktive Stadtführer, kleine Agenturen                               │
├─────────────────────────────────────────────────────────────────────────┤
│ BUSINESS        €149/Monat                                              │
│   2.000 Min, 20 Sprachen, 100 Hörer                                   │
│   → Agenturen, Veranstalter                                            │
├─────────────────────────────────────────────────────────────────────────┤
│ ENTERPRISE      €499/Monat                                              │
│   10.000 Min, 30 Sprachen, 500 Hörer                                  │
│   Sub-Accounts für Guides, Dashboard                                    │
│   → Kreuzfahrt, Großveranstalter                                       │
├─────────────────────────────────────────────────────────────────────────┤
│ CUSTOM          Auf Anfrage                                             │
│   Unbegrenzt, alle Sprachen, unbegrenzt Hörer                          │
│   → Großflotten, Konzerne                                              │
├─────────────────────────────────────────────────────────────────────────┤
│                        ADD-ONS / CREDITS                                │
├─────────────────────────────────────────────────────────────────────────┤
│ +100 Minuten:      €9                                                   │
│ +500 Minuten:      €39                                                  │
│ +5 Sprachen:       €15/Monat                                           │
│ +50 Hörer:         €19/Monat                                           │
│ +1 Sub-Account:    €9/Monat                                            │
└─────────────────────────────────────────────────────────────────────────┘
```

**WICHTIG:** Diese Preise sind Vorschläge und müssen nach der genauen Kostenanalyse
(Phase 4.1) validiert werden!

### 4.3 Stripe Integration

**Stripe Produkte/Preise anlegen:**

```
Produkte:
  - GuideTranslator Starter  (recurring monthly)
  - GuideTranslator Pro      (recurring monthly)
  - GuideTranslator Business (recurring monthly)
  - GuideTranslator Enterprise (recurring monthly)
  - Minutes Add-On 100       (one-time)
  - Minutes Add-On 500       (one-time)
  - Languages Add-On         (recurring monthly)
  - Listeners Add-On         (recurring monthly)
  - Sub-Account Add-On       (recurring monthly)
```

**Neue Dateien:**
- `api/stripe-webhook.js` — Stripe Webhook Handler
- `api/stripe-checkout.js` — Checkout Session erstellen
- `api/stripe-portal.js` — Kunden-Portal öffnen

**Env-Variablen:**
```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PUBLISHABLE_KEY (VITE_)
```

### 4.4 Nutzungs-Tracking

**Neue Tabelle:**
```sql
CREATE TABLE gt_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES gt_organizations(id),
  user_id UUID REFERENCES gt_profiles(id),
  session_id TEXT,
  minutes_used NUMERIC NOT NULL DEFAULT 0,
  languages_used INTEGER NOT NULL DEFAULT 1,
  listeners_count INTEGER NOT NULL DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE gt_usage_limits (
  org_id UUID PRIMARY KEY REFERENCES gt_organizations(id),
  minutes_total INTEGER NOT NULL DEFAULT 0,  -- Gesamtbudget
  minutes_used INTEGER NOT NULL DEFAULT 0,
  languages_max INTEGER NOT NULL DEFAULT 1,
  listeners_max INTEGER NOT NULL DEFAULT 1,
  sub_accounts_max INTEGER NOT NULL DEFAULT 0,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ
);
```

**API Endpunkt für App:**
- `api/track-usage.js` — Von app.guidetranslator.com aufgerufen
  - Authentifiziert per API-Key
  - Trackt Minuten, Sprachen, Hörer
  - Prüft Limits, gibt 402 zurück wenn erschöpft

---

## Phase 5: Kunden-Dashboard

### 5.1 Dashboard-Seiten

**`src/pages/dashboard/DashboardOverview.jsx`:**
- Aktuelle Nutzung (Minuten, Sprachen, Hörer) als Balken/Gauges
- Verbleibendes Kontingent
- Letzten Aktivitäten
- Quick-Actions: Upgrade, Credits kaufen

**`src/pages/dashboard/DashboardUsage.jsx`:**
- Nutzung nach Tag/Woche/Monat
- Pro Sub-Account/Guide aufgeschlüsselt
- Export als CSV

**`src/pages/dashboard/DashboardTeam.jsx`:**
- Sub-Accounts (Guides) erstellen/verwalten
- Nutzung pro Guide
- Limits pro Guide setzen

**`src/pages/dashboard/DashboardBilling.jsx`:**
- Aktuelles Paket
- Stripe Customer Portal (Upgrade, Kündigung, Rechnungen)
- Credit-Käufe
- Einzelne Sprachen/Minuten/Hörer hinzufügen

### 5.2 Hörer OHNE Anmeldung (aber COUNT)

- Hörer in app.guidetranslator.com brauchen KEINEN Account
- Sie scannen QR-Code → Web-App öffnet sich
- Session wird per UUID getrackt (kein Login nötig)
- Concurrent Listeners werden gezählt und ans Usage-Tracking gemeldet
- Für Abrechnung: Max concurrent listeners pro Session

---

## Phase 6: Admin-Dashboard Erweiterung

### 6.1 Account-Verwaltung

Erweiterung von `/admin`:
- **Tab: Accounts** — Alle Benutzer, Rollen zuweisen
  - Super-Admin kann Admin-Accounts anlegen
  - Admin kann Sales-Accounts anlegen
  - Einladungen per E-Mail (mit Rollen-Zuweisung)
- **Tab: Organisationen** — Alle Organisationen, Pakete, Nutzung
- **Tab: Nutzung** — Globale Nutzungsübersicht, Top-Verbraucher

### 6.2 Erweiterte Pipeline

Neue Pipeline-Stufen:
```
Neu → Eingeladen → Registriert → Kalkulation → Angebot erstellt →
  → Getestet → Demo → Verhandlung → Gewonnen/Verloren
  → Testet später → Erinnert zum Test → Getestet → ...
```

### 6.3 Automatische Status-Updates

Das Dashboard zeigt automatisch:
- "Angebot erstellt" — wenn Kalkulation gespeichert + Anfrage gesendet
- "Getestet" — wenn app.guidetranslator.com genutzt
- "Testet später" — wenn "Später testen" gewählt
- "Erinnert zum Test" — wenn Follow-up Mail versendet (7 Tage nach Angebot)

---

## Implementierungsreihenfolge (Empfohlen)

| # | Phase | Beschreibung | Abhängigkeiten |
|---|-------|-------------|----------------|
| 1 | **1.2** | React Router einführen | — |
| 2 | **2.1** | Segment-Konfiguration | 1 |
| 3 | **2.2** | Segment-spezifische Landings | 1, 2 |
| 4 | **2.3** | Segment-spezifischer Kalkulator | 2 |
| 5 | **3.1** | Sales-Flow (Angebot → Test → Follow-up) | 4 |
| 6 | **3.2** | /howto Seite | 1 |
| 7 | **2.4** | E-Mail-Templates pro Segment | 2 |
| 8 | **1.1** | Supabase Auth + Rollen | — |
| 9 | **6.1** | Admin Account-Verwaltung | 8 |
| 10 | **4.1** | Kostenanalyse | — (Recherche) |
| 11 | **4.2** | Tier/Paket-Struktur finalisieren | 10 |
| 12 | **4.3** | Stripe Integration | 11 |
| 13 | **4.4** | Nutzungs-Tracking | 8, 12 |
| 14 | **5.1** | Kunden-Dashboard | 8, 13 |
| 15 | **5.2** | Hörer-Tracking | 13 |
| 16 | **6.2+6.3** | Admin-Erweiterungen | 5, 8 |
| 17 | **3.3** | Automatische Follow-ups (Cron) | 5 |

---

## Neue Dateien (Übersicht)

```
src/
├── Router.jsx                          # React Router Setup
├── config/
│   └── segments.js                     # Segment-Definitionen
├── auth/
│   ├── AuthProvider.jsx                # Supabase Auth Context
│   ├── LoginPage.jsx                   # Login/Register
│   └── ProtectedRoute.jsx             # Rollen-basierte Zugriffskontrolle
├── pages/
│   ├── SegmentLanding.jsx             # Dynamische Segment-Landing
│   ├── SegmentCalculator.jsx          # Segment-spezifischer Kalkulator
│   ├── PostOffer.jsx                  # Nach-Angebot Seite (Test/Später)
│   ├── HowTo.jsx                      # /howto Anleitung
│   └── dashboard/
│       ├── DashboardOverview.jsx      # Nutzungsübersicht
│       ├── DashboardUsage.jsx         # Detaillierte Nutzung
│       ├── DashboardTeam.jsx          # Sub-Accounts verwalten
│       └── DashboardBilling.jsx       # Stripe Portal, Credits
├── Admin.jsx                           # (erweitert: Accounts, Orgs)
└── App.jsx                             # (refactored zu Router)

api/
├── send-email.js                       # (bestehend, erweitert)
├── stripe-webhook.js                   # Stripe Events
├── stripe-checkout.js                  # Checkout Sessions
├── stripe-portal.js                    # Kunden-Portal
├── track-usage.js                      # Nutzungs-Tracking API
├── check-followups.js                  # Cron: Auto Follow-ups
└── auth-hook.js                        # Post-Registration Hook
```

---

## Offene Fragen (vor Implementierung zu klären)

1. **Kosten app.guidetranslator.com Server:** Was läuft dort, welche Infrastruktur?
2. **Preise validieren:** Sind die vorgeschlagenen Preise nach Kostenanalyse tragfähig?
3. **Fintutto-Integration:** Wie genau ist portal.fintutto.cloud angebunden? Shared Auth?
4. **Großvolumen-Einsatz:** Welche Google Cloud Quotas/Commitments bestehen?
5. **Stripe Account:** Existiert bereits ein Stripe Account? Test/Live?
6. **Kalender-Integration:** Nur .ics Download oder Google Calendar API?
7. **app.guidetranslator.com:** Kann die App Usage-Events an unsere API senden?
