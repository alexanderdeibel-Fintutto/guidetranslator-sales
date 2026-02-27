// ═══════════════════════════════════════════════════════════════
// SEGMENT DEFINITIONS — 6 Zielgruppen
// ═══════════════════════════════════════════════════════════════

export const SEGMENTS = {
  stadtfuehrer: {
    id: "stadtfuehrer",
    label: "Stadtführer",
    sublabel: "Einzelne Guides",
    icon: "mic",
    color: "#27ae60",
    hero: {
      badge: "Für Stadtführer & Tour Guides",
      headline: ["Ihr Guide spricht eine Sprache.", "Alle Gäste verstehen."],
      sub: "KI-gestützte Echtzeit-Übersetzung für Stadtführungen — in über 130 Sprachen, sofort einsatzbereit auf dem Smartphone Ihrer Gäste.",
      stats: [
        { num: "130+", label: "Sprachen", sub: "in Echtzeit" },
        { num: "€19", label: "/Monat", sub: "ab Starter" },
        { num: "<1¢", label: "pro Gast", sub: "pro Tour" },
        { num: "2-4s", label: "Latenz", sub: "Echtzeit" },
      ],
    },
    painPoints: [
      { icon: "globe", title: "Sprachbarriere", desc: "Ihre Tour ist auf 1-2 Sprachen begrenzt. Internationale Gäste gehen verloren." },
      { icon: "money", title: "Umsatz-Limit", desc: "Ohne Mehrsprachigkeit können Sie nur einen Bruchteil des Marktes bedienen." },
      { icon: "users", title: "Gruppen-Limit", desc: "Gemischte Gruppen sind schwer zu managen — verschiedene Sprachen, ein Guide." },
      { icon: "chart", title: "Konkurrenz", desc: "Mehrsprachige Guides haben den Vorteil. Mit KI haben Sie 130+ Sprachen." },
    ],
    comparison: {
      old: ["1-2 Sprachen pro Tour", "Internationale Gäste ausgeschlossen", "Gemischte Gruppen = Chaos", "Umsatz limitiert"],
      new: ["130+ Sprachen gleichzeitig", "Jeder Gast in seiner Sprache", "Eine Tour, alle verstehen", "Neuer Markt: internationale Touristen"],
    },
    calcParams: [
      { name: "toursPerMonth", label: "Touren pro Monat", min: 1, max: 60, default: 20 },
      { name: "minutesPerTour", label: "Minuten pro Tour", min: 15, max: 240, default: 90, unit: " min" },
      { name: "languages", label: "Zielsprachen", min: 1, max: 20, default: 3 },
      { name: "listenersPerTour", label: "Hörer pro Tour", min: 1, max: 50, default: 15 },
    ],
    calcGroups: [
      { title: "Ihre Touren", icon: "mic", params: ["toursPerMonth", "minutesPerTour"] },
      { title: "Übersetzung", icon: "globe", params: ["languages", "listenersPerTour"] },
    ],
    registerFields: {
      roleLabel: "Ihre Tätigkeit",
      roleOpts: ["Freier Stadtführer", "Angestellter Guide", "Reiseleiter", "Museum/Attraktion", "Sonstige"],
      sizeLabel: "Touren pro Woche",
      sizeOpts: ["1-3", "4-10", "11-20", "20+"],
    },
    emailTemplatePrefix: "stadtfuehrer",
    pricingTiers: ["free", "starter", "pro"],
  },

  agentur: {
    id: "agentur",
    label: "Agenturen",
    sublabel: "Reise- & Touragenturen",
    icon: "users",
    color: "#2a9bc0",
    hero: {
      badge: "Für Reise- & Touragenturen",
      headline: ["Ein Guide-Team.", "Alle Sprachen der Welt."],
      sub: "Skalieren Sie Ihr Angebot auf 130+ Sprachen — ohne zusätzliche Guides einstellen zu müssen.",
      stats: [
        { num: "93%", label: "Kostenersparnis", sub: "vs. mehrsprachige Guides" },
        { num: "130+", label: "Sprachen", sub: "ab sofort verfügbar" },
        { num: "€149", label: "/Monat", sub: "ab Business" },
        { num: "∞", label: "Skalierung", sub: "beliebig viele Guides" },
      ],
    },
    painPoints: [
      { icon: "users", title: "Guide-Mangel", desc: "Mehrsprachige Guides sind rar und teuer. In der Hochsaison fast unmöglich zu finden." },
      { icon: "money", title: "Personalkosten", desc: "Pro Sprache ein Guide = explodierende Kosten bei internationalen Gruppen." },
      { icon: "globe", title: "Markt-Limit", desc: "Ohne breites Sprachangebot verlieren Sie internationale Buchungsportale." },
      { icon: "chart", title: "Qualitätskontrolle", desc: "Verschiedene Guides = unterschiedliche Qualität. Standardisierung ist teuer." },
    ],
    comparison: {
      old: ["Pro Sprache ein Guide nötig", "Hohe Personalkosten", "Begrenzte Sprachauswahl", "Qualität variiert"],
      new: ["Ein Guide + KI = alle Sprachen", "Fixe Monatslizenz statt Tagessätze", "130+ Sprachen sofort", "Standardisierte, geprüfte Inhalte"],
    },
    calcParams: [
      { name: "guides", label: "Anzahl Guides", min: 1, max: 50, default: 5 },
      { name: "toursPerGuideMonth", label: "Touren pro Guide/Monat", min: 1, max: 30, default: 15 },
      { name: "minutesPerTour", label: "Minuten pro Tour", min: 15, max: 240, default: 90, unit: " min" },
      { name: "languages", label: "Zielsprachen", min: 1, max: 30, default: 5 },
      { name: "avgListeners", label: "Ø Hörer pro Tour", min: 5, max: 100, default: 20 },
      { name: "costPerGuideDay", label: "Kosten/Guide/Tag (traditionell)", min: 100, max: 800, default: 300, format: "eur" },
    ],
    calcGroups: [
      { title: "Ihr Team", icon: "users", params: ["guides", "toursPerGuideMonth"] },
      { title: "Tour-Parameter", icon: "globe", params: ["minutesPerTour", "languages", "avgListeners", "costPerGuideDay"] },
    ],
    registerFields: {
      roleLabel: "Ihre Position",
      roleOpts: ["Geschäftsführung", "Operations Manager", "Tour-Koordinator", "Vertrieb", "Sonstige"],
      sizeLabel: "Agentur-Größe",
      sizeOpts: ["1-5 Guides", "6-15 Guides", "16-30 Guides", "30+ Guides"],
    },
    emailTemplatePrefix: "agentur",
    pricingTiers: ["starter", "pro", "business"],
  },

  veranstalter: {
    id: "veranstalter",
    label: "Veranstalter",
    sublabel: "Events & Konferenzen",
    icon: "chart",
    color: "#e67e22",
    hero: {
      badge: "Für Event-Veranstalter",
      headline: ["Ein Redner.", "Hunderte verstehen."],
      sub: "Echtzeit-Übersetzung für Konferenzen, Messen und Events — ohne teure Dolmetscher-Kabinen.",
      stats: [
        { num: "90%", label: "Günstiger", sub: "als Simultandolmetscher" },
        { num: "130+", label: "Sprachen", sub: "gleichzeitig" },
        { num: "0", label: "Hardware", sub: "Gäste nutzen ihr Smartphone" },
        { num: "2-4s", label: "Latenz", sub: "nahezu live" },
      ],
    },
    painPoints: [
      { icon: "money", title: "Dolmetscher-Kosten", desc: "€800-1.500 pro Dolmetscher pro Tag. Bei 5 Sprachen: bis zu €7.500 pro Event." },
      { icon: "globe", title: "Technik-Aufwand", desc: "Dolmetscher-Kabinen, Headsets, Empfänger — teuer und logistisch aufwendig." },
      { icon: "users", title: "Teilnehmer-Limit", desc: "Ohne Übersetzung kommen internationale Teilnehmer erst gar nicht." },
      { icon: "chart", title: "Skalierung", desc: "Jede Sprache braucht eigene Kabine, eigene Technik, eigenen Dolmetscher." },
    ],
    comparison: {
      old: ["€800-1.500/Dolmetscher/Tag", "Dolmetscher-Kabinen + Headsets", "Max. 5-6 Sprachen", "Wochen Vorlauf für Buchung"],
      new: ["Fixe Monatslizenz", "Kein Equipment — Smartphone reicht", "130+ Sprachen sofort", "In 5 Minuten eingerichtet"],
    },
    calcParams: [
      { name: "eventsPerMonth", label: "Events pro Monat", min: 1, max: 30, default: 4 },
      { name: "hoursPerEvent", label: "Stunden pro Event", min: 1, max: 12, default: 3 },
      { name: "languages", label: "Zielsprachen", min: 1, max: 30, default: 4 },
      { name: "avgAttendees", label: "Ø Teilnehmer", min: 10, max: 2000, default: 200, step: 10 },
      { name: "costPerInterpreterDay", label: "Kosten/Dolmetscher/Tag", min: 400, max: 2000, default: 1000, format: "eur" },
    ],
    calcGroups: [
      { title: "Ihre Events", icon: "chart", params: ["eventsPerMonth", "hoursPerEvent"] },
      { title: "Übersetzung", icon: "globe", params: ["languages", "avgAttendees", "costPerInterpreterDay"] },
    ],
    registerFields: {
      roleLabel: "Ihre Position",
      roleOpts: ["Geschäftsführung", "Event Manager", "Projektleiter", "Marketing", "Sonstige"],
      sizeLabel: "Events pro Jahr",
      sizeOpts: ["1-10", "11-30", "31-60", "60+"],
    },
    emailTemplatePrefix: "veranstalter",
    pricingTiers: ["pro", "business", "enterprise"],
  },

  kreuzfahrt: {
    id: "kreuzfahrt",
    label: "Kreuzfahrt",
    sublabel: "Reedereien & Flotten",
    icon: "ship",
    color: "#c8a84e",
    hero: {
      badge: "Cruise Line Enterprise Solution",
      headline: ["Ihr Guide spricht eine Sprache.", "Ihre Gäste hören alle."],
      sub: "KI-gestützte Echtzeit-Übersetzung für Landausflüge, Bordprogramme und Shore Excursions — in über 130 Sprachen, für weniger als 1 Cent pro Passagier.",
      stats: [
        { num: "93%", label: "Kostenersparnis", sub: "vs. traditionelle Guides" },
        { num: "130+", label: "Sprachen", sub: "in Echtzeit verfügbar" },
        { num: "<1¢", label: "pro Passagier", sub: "pro Landausflug" },
        { num: "2-4s", label: "Latenz", sub: "Echtzeit-Übersetzung" },
      ],
    },
    painPoints: [
      { icon: "globe", title: "Sprachbarriere", desc: "5-6 Sprachen statt 130+. Japanische, koreanische, arabische Gäste werden ausgeschlossen." },
      { icon: "money", title: "Guide-Kosten", desc: "€200-500 pro Guide pro Tag pro Sprache. 8 Sprachen = bis zu €4.000 pro Ausflug." },
      { icon: "users", title: "Verfügbarkeit", desc: "An exotischen Destinationen gibt es schlicht keine Guides in vielen Sprachen." },
      { icon: "chart", title: "Skalierung", desc: "Jedes neue Schiff, jede neue Route = neue Guides finden. Der Markt wächst, Guides nicht." },
    ],
    comparison: {
      old: ["8 Guides × €300/Tag = €2.400/Ausflug", "Nur 5-6 Sprachen verfügbar", "Qualität nicht kontrollierbar", "€480.000/Schiff/Jahr"],
      new: ["1 Guide + KI = alle Sprachen", "130+ Sprachen sofort verfügbar", "Standardisierte, geprüfte Inhalte", "~€32.500/Schiff/Jahr (-93%)"],
    },
    calcParams: [
      { name: "ships", label: "Anzahl Schiffe", min: 1, max: 50, default: 5 },
      { name: "paxPerShip", label: "Passagiere pro Schiff", min: 500, max: 8000, default: 4000, step: 100 },
      { name: "excursionDays", label: "Ausflugstage pro Jahr", min: 50, max: 350, default: 200 },
      { name: "excursionsPerDay", label: "Ausflüge pro Tag", min: 1, max: 5, default: 2 },
      { name: "paxParticipation", label: "Teilnahmequote", min: 20, max: 90, default: 60, unit: "%" },
      { name: "guideMinsPerExcursion", label: "Guide-Minuten/Ausflug", min: 30, max: 240, default: 90, unit: " min" },
      { name: "languages", label: "Zielsprachen", min: 2, max: 30, default: 8 },
      { name: "costPerGuideDay", label: "Kosten/Guide/Tag (traditionell)", min: 100, max: 800, default: 350, format: "eur" },
    ],
    calcGroups: [
      { title: "Ihre Flotte", icon: "ship", params: ["ships", "paxPerShip", "excursionDays", "excursionsPerDay"] },
      { title: "Ausflug-Parameter", icon: "globe", params: ["paxParticipation", "guideMinsPerExcursion", "languages", "costPerGuideDay"] },
    ],
    registerFields: {
      roleLabel: "Ihre Position",
      roleOpts: ["C-Level / Geschäftsführung", "VP / Director Shore Excursions", "Einkauf / Procurement", "IT / Digital", "Operations", "Hotel Director", "Marketing", "Sonstige"],
      sizeLabel: "Flottengröße",
      sizeOpts: ["1-2 Schiffe", "3-5 Schiffe", "6-10 Schiffe", "11-20 Schiffe", "20+ Schiffe"],
    },
    emailTemplatePrefix: "kreuzfahrt",
    pricingTiers: ["fleet_starter", "fleet_pro", "fleet_enterprise"],
  },

  enterprise: {
    id: "enterprise",
    label: "Großveranstalter",
    sublabel: "Konzerne & Großunternehmen",
    icon: "chart",
    color: "#9b59b6",
    hero: {
      badge: "Enterprise Solution",
      headline: ["Globale Events.", "Lokales Verständnis."],
      sub: "Maßgeschneiderte KI-Übersetzung für Großveranstaltungen, Konzerntourneen und internationale Formate.",
      stats: [
        { num: "90%+", label: "Kostenersparnis", sub: "vs. Dolmetscher-Teams" },
        { num: "130+", label: "Sprachen", sub: "gleichzeitig" },
        { num: "Custom", label: "Integration", sub: "API & Sub-Accounts" },
        { num: "24/7", label: "Support", sub: "dedizierter Ansprechpartner" },
      ],
    },
    painPoints: [
      { icon: "money", title: "Kosten-Explosion", desc: "Dutzende Dolmetscher, Technik-Teams, Equipment — jedes Event wird zum Kostenfaktor." },
      { icon: "globe", title: "Logistik-Albtraum", desc: "Dolmetscher koordinieren, Equipment transportieren, Technik aufbauen — an jedem Venue." },
      { icon: "users", title: "Skalierungs-Problem", desc: "Jedes neue Venue, jedes neue Land = neues Dolmetscher-Team finden." },
      { icon: "chart", title: "Qualitäts-Inkonsistenz", desc: "Verschiedene Dolmetscher = verschiedene Qualität. Markenkonsistenz leidet." },
    ],
    comparison: {
      old: ["€5.000-20.000 pro Event für Dolmetscher", "Wochenlange Planung", "Max. 6-8 Sprachen realistisch", "Equipment muss transportiert werden"],
      new: ["Fixe Enterprise-Lizenz", "In Minuten eingerichtet", "130+ Sprachen sofort", "Zero Equipment — Smartphone reicht"],
    },
    calcParams: [
      { name: "venues", label: "Venues / Standorte", min: 1, max: 20, default: 3 },
      { name: "eventsPerVenueMonth", label: "Events pro Venue/Monat", min: 1, max: 20, default: 8 },
      { name: "hoursPerEvent", label: "Stunden pro Event", min: 1, max: 12, default: 4 },
      { name: "languages", label: "Zielsprachen", min: 2, max: 30, default: 6 },
      { name: "avgAttendees", label: "Ø Teilnehmer", min: 50, max: 5000, default: 500, step: 50 },
      { name: "costPerInterpreterDay", label: "Kosten/Dolmetscher/Tag", min: 400, max: 2000, default: 1200, format: "eur" },
    ],
    calcGroups: [
      { title: "Ihre Venues", icon: "chart", params: ["venues", "eventsPerVenueMonth", "hoursPerEvent"] },
      { title: "Übersetzung", icon: "globe", params: ["languages", "avgAttendees", "costPerInterpreterDay"] },
    ],
    registerFields: {
      roleLabel: "Ihre Position",
      roleOpts: ["C-Level", "VP Operations", "Event Director", "Einkauf", "IT", "Sonstige"],
      sizeLabel: "Unternehmensgröße",
      sizeOpts: ["10-50 MA", "51-200 MA", "201-1000 MA", "1000+ MA"],
    },
    emailTemplatePrefix: "enterprise",
    pricingTiers: ["enterprise", "custom"],
  },

  fintutto: {
    id: "fintutto",
    label: "Einzelnutzer",
    sublabel: "portal.fintutto.cloud",
    icon: "home",
    color: "#1a6b8a",
    hero: {
      badge: "FinTuttO Einzelnutzer",
      headline: ["Sprache verbindet.", "In jeder Situation."],
      sub: "Echtzeit-Übersetzung für den Alltag — ob Vermieter, Mieter, Handwerker oder im Sport. Direkt über portal.fintutto.cloud.",
      stats: [
        { num: "Kostenlos", label: "starten", sub: "20 Min/Monat" },
        { num: "130+", label: "Sprachen", sub: "verfügbar" },
        { num: "€19", label: "/Monat", sub: "ab Starter" },
        { num: "Sofort", label: "nutzbar", sub: "keine Installation" },
      ],
    },
    painPoints: [
      { icon: "globe", title: "Sprachbarriere im Alltag", desc: "Mieter, Handwerker, Geschäftspartner — wenn die Sprache fehlt, wird alles schwieriger." },
      { icon: "money", title: "Dolmetscher zu teuer", desc: "Für ein kurzes Gespräch lohnt sich kein professioneller Dolmetscher." },
      { icon: "users", title: "Apps reichen nicht", desc: "Text-Übersetzer helfen nicht bei Gesprächen. Sie brauchen Echtzeit-Sprache." },
      { icon: "chart", title: "Zeit ist Geld", desc: "Missverständnisse kosten Zeit, Nerven und echtes Geld." },
    ],
    comparison: {
      old: ["Hände und Füße", "Google Translate abtippen", "Professioneller Dolmetscher (€€€)", "Missverständnisse akzeptieren"],
      new: ["Echtzeit-Sprachübersetzung", "Einfach sprechen — KI übersetzt", "Ab €19/Monat statt €500/Termin", "Klare Kommunikation, sofort"],
    },
    userTypes: ["Vermieter", "Mieter", "Handwerker", "Bodybuilder", "Pflanzenliebhaber", "Investoren", "bescheidboxer.de Nutzer"],
    calcParams: [
      { name: "minutesPerMonth", label: "Minuten pro Monat", min: 5, max: 500, default: 20, unit: " min" },
      { name: "languages", label: "Sprachen", min: 1, max: 10, default: 1 },
      { name: "listeners", label: "Hörer", min: 1, max: 10, default: 1 },
    ],
    calcGroups: [
      { title: "Ihre Nutzung", icon: "mic", params: ["minutesPerMonth", "languages", "listeners"] },
    ],
    registerFields: {
      roleLabel: "Nutzung als",
      roleOpts: ["Vermieter", "Mieter", "Handwerker", "Sport/Fitness", "Business", "Sonstige"],
      sizeLabel: "Geschätzte Nutzung",
      sizeOpts: ["Gelegentlich (1-2x/Monat)", "Regelmäßig (1-2x/Woche)", "Häufig (täglich)", "Intensiv (mehrmals täglich)"],
    },
    emailTemplatePrefix: "fintutto",
    pricingTiers: ["free", "starter", "pro"],
  },
};

export const SEGMENT_IDS = Object.keys(SEGMENTS);
export const getSegment = (id) => SEGMENTS[id] || SEGMENTS.kreuzfahrt;
