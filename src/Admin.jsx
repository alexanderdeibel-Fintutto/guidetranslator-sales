import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";

// ─── DESIGN TOKENS (shared with App) ────────────────────────────
const T = {
  navy: "#0a1628", navyLight: "#132038", navyMid: "#1a2d4a",
  gold: "#c8a84e", goldLight: "#e8d48e", goldDark: "#a08030",
  sea: "#1a6b8a", seaLight: "#2a9bc0",
  white: "#f0f2f5", whiteTrue: "#ffffff",
  red: "#e74c3c", green: "#27ae60",
  gray: "#6b7a8d", grayLight: "#94a3b8",
};
const font = `'Playfair Display', Georgia, serif`;
const fontSans = `'DM Sans', 'Segoe UI', sans-serif`;

// ─── ADMIN PASSWORD ─────────────────────────────────────────────
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "guidetranslator2026";

// ─── HELPERS ────────────────────────────────────────────────────
const fmtEur = (n) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const generateToken = () => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 12; i++) token += chars[Math.floor(Math.random() * chars.length)];
  return token;
};

const getAppUrl = () => {
  const url = window.location.origin;
  return url;
};

// ─── EMAIL TEMPLATES ────────────────────────────────────────────
// Placeholders: {{name}}, {{company}}, {{link}}
const DEFAULT_EMAIL_TEMPLATES = [
  {
    id: "intro",
    name: "Ersteinladung",
    subject: "Ihre persönliche Einladung zum GuideTranslator Kalkulator",
    bodyTemplate: `Sehr geehrte/r {{name}},

vielen Dank für Ihr Interesse an GuideTranslator — der KI-gestützten Echtzeit-Übersetzungslösung für Kreuzfahrt-Landausflüge.

Wir haben für Sie einen persönlichen Zugang zu unserem Enterprise-Kalkulator eingerichtet, mit dem Sie die konkreten Einsparungen für {{company}} berechnen können.

Ihr persönlicher Link:
{{link}}

Bitte klicken Sie auf den Link, prüfen Sie Ihre Daten und vergeben Sie ein Passwort. Danach können Sie direkt Ihre individuelle Kostenanalyse erstellen.

Bei Fragen stehen wir Ihnen jederzeit zur Verfügung.

Mit freundlichen Grüßen
Ulrich Deibel
GuideTranslator Enterprise
enterprise@guidetranslator.com`,
    isDefault: true,
  },
  {
    id: "followup",
    name: "Nachfass / Follow-up",
    subject: "Haben Sie schon Ihre Einsparung berechnet?",
    bodyTemplate: `Sehr geehrte/r {{name}},

vor kurzem haben wir Ihnen Ihren persönlichen Zugang zum GuideTranslator Enterprise-Kalkulator eingerichtet. Wir möchten sicherstellen, dass alles funktioniert und Sie Ihre individuelle Kostenanalyse erstellen konnten.

Falls Sie noch nicht dazu gekommen sind — hier nochmals Ihr persönlicher Link:
{{link}}

Unsere Kunden sparen durchschnittlich über 90% gegenüber traditionellen Guide-Kosten. Gerne gehen wir die Ergebnisse gemeinsam durch und erstellen ein maßgeschneidertes Angebot für {{company}}.

Wann hätten Sie Zeit für ein 15-minütiges Gespräch?

Beste Grüße
Ulrich Deibel
GuideTranslator Enterprise
enterprise@guidetranslator.com`,
    isDefault: true,
  },
  {
    id: "demo",
    name: "Demo-Einladung",
    subject: "Live-Demo: GuideTranslator für {{company}}",
    bodyTemplate: `Sehr geehrte/r {{name}},

wir würden Ihnen gerne in einer kurzen Live-Demo zeigen, wie GuideTranslator die Sprachbarriere bei Landausflügen für {{company}} lösen kann.

Vorab können Sie bereits Ihre individuelle Kostenanalyse erstellen:
{{link}}

In der Demo zeigen wir Ihnen:
• Live-Übersetzung in 130+ Sprachen mit nur einem Guide
• Die Qualität unserer Neural2/Chirp3 HD Sprachausgabe
• Integration in Ihren bestehenden Ausflugsbetrieb
• ROI-Analyse basierend auf Ihren Flottendaten

Wann passt es Ihnen am besten? Wir sind flexibel.

Mit freundlichen Grüßen
Ulrich Deibel
GuideTranslator Enterprise
enterprise@guidetranslator.com`,
    isDefault: true,
  },
];

const TEMPLATES_STORAGE_KEY = "gt_admin_email_templates";

function loadCustomTemplates() {
  try {
    const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveCustomTemplates(templates) {
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
}

function getAllTemplates() {
  return [...DEFAULT_EMAIL_TEMPLATES, ...loadCustomTemplates()];
}

function renderTemplate(bodyTemplate, contact, link) {
  return bodyTemplate
    .replace(/\{\{name\}\}/g, contact.name || "")
    .replace(/\{\{company\}\}/g, contact.company || "Ihr Unternehmen")
    .replace(/\{\{link\}\}/g, link);
}

// ─── PIPELINE STAGES ─────────────────────────────────────────
const PIPELINE_STAGES = [
  { id: "neu",          label: "Neu",            color: T.gray },
  { id: "eingeladen",   label: "Eingeladen",     color: T.gold },
  { id: "registriert",  label: "Registriert",    color: T.seaLight },
  { id: "kalkulation",  label: "Kalkulation",    color: T.goldLight },
  { id: "demo",         label: "Demo geplant",   color: "#9b59b6" },
  { id: "angebot",      label: "Angebot",        color: T.sea },
  { id: "verhandlung",  label: "Verhandlung",    color: "#e67e22" },
  { id: "gewonnen",     label: "Gewonnen",       color: T.green },
  { id: "verloren",     label: "Verloren",       color: T.red },
];
const PIPELINE_MAP = Object.fromEntries(PIPELINE_STAGES.map(s => [s.id, s]));

// ─── NOTE TYPES ──────────────────────────────────────────────
const NOTE_TYPES = [
  { id: "note",    label: "Notiz",    icon: "📝" },
  { id: "call",    label: "Anruf",    icon: "📞" },
  { id: "email",   label: "E-Mail",   icon: "✉" },
  { id: "meeting", label: "Meeting",  icon: "🤝" },
];

// ─── FOLLOW-UP HELPERS ───────────────────────────────────────
const FOLLOW_UP_PRESETS = [
  { label: "Morgen",         days: 1 },
  { label: "In 3 Tagen",    days: 3 },
  { label: "Nächste Woche",  days: 7 },
  { label: "In 2 Wochen",   days: 14 },
];

const addDays = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
};

const isOverdue = (dateStr) => {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
};

const fmtFollowUp = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return `${Math.abs(diffDays)} Tag(e) überfällig`;
  if (diffDays === 0) return "Heute";
  if (diffDays === 1) return "Morgen";
  return `In ${diffDays} Tagen`;
};

// ─── TAG PRESETS ─────────────────────────────────────────────
const TAG_PRESETS = ["VIP", "Pilot-Kandidat", "AIDA", "TUI", "MSC", "Royal Caribbean", "Viking", "Hurtigruten", "Warm Lead", "Kalt"];
const TAG_COLORS = { "VIP": T.gold, "Pilot-Kandidat": T.green, "Warm Lead": "#e67e22", "Kalt": T.sea };
const getTagColor = (tag) => TAG_COLORS[tag] || T.seaLight;

