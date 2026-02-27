// ═══════════════════════════════════════════════════════════════
// PRICING TIERS — Stripe-ready, Segment-übergreifend
// ═══════════════════════════════════════════════════════════════

export const PRICING_TIERS = {
  // ─── Individual / Stadtführer / Fintutto ──────
  free: {
    id: "free",
    name: "Free",
    price: 0,
    interval: "month",
    stripePriceId: null, // no Stripe — IP-based
    badge: "Kostenlos",
    limits: {
      minutes: 5,
      languages: 3,
      listeners: 5,
      subAccounts: 0,
    },
    features: [
      "5 Minuten / Sitzung",
      "3 Sprachen",
      "Bis zu 5 Hörer",
      "IP-basierter Zugang",
      "Keine Anmeldung nötig",
    ],
    restrictions: ["Wasserzeichen / Hinweis", "Keine gespeicherten Sitzungen"],
  },
  starter: {
    id: "starter",
    name: "Starter",
    price: 19,
    interval: "month",
    stripePriceId: "price_1T51ek52lqSgjCzeuIeICocy",
    badge: "Beliebt",
    limits: {
      minutes: 120,
      languages: 10,
      listeners: 20,
      subAccounts: 0,
    },
    features: [
      "120 Min / Monat",
      "10 Sprachen",
      "Bis zu 20 Hörer",
      "Eigenes Dashboard",
      "Sitzungsverlauf",
      "E-Mail-Support",
    ],
    restrictions: [],
  },
  pro: {
    id: "pro",
    name: "Professional",
    price: 49,
    interval: "month",
    stripePriceId: "price_1T51ek52lqSgjCzeW2zweQle",
    badge: null,
    limits: {
      minutes: 500,
      languages: 30,
      listeners: 50,
      subAccounts: 3,
    },
    features: [
      "500 Min / Monat",
      "30 Sprachen",
      "Bis zu 50 Hörer",
      "3 Sub-Accounts (Guides)",
      "Prioritäts-Support",
      "Analytics-Dashboard",
      "Eigene Begrüßung",
    ],
    restrictions: [],
  },

  // ─── Business / Agentur ──────────────────────
  business: {
    id: "business",
    name: "Business",
    price: 149,
    interval: "month",
    stripePriceId: "price_1T51ek52lqSgjCze5T0497Og",
    badge: "Empfohlen",
    limits: {
      minutes: 2000,
      languages: 50,
      listeners: 200,
      subAccounts: 15,
    },
    features: [
      "2.000 Min / Monat",
      "50 Sprachen",
      "Bis zu 200 Hörer",
      "15 Guide-Accounts",
      "Team-Dashboard",
      "Dedizierter Support",
      "Eigenes Branding",
      "API-Zugang",
    ],
    restrictions: [],
  },

  // ─── Enterprise / Großveranstalter ───────────
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    price: 499,
    interval: "month",
    stripePriceId: "price_1T51el52lqSgjCzeSxSZHZ21",
    badge: "Premium",
    limits: {
      minutes: 10000,
      languages: 130,
      listeners: 2000,
      subAccounts: 50,
    },
    features: [
      "10.000 Min / Monat",
      "130+ Sprachen",
      "Bis zu 2.000 Hörer",
      "50 Guide-Accounts",
      "Enterprise Dashboard",
      "24/7 Priority Support",
      "Custom Branding",
      "API + Webhooks",
      "SLA-Garantie",
      "Dedizierter Ansprechpartner",
    ],
    restrictions: [],
  },

  // ─── Kreuzfahrt / Fleet ──────────────────────
  fleet_starter: {
    id: "fleet_starter",
    name: "Fleet Starter",
    price: 299,
    interval: "month",
    stripePriceId: "price_1T51el52lqSgjCzeCSoj2LBz",
    badge: null,
    limits: {
      minutes: 5000,
      ships: 2,
      languages: 30,
      listeners: 500,
      subAccounts: 10,
    },
    features: [
      "Bis zu 2 Schiffe",
      "5.000 Min / Monat",
      "30 Sprachen",
      "500 Hörer gleichzeitig",
      "10 Guide-Accounts",
      "Fleet Dashboard",
      "E-Mail + Chat Support",
    ],
    restrictions: [],
  },
  fleet_pro: {
    id: "fleet_pro",
    name: "Fleet Professional",
    price: 799,
    interval: "month",
    stripePriceId: "price_1T51em52lqSgjCzek7VTl2Pp",
    badge: "Empfohlen",
    limits: {
      minutes: 20000,
      ships: 10,
      languages: 80,
      listeners: 2000,
      subAccounts: 50,
    },
    features: [
      "Bis zu 10 Schiffe",
      "20.000 Min / Monat",
      "80 Sprachen",
      "2.000 Hörer gleichzeitig",
      "50 Guide-Accounts",
      "Advanced Analytics",
      "Priority Support",
      "Eigenes Branding",
      "API-Zugang",
    ],
    restrictions: [],
  },
  fleet_enterprise: {
    id: "fleet_enterprise",
    name: "Fleet Enterprise",
    price: null, // Auf Anfrage
    interval: "month",
    stripePriceId: null,
    badge: "Individuell",
    limits: {
      minutes: null, // Unlimited
      ships: null,
      languages: 130,
      listeners: null,
      subAccounts: null,
    },
    features: [
      "Unbegrenzte Schiffe",
      "Unbegrenzte Minuten",
      "130+ Sprachen",
      "Unbegrenzte Hörer",
      "Unbegrenzte Guide-Accounts",
      "Dedizierter Account Manager",
      "24/7 Priority Support",
      "Custom Integration",
      "SLA + Verfügbarkeitsgarantie",
      "Onboarding-Schulung",
    ],
    restrictions: [],
  },

  // ─── Custom (Enterprise Individual) ──────────
  custom: {
    id: "custom",
    name: "Custom",
    price: null,
    interval: "month",
    stripePriceId: null,
    badge: "Auf Anfrage",
    limits: {},
    features: [
      "Individuelles Paket",
      "Maßgeschneiderte Limits",
      "Dedizierter Ansprechpartner",
      "Custom Integration & API",
      "SLA nach Vereinbarung",
    ],
    restrictions: [],
  },
};

