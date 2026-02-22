import { useState, useEffect, useCallback } from "react";
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
const EMAIL_TEMPLATES = [
  {
    id: "intro",
    name: "Ersteinladung",
    subject: "Ihre persönliche Einladung zum GuideTranslator Kalkulator",
    body: (contact, link) => `Sehr geehrte/r ${contact.name},

vielen Dank für Ihr Interesse an GuideTranslator — der KI-gestützten Echtzeit-Übersetzungslösung für Kreuzfahrt-Landausflüge.

Wir haben für Sie einen persönlichen Zugang zu unserem Enterprise-Kalkulator eingerichtet, mit dem Sie die konkreten Einsparungen für ${contact.company} berechnen können.

Ihr persönlicher Link:
${link}

Bitte klicken Sie auf den Link, prüfen Sie Ihre Daten und vergeben Sie ein Passwort. Danach können Sie direkt Ihre individuelle Kostenanalyse erstellen.

Bei Fragen stehen wir Ihnen jederzeit zur Verfügung.

Mit freundlichen Grüßen
Ulrich Deibel
GuideTranslator Enterprise
enterprise@guidetranslator.com`,
  },
  {
    id: "followup",
    name: "Nachfass / Follow-up",
    subject: "Haben Sie schon Ihre Einsparung berechnet?",
    body: (contact, link) => `Sehr geehrte/r ${contact.name},

vor kurzem haben wir Ihnen Ihren persönlichen Zugang zum GuideTranslator Enterprise-Kalkulator eingerichtet. Wir möchten sicherstellen, dass alles funktioniert und Sie Ihre individuelle Kostenanalyse erstellen konnten.

Falls Sie noch nicht dazu gekommen sind — hier nochmals Ihr persönlicher Link:
${link}

Unsere Kunden sparen durchschnittlich über 90% gegenüber traditionellen Guide-Kosten. Gerne gehen wir die Ergebnisse gemeinsam durch und erstellen ein maßgeschneidertes Angebot für ${contact.company}.

Wann hätten Sie Zeit für ein 15-minütiges Gespräch?

Beste Grüße
Ulrich Deibel
GuideTranslator Enterprise
enterprise@guidetranslator.com`,
  },
  {
    id: "demo",
    name: "Demo-Einladung",
    subject: "Live-Demo: GuideTranslator für ${company}",
    body: (contact, link) => `Sehr geehrte/r ${contact.name},

wir würden Ihnen gerne in einer kurzen Live-Demo zeigen, wie GuideTranslator die Sprachbarriere bei Landausflügen für ${contact.company} lösen kann.

Vorab können Sie bereits Ihre individuelle Kostenanalyse erstellen:
${link}

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
  },
];

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

  return <AdminDashboard onBack={onBack} />;
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 32 }}>
              {[
                { label: "Kontakte gesamt", value: leads.length, color: T.gold },
                { label: "Registriert", value: leads.filter(l => l.status === "registered" || l.password).length, color: T.green },
                { label: "Eingeladen", value: leads.filter(l => l.invite_token && !l.password).length, color: T.seaLight },
                { label: "Kalkulationen", value: leads.reduce((s, l) => s + (l.calc_count || 0), 0), color: T.goldLight },
                { label: "Angebote angefragt", value: leads.filter(l => l.status === "request_sent").length, color: T.green },
              ].map((s, i) => (
                <div key={i} style={{ background: T.navyLight, borderRadius: 12, padding: "16px 20px", border: `1px solid ${T.navyMid}` }}>
                  <div style={{ fontSize: 11, color: T.grayLight, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontFamily: font, fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

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
  const [copiedId, setCopiedId] = useState(null);

  const filtered = leads.filter(l =>
    !search || [l.name, l.email, l.company].some(v => v && v.toLowerCase().includes(search.toLowerCase()))
  );

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
    if (lead.status === "request_sent") return { label: "Angebot", color: T.green };
    if (lead.password || lead.status === "registered") return { label: "Registriert", color: T.seaLight };
    if (lead.invite_token) return { label: "Eingeladen", color: T.gold };
    return { label: "Neu", color: T.gray };
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
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

      {/* Table */}
      <div style={{ background: T.navyLight, borderRadius: 16, border: `1px solid ${T.navyMid}`, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.navyMid}` }}>
                {["Name", "E-Mail", "Unternehmen", "Status", "Kalkulationen", "Letzte Aktivität", "Aktionen"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, color: T.grayLight, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(lead => {
                const badge = statusBadge(lead);
                return (
                  <tr key={lead.id} style={{ borderBottom: `1px solid ${T.navyMid}08`, cursor: "pointer" }} onClick={() => onSelect(lead)}>
                    <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 600 }}>{lead.name || "—"}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: T.grayLight }}>{lead.email}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13 }}>{lead.company || "—"}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: `${badge.color}15`, color: badge.color, border: `1px solid ${badge.color}30` }}>{badge.label}</span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 14, fontFamily: font, fontWeight: 600, color: T.gold }}>{lead.calc_count || 0}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: T.gray }}>{fmtDate(lead.last_activity)}</td>
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
                <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: T.gray }}>Keine Kontakte gefunden.</td></tr>
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
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [calcRes, reqRes] = await Promise.all([
          supabase.from('gt_calculations').select('*').eq('lead_id', lead.id).order('created_at', { ascending: false }),
          supabase.from('gt_contact_requests').select('*').eq('lead_id', lead.id).order('created_at', { ascending: false }),
        ]);
        setCalcs(calcRes.data || []);
        setRequests(reqRes.data || []);
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
  };

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
          <div style={{ fontSize: 11, padding: "4px 12px", borderRadius: 20, background: lead.password ? `${T.green}15` : lead.invite_token ? `${T.gold}15` : `${T.gray}15`, color: lead.password ? T.green : lead.invite_token ? T.gold : T.gray, border: `1px solid ${lead.password ? T.green : lead.invite_token ? T.gold : T.gray}30` }}>
            {lead.password || lead.status === "registered" ? "Registriert" : lead.invite_token ? "Eingeladen" : "Neu"}
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

        {/* Invite Link Section */}
        <div style={{ marginTop: 20, padding: "16px 0 0", borderTop: `1px solid ${T.navyMid}` }}>
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

  const registered = leads.filter(l => l.password || l.status === "registered");
  const withCalcs = leads.filter(l => l.calc_count > 0);
  const requested = leads.filter(l => l.status === "request_sent");

  return (
    <div>
      <h2 style={{ fontFamily: font, fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Aktivitäts-Übersicht</h2>

      {/* Funnel */}
      <div style={{ background: T.navyLight, borderRadius: 16, padding: 24, border: `1px solid ${T.navyMid}`, marginBottom: 24 }}>
        <h3 style={{ fontFamily: font, fontSize: 18, marginBottom: 16 }}>Conversion Funnel</h3>
        {[
          { label: "Kontakte angelegt", count: leads.length, pct: 100, color: T.gray },
          { label: "Eingeladen (Link generiert)", count: leads.filter(l => l.invite_token).length, pct: leads.length ? (leads.filter(l => l.invite_token).length / leads.length * 100) : 0, color: T.gold },
          { label: "Registriert (Passwort vergeben)", count: registered.length, pct: leads.length ? (registered.length / leads.length * 100) : 0, color: T.seaLight },
          { label: "Kalkulation gemacht", count: withCalcs.length, pct: leads.length ? (withCalcs.length / leads.length * 100) : 0, color: T.goldLight },
          { label: "Angebot angefragt", count: requested.length, pct: leads.length ? (requested.length / leads.length * 100) : 0, color: T.green },
        ].map((step, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
              <span style={{ color: T.grayLight }}>{step.label}</span>
              <span style={{ color: step.color, fontWeight: 600 }}>{step.count} ({step.pct.toFixed(0)}%)</span>
            </div>
            <div style={{ background: T.navyMid, borderRadius: 4, height: 8, overflow: "hidden" }}>
              <div style={{ width: `${step.pct}%`, height: "100%", background: step.color, borderRadius: 4, transition: "width 0.5s" }} />
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <h3 style={{ fontFamily: font, fontSize: 18, marginBottom: 16 }}>Letzte Aktivitäten</h3>
      {sorted.slice(0, 20).map(lead => (
        <div key={lead.id} onClick={() => onSelect(lead)} style={{ background: T.navyLight, borderRadius: 10, padding: "12px 16px", border: `1px solid ${T.navyMid}`, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
          <div>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{lead.name || "Unbekannt"}</span>
            <span style={{ color: T.grayLight, fontSize: 13, marginLeft: 12 }}>{lead.company || ""}</span>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center", fontSize: 12 }}>
            {lead.calc_count > 0 && <span style={{ color: T.gold }}>{lead.calc_count} Kalk.</span>}
            {(lead.password || lead.status === "registered") && <span style={{ color: T.green }}>✓ Reg.</span>}
            <span style={{ color: T.gray }}>{fmtDate(lead.last_activity)}</span>
          </div>
        </div>
      ))}
      {!sorted.length && <div style={{ textAlign: "center", padding: 40, color: T.gray }}>Keine Aktivitäten vorhanden.</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// EMAIL MODAL
// ═══════════════════════════════════════════════════════════════
function EmailModal({ lead, onClose }) {
  const [selectedTemplate, setSelectedTemplate] = useState(EMAIL_TEMPLATES[0].id);
  const [copied, setCopied] = useState(null); // "subject" | "body" | null

  if (!lead) return null;

  // Generate invite link if not present
  const inviteLink = lead.invite_token
    ? `${getAppUrl()}/?invite=${lead.invite_token}`
    : "(Bitte zuerst einen Einladungslink generieren)";

  const template = EMAIL_TEMPLATES.find(t => t.id === selectedTemplate);
  const subject = template.subject.replace("${company}", lead.company || "Ihr Unternehmen");
  const body = template.body(lead, inviteLink);

  const copyToClipboard = async (text, type) => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const openMailto = () => {
    window.open(`mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  };

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
          <label style={{ fontSize: 12, color: T.grayLight, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, display: "block" }}>Vorlage wählen</label>
          <div style={{ display: "flex", gap: 8 }}>
            {EMAIL_TEMPLATES.map(t => (
              <button key={t.id} onClick={() => setSelectedTemplate(t.id)} style={{
                padding: "8px 16px", borderRadius: 10, cursor: "pointer",
                background: selectedTemplate === t.id ? `${T.gold}15` : T.navyMid,
                border: selectedTemplate === t.id ? `1px solid ${T.gold}50` : `1px solid transparent`,
                color: selectedTemplate === t.id ? T.gold : T.grayLight, fontSize: 13,
              }}>{t.name}</button>
            ))}
          </div>
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