// ═══════════════════════════════════════════════════════════════
// ERROR BOUNDARY (prevents white screen on runtime errors)
// ═══════════════════════════════════════════════════════════════
class AdminErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: "100vh", background: T.navy, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fontSans }}>
          <div style={{ maxWidth: 500, textAlign: "center", padding: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠</div>
            <h2 style={{ fontFamily: font, fontSize: 24, color: T.red, marginBottom: 12 }}>Fehler im Admin-Dashboard</h2>
            <p style={{ color: T.grayLight, fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>{this.state.error.message}</p>
            <button onClick={() => { this.setState({ error: null }); window.location.reload(); }} style={{
              background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`,
              color: T.navy, border: "none", padding: "12px 24px", borderRadius: 10,
              fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}>Seite neu laden</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ═══════════════════════════════════════════════════════════════
// ADMIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function Admin({ onBack }) {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    if (pw === ADMIN_PASSWORD) {
      setAuthed(true);
      setPwError("");
    } else {
      setPwError("Falsches Passwort.");
    }
  };

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: T.navy, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fontSans }}>
        <div style={{ maxWidth: 400, width: "100%", padding: 24 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%", margin: "0 auto 16px",
              background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: font, fontWeight: 700, fontSize: 22, color: T.navy,
            }}>GT</div>
            <h1 style={{ fontFamily: font, fontSize: 28, color: T.whiteTrue, marginBottom: 8 }}>Admin-Zugang</h1>
            <p style={{ fontSize: 14, color: T.grayLight }}>GuideTranslator Verwaltung</p>
          </div>
          <form onSubmit={handleLogin} style={{ background: T.navyLight, borderRadius: 16, padding: 28, border: `1px solid ${T.navyMid}` }}>
            <label style={{ fontSize: 13, color: T.grayLight, fontWeight: 500, marginBottom: 8, display: "block" }}>Admin-Passwort</label>
            <input
              type="password"
              value={pw}
              onChange={e => setPw(e.target.value)}
              placeholder="Passwort eingeben"
              autoFocus
              style={{ width: "100%", background: T.navyMid, border: `1px solid ${T.navyMid}`, borderRadius: 10, padding: "12px 16px", color: T.whiteTrue, fontSize: 15, marginBottom: 16 }}
            />
            {pwError && <p style={{ color: T.red, fontSize: 13, marginBottom: 12 }}>{pwError}</p>}
            <button type="submit" style={{
              width: "100%", background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`,
              color: T.navy, border: "none", padding: "14px 24px", borderRadius: 12,
              fontSize: 16, fontWeight: 700, cursor: "pointer",
            }}>Anmelden</button>
          </form>
          <button onClick={onBack} style={{ background: "transparent", border: "none", color: T.grayLight, fontSize: 14, cursor: "pointer", display: "block", margin: "20px auto 0" }}>← Zurück zur App</button>
        </div>
      </div>
    );
  }

  return <AdminErrorBoundary><AdminDashboard onBack={onBack} /></AdminErrorBoundary>;
}

// ═══════════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════
function AdminDashboard({ onBack }) {
  const [tab, setTab] = useState("contacts");
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(null); // leadId or null
  const [refreshKey, setRefreshKey] = useState(0);

  // Load all leads with calculation counts
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: leadsData } = await supabase
          .from('gt_leads')
          .select('*')
          .order('created_at', { ascending: false });

        if (leadsData) {
          // Fetch calculation counts for each lead
          const enriched = await Promise.all(leadsData.map(async (lead) => {
            const { count } = await supabase
              .from('gt_calculations')
              .select('*', { count: 'exact', head: true })
              .eq('lead_id', lead.id);
            return { ...lead, calc_count: count || 0 };
          }));
          setLeads(enriched);
        }
      } catch (e) {
        console.log("Failed to load leads:", e);
      }
      setLoading(false);
    })();
  }, [refreshKey]);

  const refresh = () => setRefreshKey(k => k + 1);

  const tabs = [
    { id: "contacts", label: "Kontakte", count: leads.length },
    { id: "activity", label: "Aktivität" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: T.navy, fontFamily: fontSans, color: T.whiteTrue }}>
      {/* Admin Nav */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: `${T.navy}ee`, backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${T.navyMid}`,
        padding: "0 24px", height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: font, fontWeight: 700, fontSize: 14, color: T.navy,
          }}>GT</div>
          <span style={{ fontFamily: font, fontSize: 18, color: T.whiteTrue, fontWeight: 600 }}>Admin</span>
          <span style={{
            fontSize: 10, color: T.red, background: `${T.red}15`,
            padding: "2px 8px", borderRadius: 20, fontFamily: fontSans,
            border: `1px solid ${T.red}30`, letterSpacing: 1, textTransform: "uppercase",
          }}>Intern</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setSelectedLead(null); setShowAddForm(false); }} style={{
              background: tab === t.id ? `${T.gold}20` : "transparent",
              border: tab === t.id ? `1px solid ${T.gold}40` : "1px solid transparent",
              color: tab === t.id ? T.gold : T.grayLight,
              padding: "6px 14px", borderRadius: 8, cursor: "pointer",
              fontFamily: fontSans, fontSize: 13, fontWeight: 500,
            }}>{t.label}{t.count != null ? ` (${t.count})` : ""}</button>
          ))}
          <button onClick={refresh} style={{ background: T.navyMid, border: "none", color: T.grayLight, padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>↻</button>
          <button onClick={onBack} style={{ background: "transparent", border: `1px solid ${T.navyMid}`, color: T.grayLight, padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, marginLeft: 8 }}>← App</button>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 24px 80px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 80, color: T.grayLight }}>Lade Daten...</div>
        ) : (
          <>
            {/* Stats Bar */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
              {[
                { label: "Kontakte gesamt", value: leads.length, color: T.gold },
                { label: "Aktive Pipeline", value: leads.filter(l => !["gewonnen", "verloren"].includes(l.pipeline_stage)).length, color: T.seaLight },
                { label: "Demo/Angebot", value: leads.filter(l => ["demo", "angebot", "verhandlung"].includes(l.pipeline_stage)).length, color: T.goldLight },
                { label: "Gewonnen", value: leads.filter(l => l.pipeline_stage === "gewonnen").length, color: T.green },
                { label: "Kalkulationen", value: leads.reduce((s, l) => s + (l.calc_count || 0), 0), color: T.gold },
              ].map((s, i) => (
                <div key={i} style={{ background: T.navyLight, borderRadius: 12, padding: "16px 20px", border: `1px solid ${T.navyMid}` }}>
                  <div style={{ fontSize: 11, color: T.grayLight, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontFamily: font, fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Overdue Follow-ups Banner */}
            {(() => {
              const overdue = leads.filter(l => l.follow_up_date && isOverdue(l.follow_up_date));
              const upcoming = leads.filter(l => l.follow_up_date && !isOverdue(l.follow_up_date));
              if (!overdue.length && !upcoming.length) return null;
              return (
                <div style={{
                  background: overdue.length ? `${T.red}08` : `${T.gold}08`,
                  border: `1px solid ${overdue.length ? T.red : T.gold}20`,
                  borderRadius: 12, padding: "16px 20px", marginBottom: 24,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: overdue.length ? 8 : 0, color: overdue.length ? T.red : T.gold }}>
                    {overdue.length ? `⚠ ${overdue.length} überfällige Wiedervorlage(n)` : ""}
                    {overdue.length && upcoming.length ? " · " : ""}
                    {upcoming.length ? `📅 ${upcoming.length} anstehend` : ""}
                  </div>
                  {overdue.map(l => (
                    <div key={l.id} onClick={() => { setTab("contacts"); setSelectedLead(l); }} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "8px 12px", background: T.navyMid, borderRadius: 8, marginBottom: 4, cursor: "pointer",
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{l.name} <span style={{ color: T.gray, fontWeight: 400 }}>— {l.company}</span></span>
                      <span style={{ fontSize: 12, color: T.red }}>{fmtFollowUp(l.follow_up_date)}</span>
                    </div>
                  ))}
                </div>
              );
            })()}

            {tab === "contacts" && !selectedLead && !showAddForm && (
              <ContactsList leads={leads} onSelect={setSelectedLead} onAdd={() => setShowAddForm(true)} onEmail={setShowEmailModal} refresh={refresh} />
            )}
            {tab === "contacts" && showAddForm && (
              <AddContactForm onBack={() => setShowAddForm(false)} refresh={refresh} />
            )}
            {tab === "contacts" && selectedLead && (
              <ContactDetail lead={selectedLead} onBack={() => { setSelectedLead(null); refresh(); }} />
            )}
            {tab === "activity" && (
              <ActivityLog leads={leads} onSelect={setSelectedLead} />
            )}
            {showEmailModal && (
              <EmailModal lead={leads.find(l => l.id === showEmailModal)} onClose={() => setShowEmailModal(null)} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CONTACTS LIST
// ═══════════════════════════════════════════════════════════════
function ContactsList({ leads, onSelect, onAdd, onEmail, refresh }) {
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [filterFollowUp, setFilterFollowUp] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [copiedId, setCopiedId] = useState(null);

  const filtered = leads.filter(l => {
    if (search && ![l.name, l.email, l.company].some(v => v && v.toLowerCase().includes(search.toLowerCase()))) return false;
    if (filterStage && l.pipeline_stage !== filterStage) return false;
    if (filterTag && !(l.tags || []).includes(filterTag)) return false;
    if (filterFollowUp === "overdue" && !(l.follow_up_date && isOverdue(l.follow_up_date))) return false;
    if (filterFollowUp === "upcoming" && !(l.follow_up_date && !isOverdue(l.follow_up_date))) return false;
    return true;
  });

  const copyLink = async (lead) => {
    if (!lead.invite_token) return;
    const link = `${getAppUrl()}/?invite=${lead.invite_token}`;
    await navigator.clipboard.writeText(link);
    setCopiedId(lead.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const generateInvite = async (lead) => {
    const token = generateToken();
    await supabase.from('gt_leads').update({ invite_token: token }).eq('id', lead.id);
    refresh();
  };

  const statusBadge = (lead) => {
    const stage = PIPELINE_MAP[lead.pipeline_stage] || PIPELINE_STAGES[0];
    return { label: stage.label, color: stage.color };
  };

  const hasFilters = filterStage || filterTag || filterFollowUp;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontFamily: font, fontSize: 24, fontWeight: 700 }}>Kontakte</h2>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Suchen..."
            style={{ background: T.navyMid, border: `1px solid ${T.navyMid}`, borderRadius: 8, padding: "8px 14px", color: T.whiteTrue, fontSize: 14, width: 220 }}
          />
          <button onClick={onAdd} style={{
            background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`,
            color: T.navy, border: "none", padding: "10px 20px", borderRadius: 10,
            fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
          }}>+ Kontakt anlegen</button>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <select value={filterStage} onChange={e => setFilterStage(e.target.value)} style={{ background: T.navyMid, border: `1px solid ${T.navyMid}`, borderRadius: 8, padding: "6px 12px", color: T.grayLight, fontSize: 12 }}>
          <option value="">Alle Stufen</option>
          {PIPELINE_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <select value={filterTag} onChange={e => setFilterTag(e.target.value)} style={{ background: T.navyMid, border: `1px solid ${T.navyMid}`, borderRadius: 8, padding: "6px 12px", color: T.grayLight, fontSize: 12 }}>
          <option value="">Alle Tags</option>
          {TAG_PRESETS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterFollowUp} onChange={e => setFilterFollowUp(e.target.value)} style={{ background: T.navyMid, border: `1px solid ${filterFollowUp === "overdue" ? T.red : T.navyMid}`, borderRadius: 8, padding: "6px 12px", color: filterFollowUp === "overdue" ? T.red : T.grayLight, fontSize: 12 }}>
          <option value="">Wiedervorlagen: Alle</option>
          <option value="overdue">Überfällig</option>
          <option value="upcoming">Anstehend</option>
        </select>
        {hasFilters && (
          <button onClick={() => { setFilterStage(""); setFilterTag(""); setFilterFollowUp(""); }} style={{ background: "transparent", border: `1px solid ${T.gray}30`, color: T.gray, padding: "6px 12px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>Filter zurücksetzen</button>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div style={{ background: `${T.gold}10`, border: `1px solid ${T.gold}30`, borderRadius: 10, padding: "10px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: T.gold, fontWeight: 600 }}>{selectedIds.size} ausgewählt</span>
          <select onChange={async (e) => {
            if (!e.target.value) return;
            const stage = e.target.value;
            await Promise.all([...selectedIds].map(id => supabase.from('gt_leads').update({ pipeline_stage: stage }).eq('id', id)));
            setSelectedIds(new Set());
            refresh();
            e.target.value = "";
          }} style={{ background: T.navyMid, border: `1px solid ${T.gold}40`, borderRadius: 8, padding: "5px 10px", color: T.gold, fontSize: 12 }}>
            <option value="">Pipeline-Stufe ändern...</option>
            {PIPELINE_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <button onClick={() => setSelectedIds(new Set())} style={{ background: "transparent", border: "none", color: T.gray, fontSize: 12, cursor: "pointer" }}>Auswahl aufheben</button>
        </div>
      )}

      {/* Table */}
      <div style={{ background: T.navyLight, borderRadius: 16, border: `1px solid ${T.navyMid}`, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.navyMid}` }}>
                <th style={{ padding: "12px 8px", width: 32 }}>
                  <input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={e => {
                    if (e.target.checked) setSelectedIds(new Set(filtered.map(l => l.id)));
                    else setSelectedIds(new Set());
                  }} style={{ accentColor: T.gold }} />
                </th>
                {["Name", "E-Mail", "Unternehmen", "Status", "Kalk.", "Letzte Aktivität", "Aktionen"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: T.grayLight, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(lead => {
                const badge = statusBadge(lead);
                return (
                  <tr key={lead.id} style={{ borderBottom: `1px solid ${T.navyMid}08`, cursor: "pointer" }} onClick={() => onSelect(lead)}>
                    <td style={{ padding: "12px 8px" }} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(lead.id)} onChange={e => {
                        const next = new Set(selectedIds);
                        if (e.target.checked) next.add(lead.id); else next.delete(lead.id);
                        setSelectedIds(next);
                      }} style={{ accentColor: T.gold }} />
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 600 }}>{lead.name || "—"}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: T.grayLight }}>{lead.email}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13 }}>{lead.company || "—"}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: `${badge.color}15`, color: badge.color, border: `1px solid ${badge.color}30` }}>{badge.label}</span>
                      {(lead.tags || []).slice(0, 2).map(tag => (
                        <span key={tag} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, marginLeft: 4, background: `${getTagColor(tag)}10`, color: getTagColor(tag) }}>{tag}</span>
                      ))}
                      {(lead.tags || []).length > 2 && <span style={{ fontSize: 10, color: T.gray, marginLeft: 4 }}>+{(lead.tags || []).length - 2}</span>}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 14, fontFamily: font, fontWeight: 600, color: T.gold }}>{lead.calc_count || 0}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: T.gray }}>
                      {fmtDate(lead.last_activity)}
                      {lead.follow_up_date && (
                        <div style={{ fontSize: 10, marginTop: 2, color: isOverdue(lead.follow_up_date) ? T.red : T.gold }}>
                          {isOverdue(lead.follow_up_date) ? "⚠ " : "📅 "}{fmtFollowUp(lead.follow_up_date)}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px" }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 6 }}>
                        {lead.invite_token ? (
                          <button onClick={() => copyLink(lead)} style={{
                            background: copiedId === lead.id ? `${T.green}20` : T.navyMid,
                            border: `1px solid ${copiedId === lead.id ? T.green : T.navyMid}`,
                            color: copiedId === lead.id ? T.green : T.grayLight,
                            padding: "5px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap",
                          }}>{copiedId === lead.id ? "✓ Kopiert" : "Link kopieren"}</button>
                        ) : (
                          <button onClick={() => generateInvite(lead)} style={{
                            background: T.navyMid, border: `1px solid ${T.gold}30`, color: T.gold,
                            padding: "5px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap",
                          }}>Link erstellen</button>
                        )}
                        <button onClick={() => onEmail(lead.id)} style={{
                          background: T.navyMid, border: `1px solid ${T.navyMid}`, color: T.grayLight,
                          padding: "5px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer",
                        }}>✉</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: T.gray }}>Keine Kontakte gefunden.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ADD CONTACT FORM
// ═══════════════════════════════════════════════════════════════
function AddContactForm({ onBack, refresh }) {
  const [f, setF] = useState({ name: "", email: "", company: "", role: "", fleet_size: "", phone: "" });
  const [autoInvite, setAutoInvite] = useState(true);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const handleChange = useCallback((name, value) => {
    setF(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!f.name || !f.email) { setResult({ error: "Name und E-Mail sind Pflichtfelder." }); return; }
    setSaving(true);

    const token = autoInvite ? generateToken() : null;
    const { data, error } = await supabase
      .from('gt_leads')
      .upsert({
        email: f.email,
        name: f.name,
        company: f.company || null,
        role: f.role || null,
        fleet_size: f.fleet_size || null,
        phone: f.phone || null,
        source: 'admin_created',
        status: 'new',
        pipeline_stage: token ? 'eingeladen' : 'neu',
        invite_token: token,
        last_activity: new Date().toISOString(),
      }, { onConflict: 'email' })
      .select()
      .single();

    setSaving(false);
    if (error) {
      setResult({ error: `Fehler: ${error.message}` });
    } else {
      const link = token ? `${getAppUrl()}/?invite=${token}` : null;
      setResult({ success: true, link, lead: data });
    }
  };

  if (result?.success) {
    return (
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{ background: `${T.green}08`, border: `1px solid ${T.green}25`, borderRadius: 16, padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <h3 style={{ fontFamily: font, fontSize: 24, marginBottom: 8, color: T.green }}>Kontakt angelegt</h3>
          <p style={{ color: T.grayLight, marginBottom: 20 }}>{result.lead.name} ({result.lead.email})</p>
          {result.link && (
            <div style={{ background: T.navyMid, borderRadius: 10, padding: 16, marginBottom: 20 }}>
              <p style={{ fontSize: 12, color: T.grayLight, marginBottom: 8 }}>Persönlicher Einladungslink:</p>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input readOnly value={result.link} style={{ flex: 1, background: T.navy, border: `1px solid ${T.navyMid}`, borderRadius: 8, padding: "8px 12px", color: T.gold, fontSize: 13 }} />
                <button onClick={() => navigator.clipboard.writeText(result.link)} style={{ background: T.gold, color: T.navy, border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>Kopieren</button>
              </div>
            </div>
          )}
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button onClick={() => { setF({ name: "", email: "", company: "", role: "", fleet_size: "", phone: "" }); setResult(null); }} style={{ background: T.navyMid, color: T.gold, border: `1px solid ${T.gold}30`, padding: "10px 20px", borderRadius: 10, fontSize: 14, cursor: "pointer" }}>Weiteren Kontakt anlegen</button>
            <button onClick={() => { refresh(); onBack(); }} style={{ background: T.navyMid, color: T.grayLight, border: `1px solid ${T.navyMid}`, padding: "10px 20px", borderRadius: 10, fontSize: 14, cursor: "pointer" }}>← Zurück zur Liste</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <button onClick={onBack} style={{ background: "transparent", border: "none", color: T.grayLight, fontSize: 14, cursor: "pointer", marginBottom: 20 }}>← Zurück zur Liste</button>
      <h2 style={{ fontFamily: font, fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Neuen Kontakt <span style={{ color: T.gold }}>anlegen</span></h2>
      <form onSubmit={handleSubmit} style={{ background: T.navyLight, borderRadius: 16, padding: 28, border: `1px solid ${T.navyMid}`, display: "flex", flexDirection: "column", gap: 16 }}>
        <AdminField label="Name" name="name" value={f.name} onChange={handleChange} ph="Max Mustermann" req />
        <AdminField label="E-Mail" name="email" type="email" value={f.email} onChange={handleChange} ph="m.mustermann@reederei.de" req />
        <AdminField label="Unternehmen" name="company" value={f.company} onChange={handleChange} ph="z.B. AIDA Cruises" />
        <AdminField label="Position" name="role" value={f.role} onChange={handleChange} opts={["C-Level / Geschäftsführung", "VP / Director Shore Excursions", "Einkauf / Procurement", "IT / Digital", "Operations", "Hotel Director", "Marketing", "Sonstige"]} />
        <AdminField label="Flottengröße" name="fleet_size" value={f.fleet_size} onChange={handleChange} opts={["1-2 Schiffe", "3-5 Schiffe", "6-10 Schiffe", "11-20 Schiffe", "20+ Schiffe"]} />
        <AdminField label="Telefon" name="phone" type="tel" value={f.phone} onChange={handleChange} ph="+49 ..." />

        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
          <input type="checkbox" checked={autoInvite} onChange={e => setAutoInvite(e.target.checked)} id="autoInvite" style={{ accentColor: T.gold }} />
          <label htmlFor="autoInvite" style={{ fontSize: 14, color: T.grayLight, cursor: "pointer" }}>Einladungslink automatisch generieren</label>
        </div>

        {result?.error && <p style={{ color: T.red, fontSize: 13 }}>{result.error}</p>}

        <button type="submit" disabled={saving} style={{
          background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`,
          color: T.navy, border: "none", padding: "14px 24px", borderRadius: 12,
          fontSize: 16, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1,
        }}>{saving ? "Wird gespeichert..." : "Kontakt anlegen"}</button>
      </form>
    </div>
  );
}