// ─── Add-Ons (Zusatzkontingente) ──────────────
export const ADDONS = {
  extra_minutes_100: { id: "extra_minutes_100", name: "+100 Minuten", price: 9, stripePriceId: "price_1T51em52lqSgjCzeAsDAg0Kj" },
  extra_minutes_500: { id: "extra_minutes_500", name: "+500 Minuten", price: 39, stripePriceId: "price_1T51em52lqSgjCzeQWJF4WzY" },
  extra_minutes_2000: { id: "extra_minutes_2000", name: "+2.000 Minuten", price: 129, stripePriceId: "price_1T51en52lqSgjCzembwJ7Hwu" },
  extra_listeners_50: { id: "extra_listeners_50", name: "+50 Hörer", price: 19, stripePriceId: "price_1T51en52lqSgjCzerhJNQGv4" },
  extra_subaccounts_5: { id: "extra_subaccounts_5", name: "+5 Sub-Accounts", price: 29, stripePriceId: "price_1T51eo52lqSgjCzeuOhScCRj" },
};

// ─── Helpers ──────────────────────────────────
export function getTier(tierId) {
  return PRICING_TIERS[tierId] || null;
}

export function getTiersForSegment(segmentId) {
  const SEGMENT_TIERS = {
    stadtfuehrer: ["free", "starter", "pro"],
    agentur: ["starter", "pro", "business"],
    veranstalter: ["pro", "business", "enterprise"],
    kreuzfahrt: ["fleet_starter", "fleet_pro", "fleet_enterprise"],
    enterprise: ["enterprise", "custom"],
    fintutto: ["free", "starter", "pro"],
  };
  return (SEGMENT_TIERS[segmentId] || ["starter", "pro", "business"]).map(id => PRICING_TIERS[id]).filter(Boolean);
}

export function formatPrice(price) {
  if (price === null || price === undefined) return "Auf Anfrage";
  if (price === 0) return "Kostenlos";
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(price);
}