// ─── Shared Admin Field Component ────────────────────────────────
function AdminField({ label, name, type = "text", ph, req, opts, value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, color: T.grayLight, fontWeight: 500 }}>{label} {req && <span style={{ color: T.gold }}>*</span>}</label>
      {opts ? (
        <select value={value} onChange={e => onChange(name, e.target.value)} style={{ width: "100%", background: T.navyMid, border: `1px solid ${T.navyMid}`, borderRadius: 10, padding: "12px 16px", color: T.whiteTrue, fontSize: 15 }}>
          <option value="">Bitte wählen...</option>
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={e => onChange(name, e.target.value)} placeholder={ph} style={{ width: "100%", background: T.navyMid, border: `1px solid ${T.navyMid}`, borderRadius: 10, padding: "12px 16px", color: T.whiteTrue, fontSize: 15 }} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CONTACT DETAIL
// ═══════════════════════════════════════════════════════════════
function ContactDetail({ lead, onBack }) {
  const [calcs, setCalcs] = useState([]);
  const [requests, setRequests] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [, forceRender] = useState(0);

  // Notes form
  const [newNote, setNewNote] = useState("");
  const [noteType, setNoteType] = useState("note");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [calcRes, reqRes, noteRes] = await Promise.all([
          supabase.from('gt_calculations').select('*').eq('lead_id', lead.id).order('created_at', { ascending: false }),
          supabase.from('gt_contact_requests').select('*').eq('lead_id', lead.id).order('created_at', { ascending: false }),
          supabase.from('gt_lead_notes').select('*').eq('lead_id', lead.id).order('created_at', { ascending: false }),
        ]);
        setCalcs(calcRes.data || []);
        setRequests(reqRes.data || []);
        setNotes(noteRes.data || []);
      } catch (e) { console.log("Failed to load detail:", e); }
      setLoading(false);
    })();
  }, [lead.id]);

  const inviteLink = lead.invite_token ? `${getAppUrl()}/?invite=${lead.invite_token}` : null;

  const copyLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const regenerateToken = async () => {
    const token = generateToken();
    await supabase.from('gt_leads').update({ invite_token: token }).eq('id', lead.id);
    lead.invite_token = token;
    setCopiedLink(false);
    forceRender(n => n + 1);
  };

  const updatePipeline = async (stage) => {
    await supabase.from('gt_leads').update({ pipeline_stage: stage }).eq('id', lead.id);
    lead.pipeline_stage = stage;
    forceRender(n => n + 1);
  };

  const setFollowUp = async (dateStr) => {
    await supabase.from('gt_leads').update({ follow_up_date: dateStr }).eq('id', lead.id);
    lead.follow_up_date = dateStr;
    forceRender(n => n + 1);
  };

  const addTag = async (tag) => {
    const tags = [...(lead.tags || [])];
    if (tags.includes(tag)) return;
    tags.push(tag);
    await supabase.from('gt_leads').update({ tags }).eq('id', lead.id);
    lead.tags = tags;
    forceRender(n => n + 1);
  };

  const removeTag = async (tag) => {
    const tags = (lead.tags || []).filter(t => t !== tag);
    await supabase.from('gt_leads').update({ tags }).eq('id', lead.id);
    lead.tags = tags;
    forceRender(n => n + 1);
  };

  const saveNote = async () => {
    if (!newNote.trim()) return;
    setSavingNote(true);
    const { data } = await supabase.from('gt_lead_notes').insert({
      lead_id: lead.id,
      text: newNote.trim(),
      note_type: noteType,
    }).select().single();
    if (data) setNotes([data, ...notes]);
    setNewNote("");
    setSavingNote(false);
  };

  const currentStage = PIPELINE_MAP[lead.pipeline_stage] || PIPELINE_STAGES[0];

  return (
    <div>
      <button onClick={onBack} style={{ background: "transparent", border: "none", color: T.grayLight, fontSize: 14, cursor: "pointer", marginBottom: 20 }}>← Zurück zur Liste</button>

      {/* Contact Info Card */}
      <div style={{ background: T.navyLight, borderRadius: 16, padding: 28, border: `1px solid ${T.navyMid}`, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h2 style={{ fontFamily: font, fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{lead.name || "Unbekannt"}</h2>
            <p style={{ fontSize: 15, color: T.gold, marginBottom: 12 }}>{lead.company || "—"}</p>
          </div>
          <div style={{ fontSize: 11, padding: "4px 12px", borderRadius: 20, background: `${currentStage.color}15`, color: currentStage.color, border: `1px solid ${currentStage.color}30` }}>
            {currentStage.label}
          </div>
        </div>

        {/* Pipeline Selector */}
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${T.navyMid}` }}>
          <span style={{ fontSize: 11, color: T.gray, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Pipeline-Stufe</span>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {PIPELINE_STAGES.map(s => (
              <button key={s.id} onClick={() => updatePipeline(s.id)} style={{
                padding: "5px 12px", borderRadius: 8, cursor: "pointer", fontSize: 11,
                background: lead.pipeline_stage === s.id ? `${s.color}20` : "transparent",
                border: lead.pipeline_stage === s.id ? `1px solid ${s.color}50` : `1px solid ${T.navyMid}`,
                color: lead.pipeline_stage === s.id ? s.color : T.grayLight,
                fontWeight: lead.pipeline_stage === s.id ? 600 : 400,
              }}>{s.label}</button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginTop: 16 }}>
          <div><span style={{ fontSize: 11, color: T.gray, textTransform: "uppercase" }}>E-Mail</span><div style={{ fontSize: 14, marginTop: 2 }}>{lead.email}</div></div>
          <div><span style={{ fontSize: 11, color: T.gray, textTransform: "uppercase" }}>Position</span><div style={{ fontSize: 14, marginTop: 2 }}>{lead.role || "—"}</div></div>
          <div><span style={{ fontSize: 11, color: T.gray, textTransform: "uppercase" }}>Flotte</span><div style={{ fontSize: 14, marginTop: 2 }}>{lead.fleet_size || "—"}</div></div>
          <div><span style={{ fontSize: 11, color: T.gray, textTransform: "uppercase" }}>Telefon</span><div style={{ fontSize: 14, marginTop: 2 }}>{lead.phone || "—"}</div></div>
          <div><span style={{ fontSize: 11, color: T.gray, textTransform: "uppercase" }}>Erstellt</span><div style={{ fontSize: 14, marginTop: 2 }}>{fmtDate(lead.created_at)}</div></div>
          <div><span style={{ fontSize: 11, color: T.gray, textTransform: "uppercase" }}>Letzte Aktivität</span><div style={{ fontSize: 14, marginTop: 2 }}>{fmtDate(lead.last_activity)}</div></div>
          <div><span style={{ fontSize: 11, color: T.gray, textTransform: "uppercase" }}>Letzter Login</span><div style={{ fontSize: 14, marginTop: 2 }}>{fmtDate(lead.last_login)}</div></div>
          <div><span style={{ fontSize: 11, color: T.gray, textTransform: "uppercase" }}>Quelle</span><div style={{ fontSize: 14, marginTop: 2 }}>{lead.source || "—"}</div></div>
        </div>

        {/* Tags */}
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${T.navyMid}` }}>
          <span style={{ fontSize: 11, color: T.gray, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Tags</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {(lead.tags || []).map(tag => (
              <span key={tag} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, background: `${getTagColor(tag)}15`, color: getTagColor(tag), border: `1px solid ${getTagColor(tag)}30`, display: "flex", alignItems: "center", gap: 6 }}>
                {tag}
                <button onClick={() => removeTag(tag)} style={{ background: "transparent", border: "none", color: getTagColor(tag), fontSize: 14, cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>
              </span>
            ))}
            {TAG_PRESETS.filter(t => !(lead.tags || []).includes(t)).length > 0 && (
              <select onChange={e => { if (e.target.value) { addTag(e.target.value); e.target.value = ""; } }} style={{ background: T.navyMid, border: `1px solid ${T.navyMid}`, borderRadius: 8, padding: "4px 8px", color: T.grayLight, fontSize: 11 }}>
                <option value="">+ Tag</option>
                {TAG_PRESETS.filter(t => !(lead.tags || []).includes(t)).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
          </div>
        </div>

        {/* Follow-Up */}
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${T.navyMid}` }}>
          <span style={{ fontSize: 11, color: T.gray, textTransform: "uppercase", display: "block", marginBottom: 8 }}>Wiedervorlage</span>
          {lead.follow_up_date ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 14, color: isOverdue(lead.follow_up_date) ? T.red : T.gold, fontWeight: 600 }}>
                {isOverdue(lead.follow_up_date) ? "⚠ " : "📅 "}
                {fmtFollowUp(lead.follow_up_date)} ({new Date(lead.follow_up_date).toLocaleDateString("de-DE")})
              </span>
              <button onClick={() => setFollowUp(null)} style={{ background: T.navyMid, border: `1px solid ${T.navyMid}`, color: T.gray, padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>Entfernen</button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 6 }}>
              {FOLLOW_UP_PRESETS.map(p => (
                <button key={p.label} onClick={() => setFollowUp(addDays(p.days))} style={{ background: T.navyMid, border: `1px solid ${T.gold}20`, color: T.gold, padding: "5px 12px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>{p.label}</button>
              ))}
            </div>
          )}
        </div>

        {/* Invite Link Section */}
        <div style={{ marginTop: 16, padding: "16px 0 0", borderTop: `1px solid ${T.navyMid}` }}>
          <span style={{ fontSize: 11, color: T.gray, textTransform: "uppercase" }}>Einladungslink</span>
          {inviteLink ? (
            <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
              <input readOnly value={inviteLink} style={{ flex: 1, background: T.navyMid, border: `1px solid ${T.navyMid}`, borderRadius: 8, padding: "8px 12px", color: T.gold, fontSize: 12 }} />
              <button onClick={copyLink} style={{ background: copiedLink ? `${T.green}20` : T.navyMid, border: `1px solid ${copiedLink ? T.green : T.navyMid}`, color: copiedLink ? T.green : T.grayLight, padding: "8px 14px", borderRadius: 8, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>{copiedLink ? "✓ Kopiert" : "Kopieren"}</button>
              <button onClick={regenerateToken} style={{ background: T.navyMid, border: `1px solid ${T.navyMid}`, color: T.grayLight, padding: "8px 14px", borderRadius: 8, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>Neuer Link</button>
            </div>
          ) : (
            <div style={{ marginTop: 8 }}>
              <button onClick={regenerateToken} style={{ background: T.navyMid, border: `1px solid ${T.gold}30`, color: T.gold, padding: "8px 16px", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Einladungslink generieren</button>
            </div>
          )}
        </div>
      </div>

      {/* Notes Section */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontFamily: font, fontSize: 20, marginBottom: 16 }}>Notizen</h3>
        <div style={{ background: T.navyLight, borderRadius: 16, padding: 20, border: `1px solid ${T.navyMid}`, marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {NOTE_TYPES.map(nt => (
              <button key={nt.id} onClick={() => setNoteType(nt.id)} style={{
                padding: "4px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12,
                background: noteType === nt.id ? `${T.gold}15` : T.navyMid,
                border: noteType === nt.id ? `1px solid ${T.gold}40` : `1px solid transparent`,
                color: noteType === nt.id ? T.gold : T.grayLight,
              }}>{nt.icon} {nt.label}</button>
            ))}
          </div>
          <textarea value={newNote} onChange={e => setNewNote(e.target.value)} rows={3} placeholder="Notiz hinzufügen..." style={{ width: "100%", background: T.navyMid, border: `1px solid ${T.navyMid}`, borderRadius: 8, padding: "10px 14px", color: T.whiteTrue, fontSize: 13, fontFamily: fontSans, resize: "vertical", marginBottom: 8 }} />
          <button onClick={saveNote} disabled={savingNote || !newNote.trim()} style={{
            background: newNote.trim() ? `linear-gradient(135deg, ${T.gold}, ${T.goldDark})` : T.navyMid,
            color: newNote.trim() ? T.navy : T.gray, border: "none", padding: "8px 20px", borderRadius: 8,
            fontSize: 13, fontWeight: 600, cursor: newNote.trim() ? "pointer" : "default",
            opacity: savingNote ? 0.6 : 1,
          }}>{savingNote ? "Speichert..." : "Notiz speichern"}</button>
        </div>

        {/* Notes Timeline */}
        {notes.map(note => {
          const nt = NOTE_TYPES.find(n => n.id === note.note_type) || NOTE_TYPES[0];
          return (
            <div key={note.id} style={{ display: "flex", gap: 12, marginBottom: 8 }}>
              <div style={{ width: 3, background: `${T.gold}40`, borderRadius: 2, flexShrink: 0 }} />
              <div style={{ background: T.navyLight, borderRadius: 10, padding: "12px 16px", border: `1px solid ${T.navyMid}`, flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: T.gold }}>{nt.icon} {nt.label}</span>
                  <span style={{ fontSize: 11, color: T.gray }}>{fmtDate(note.created_at)}</span>
                </div>
                <div style={{ fontSize: 13, color: T.grayLight, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{note.text}</div>
              </div>
            </div>
          );
        })}
        {!notes.length && !loading && (
          <div style={{ textAlign: "center", padding: 20, color: T.gray, fontSize: 13 }}>Noch keine Notizen.</div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: T.grayLight }}>Lade Details...</div>
      ) : (
        <>
          {/* Calculations */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontFamily: font, fontSize: 20, marginBottom: 16 }}>Kalkulationen <span style={{ color: T.gold }}>({calcs.length})</span></h3>
            {calcs.length === 0 ? (
              <div style={{ background: T.navyLight, borderRadius: 12, padding: 24, border: `1px solid ${T.navyMid}`, textAlign: "center", color: T.gray }}>Keine Kalkulationen vorhanden.</div>
            ) : (
              calcs.map(calc => (
                <div key={calc.id} style={{ background: T.navyLight, borderRadius: 12, padding: 20, border: `1px solid ${T.navyMid}`, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                    <div style={{ fontFamily: font, fontSize: 16, fontWeight: 600 }}>{calc.name}</div>
                    <div style={{ fontSize: 12, color: T.gray }}>{fmtDate(calc.created_at)}</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
                    <div><span style={{ fontSize: 10, color: T.gray }}>ERSPARNIS</span><div style={{ fontFamily: font, fontSize: 18, fontWeight: 700, color: T.gold }}>{fmtEur(calc.results?.savings || 0)}</div></div>
                    <div><span style={{ fontSize: 10, color: T.gray }}>ERSPARNIS %</span><div style={{ fontFamily: font, fontSize: 18, fontWeight: 700, color: T.green }}>{(calc.results?.savingsPct || 0).toFixed(1)}%</div></div>
                    <div><span style={{ fontSize: 10, color: T.gray }}>TRAD. KOSTEN</span><div style={{ fontSize: 14, color: T.red }}>{fmtEur(calc.results?.totalTraditionalCost || 0)}</div></div>
                    <div><span style={{ fontSize: 10, color: T.gray }}>GT KOSTEN</span><div style={{ fontSize: 14, color: T.seaLight }}>{fmtEur(calc.results?.totalFintuttoCost || 0)}</div></div>
                    <div><span style={{ fontSize: 10, color: T.gray }}>LIZENZ</span><div style={{ fontSize: 14 }}>{calc.results?.tierName || "—"}</div></div>
                    <div><span style={{ fontSize: 10, color: T.gray }}>KOSTEN/PAX</span><div style={{ fontSize: 14 }}>{((calc.results?.costPerPaxPerExcursion || 0) * 100).toFixed(2)}¢</div></div>
                  </div>
                  {calc.inputs && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.navyMid}`, display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: T.gray }}>
                      <span>{calc.inputs.ships} Schiffe</span>
                      <span>{calc.inputs.paxPerShip} Pax/Schiff</span>
                      <span>{calc.inputs.languages} Sprachen</span>
                      <span>{calc.inputs.excursionDays} Tage/Jahr</span>
                      <span>{calc.inputs.excursionsPerDay} Ausflüge/Tag</span>
                      <span>{calc.inputs.guideMinsPerExcursion} Min/Ausflug</span>
                      <span>TTS: {calc.inputs.ttsQuality}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Contact Requests */}
          {requests.length > 0 && (
            <div>
              <h3 style={{ fontFamily: font, fontSize: 20, marginBottom: 16 }}>Angebotsanfragen <span style={{ color: T.green }}>({requests.length})</span></h3>
              {requests.map(req => (
                <div key={req.id} style={{ background: `${T.green}06`, borderRadius: 12, padding: 20, border: `1px solid ${T.green}20`, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{req.interest_level || "—"}</span>
                    <span style={{ fontSize: 12, color: T.gray }}>{fmtDate(req.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: T.grayLight, marginBottom: 4 }}>Zeitrahmen: {req.timeline || "—"}</div>
                  {req.message && <div style={{ fontSize: 13, color: T.grayLight, fontStyle: "italic", marginTop: 8, padding: "8px 12px", background: `${T.navyMid}80`, borderRadius: 8 }}>"{req.message}"</div>}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ACTIVITY LOG
// ═══════════════════════════════════════════════════════════════
function ActivityLog({ leads, onSelect }) {
  // Sort leads by most recent activity
  const sorted = [...leads]
    .filter(l => l.last_activity)
    .sort((a, b) => new Date(b.last_activity) - new Date(a.last_activity));

  return (
    <div>
      <h2 style={{ fontFamily: font, fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Aktivitäts-Übersicht</h2>

      {/* Pipeline Funnel */}
      <div style={{ background: T.navyLight, borderRadius: 16, padding: 24, border: `1px solid ${T.navyMid}`, marginBottom: 24 }}>
        <h3 style={{ fontFamily: font, fontSize: 18, marginBottom: 16 }}>Pipeline Funnel</h3>
        {PIPELINE_STAGES.map((stage, i) => {
          const count = leads.filter(l => l.pipeline_stage === stage.id).length;
          const pct = leads.length ? (count / leads.length * 100) : 0;
          return (
            <div key={stage.id} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: T.grayLight }}>{stage.label}</span>
                <span style={{ color: stage.color, fontWeight: 600 }}>{count} ({pct.toFixed(0)}%)</span>
              </div>
              <div style={{ background: T.navyMid, borderRadius: 4, height: 8, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: stage.color, borderRadius: 4, transition: "width 0.5s" }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <h3 style={{ fontFamily: font, fontSize: 18, marginBottom: 16 }}>Letzte Aktivitäten</h3>
      {sorted.slice(0, 20).map(lead => {
        const stage = PIPELINE_MAP[lead.pipeline_stage] || PIPELINE_STAGES[0];
        return (
          <div key={lead.id} onClick={() => onSelect(lead)} style={{ background: T.navyLight, borderRadius: 10, padding: "12px 16px", border: `1px solid ${T.navyMid}`, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{lead.name || "Unbekannt"}</span>
              <span style={{ color: T.grayLight, fontSize: 13, marginLeft: 12 }}>{lead.company || ""}</span>
              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, marginLeft: 8, background: `${stage.color}15`, color: stage.color }}>{stage.label}</span>
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "center", fontSize: 12 }}>
              {lead.calc_count > 0 && <span style={{ color: T.gold }}>{lead.calc_count} Kalk.</span>}
              {lead.follow_up_date && <span style={{ color: isOverdue(lead.follow_up_date) ? T.red : T.gold }}>{isOverdue(lead.follow_up_date) ? "⚠" : "📅"}</span>}
              <span style={{ color: T.gray }}>{fmtDate(lead.last_activity)}</span>
            </div>
          </div>
        );
      })}
      {!sorted.length && <div style={{ textAlign: "center", padding: 40, color: T.gray }}>Keine Aktivitäten vorhanden.</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// EMAIL MODAL
// ═══════════════════════════════════════════════════════════════
function EmailModal({ lead, onClose }) {
  const [templates, setTemplates] = useState(getAllTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0]?.id);
  const [copied, setCopied] = useState(null);
  const [editing, setEditing] = useState(null); // template being edited
  const [editForm, setEditForm] = useState({ name: "", subject: "", bodyTemplate: "" });
  const [confirmDelete, setConfirmDelete] = useState(null);

  if (!lead) return null;

  const refreshTemplates = () => {
    const all = getAllTemplates();
    setTemplates(all);
    return all;
  };

  const inviteLink = lead.invite_token
    ? `${getAppUrl()}/?invite=${lead.invite_token}`
    : "(Bitte zuerst einen Einladungslink generieren)";

  const template = templates.find(t => t.id === selectedTemplate) || templates[0];
  const subject = renderTemplate(template?.subject || "", lead, inviteLink);
  const body = renderTemplate(template?.bodyTemplate || "", lead, inviteLink);

  const copyToClipboard = async (text, type) => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const openMailto = () => {
    window.open(`mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  };

  const handleDuplicate = (tmpl) => {
    const custom = loadCustomTemplates();
    const newTmpl = {
      id: `custom_${Date.now()}`,
      name: `${tmpl.name} (Kopie)`,
      subject: tmpl.subject,
      bodyTemplate: tmpl.bodyTemplate,
      isDefault: false,
    };
    custom.push(newTmpl);
    saveCustomTemplates(custom);
    const all = refreshTemplates();
    setSelectedTemplate(newTmpl.id);
  };

  const handleStartEdit = (tmpl) => {
    setEditForm({ name: tmpl.name, subject: tmpl.subject, bodyTemplate: tmpl.bodyTemplate });
    setEditing(tmpl.id);
  };

  const handleSaveEdit = () => {
    const custom = loadCustomTemplates().map(t =>
      t.id === editing ? { ...t, name: editForm.name, subject: editForm.subject, bodyTemplate: editForm.bodyTemplate } : t
    );
    saveCustomTemplates(custom);
    refreshTemplates();
    setEditing(null);
  };

  const handleDelete = (id) => {
    const custom = loadCustomTemplates().filter(t => t.id !== id);
    saveCustomTemplates(custom);
    const all = refreshTemplates();
    if (selectedTemplate === id) setSelectedTemplate(all[0]?.id);
    setConfirmDelete(null);
  };

  const handleNewBlank = () => {
    const custom = loadCustomTemplates();
    const newTmpl = {
      id: `custom_${Date.now()}`,
      name: "Neue Vorlage",
      subject: "Betreff hier eingeben",
      bodyTemplate: `Sehr geehrte/r {{name}},\n\n[Ihr Text hier]\n\nIhr persönlicher Link:\n{{link}}\n\nMit freundlichen Grüßen\nUlrich Deibel\nGuideTranslator Enterprise\nenterprise@guidetranslator.com`,
      isDefault: false,
    };
    custom.push(newTmpl);
    saveCustomTemplates(custom);
    refreshTemplates();
    setSelectedTemplate(newTmpl.id);
    handleStartEdit(newTmpl);
  };

  // Edit mode
  if (editing) {
    return (
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.7)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }} onClick={() => setEditing(null)}>
        <div style={{
          background: T.navyLight, borderRadius: 20, padding: 32, border: `1px solid ${T.navyMid}`,
          maxWidth: 700, width: "100%", maxHeight: "90vh", overflow: "auto",
        }} onClick={e => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h3 style={{ fontFamily: font, fontSize: 22, fontWeight: 700 }}>Vorlage <span style={{ color: T.gold }}>bearbeiten</span></h3>
            <button onClick={() => setEditing(null)} style={{ background: "transparent", border: "none", color: T.gray, fontSize: 24, cursor: "pointer" }}>×</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: T.grayLight, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, display: "block" }}>Name der Vorlage</label>
              <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} style={{ width: "100%", background: T.navyMid, border: `1px solid ${T.navyMid}`, borderRadius: 8, padding: "10px 14px", color: T.whiteTrue, fontSize: 14 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: T.grayLight, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, display: "block" }}>Betreff</label>
              <input value={editForm.subject} onChange={e => setEditForm(f => ({ ...f, subject: e.target.value }))} style={{ width: "100%", background: T.navyMid, border: `1px solid ${T.navyMid}`, borderRadius: 8, padding: "10px 14px", color: T.whiteTrue, fontSize: 14 }} />
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={{ fontSize: 12, color: T.grayLight, textTransform: "uppercase", letterSpacing: 1 }}>Nachricht</label>
                <span style={{ fontSize: 11, color: T.gray }}>Platzhalter: {"{{name}}"} {"{{company}}"} {"{{link}}"}</span>
              </div>
              <textarea value={editForm.bodyTemplate} onChange={e => setEditForm(f => ({ ...f, bodyTemplate: e.target.value }))} rows={14} style={{ width: "100%", background: T.navyMid, border: `1px solid ${T.navyMid}`, borderRadius: 8, padding: "12px 14px", color: T.whiteTrue, fontSize: 13, fontFamily: fontSans, lineHeight: 1.6, resize: "vertical" }} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
            <button onClick={() => setEditing(null)} style={{ background: T.navyMid, color: T.grayLight, border: `1px solid ${T.navyMid}`, padding: "10px 20px", borderRadius: 10, fontSize: 14, cursor: "pointer" }}>Abbrechen</button>
            <button onClick={handleSaveEdit} style={{
              background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`,
              color: T.navy, border: "none", padding: "10px 20px", borderRadius: 10,
              fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}>Speichern</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.7)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }} onClick={onClose}>
      <div style={{
        background: T.navyLight, borderRadius: 20, padding: 32, border: `1px solid ${T.navyMid}`,
        maxWidth: 700, width: "100%", maxHeight: "90vh", overflow: "auto",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h3 style={{ fontFamily: font, fontSize: 22, fontWeight: 700 }}>E-Mail an <span style={{ color: T.gold }}>{lead.name}</span></h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: T.gray, fontSize: 24, cursor: "pointer" }}>×</button>
        </div>

        {/* Template Selection */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label style={{ fontSize: 12, color: T.grayLight, textTransform: "uppercase", letterSpacing: 1 }}>Vorlage wählen</label>
            <button onClick={handleNewBlank} style={{ background: "transparent", border: `1px solid ${T.gold}30`, color: T.gold, padding: "4px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>+ Neue Vorlage</button>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {templates.map(t => (
              <button key={t.id} onClick={() => setSelectedTemplate(t.id)} style={{
                padding: "8px 16px", borderRadius: 10, cursor: "pointer",
                background: selectedTemplate === t.id ? `${T.gold}15` : T.navyMid,
                border: selectedTemplate === t.id ? `1px solid ${T.gold}50` : `1px solid transparent`,
                color: selectedTemplate === t.id ? T.gold : T.grayLight, fontSize: 13,
              }}>{t.name}{!t.isDefault && <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.6 }}>*</span>}</button>
            ))}
          </div>
        </div>

        {/* Template Actions */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button onClick={() => handleDuplicate(template)} style={{
            background: T.navyMid, border: `1px solid ${T.navyMid}`, color: T.grayLight,
            padding: "5px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer",
          }}>Duplizieren</button>
          {!template.isDefault && (
            <>
              <button onClick={() => handleStartEdit(template)} style={{
                background: T.navyMid, border: `1px solid ${T.seaLight}30`, color: T.seaLight,
                padding: "5px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer",
              }}>Bearbeiten</button>
              {confirmDelete === template.id ? (
                <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: T.red }}>Wirklich?</span>
                  <button onClick={() => handleDelete(template.id)} style={{ background: `${T.red}20`, border: `1px solid ${T.red}50`, color: T.red, padding: "5px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Ja</button>
                  <button onClick={() => setConfirmDelete(null)} style={{ background: T.navyMid, border: `1px solid ${T.navyMid}`, color: T.grayLight, padding: "5px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Nein</button>
                </span>
              ) : (
                <button onClick={() => setConfirmDelete(template.id)} style={{
                  background: T.navyMid, border: `1px solid ${T.red}20`, color: T.red,
                  padding: "5px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer", opacity: 0.8,
                }}>Löschen</button>
              )}
            </>
          )}
        </div>

        {/* Subject */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <label style={{ fontSize: 12, color: T.grayLight, textTransform: "uppercase", letterSpacing: 1 }}>Betreff</label>
            <button onClick={() => copyToClipboard(subject, "subject")} style={{ background: "transparent", border: "none", color: copied === "subject" ? T.green : T.grayLight, fontSize: 12, cursor: "pointer" }}>{copied === "subject" ? "✓ Kopiert" : "Kopieren"}</button>
          </div>
          <div style={{ background: T.navyMid, borderRadius: 8, padding: "10px 14px", fontSize: 14, color: T.whiteTrue }}>{subject}</div>
        </div>

        {/* Body */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <label style={{ fontSize: 12, color: T.grayLight, textTransform: "uppercase", letterSpacing: 1 }}>Nachricht</label>
            <button onClick={() => copyToClipboard(body, "body")} style={{ background: "transparent", border: "none", color: copied === "body" ? T.green : T.grayLight, fontSize: 12, cursor: "pointer" }}>{copied === "body" ? "✓ Kopiert" : "Kopieren"}</button>
          </div>
          <pre style={{ background: T.navyMid, borderRadius: 8, padding: 16, fontSize: 13, color: T.grayLight, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: fontSans, maxHeight: 300, overflow: "auto" }}>{body}</pre>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ background: T.navyMid, color: T.grayLight, border: `1px solid ${T.navyMid}`, padding: "10px 20px", borderRadius: 10, fontSize: 14, cursor: "pointer" }}>Schließen</button>
          <button onClick={openMailto} style={{
            background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`,
            color: T.navy, border: "none", padding: "10px 20px", borderRadius: 10,
            fontSize: 14, fontWeight: 700, cursor: "pointer",
          }}>In E-Mail-Client öffnen</button>
        </div>
      </div>
    </div>
  );
}
