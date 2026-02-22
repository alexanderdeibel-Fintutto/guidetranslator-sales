import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "./supabaseClient";
import Admin from "./Admin";

// ─── DESIGN TOKENS ───────────────────────────────────────────
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

// ─── ICONS ───────────────────────────────────────────────────
const Icon = ({ name, size = 20, color = T.gold }) => {
  const p = {
    ship: <path d="M3 17h1l1-5h14l1 5h1a1 1 0 010 2H2a1 1 0 010-2zm3-8h12v3H6V9zm2-4h8v3H8V5z"/>,
    globe: <><circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeWidth="1.5"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z" fill="none" stroke={color} strokeWidth="1.5"/></>,
    money: <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"/>,
    chart: <path d="M3 3v18h18M7 16l4-4 4 4 5-6" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>,
    users: <><circle cx="9" cy="7" r="4" fill="none" stroke={color} strokeWidth="1.5"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" fill="none" stroke={color} strokeWidth="1.5"/><circle cx="19" cy="7" r="3" fill="none" stroke={color} strokeWidth="1.5"/><path d="M21 21v-2a3 3 0 00-2-3" fill="none" stroke={color} strokeWidth="1.5"/></>,
    check: <path d="M5 13l4 4L19 7" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>,
    arrow: <path d="M5 12h14M12 5l7 7-7 7" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>,
    save: <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zM17 21v-8H7v8M7 3v5h8" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>,
    calc: <><rect x="4" y="2" width="16" height="20" rx="2" fill="none" stroke={color} strokeWidth="1.5"/><path d="M8 6h8M8 10h2M14 10h2M8 14h2M14 14h2M8 18h8" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></>,
    mail: <><rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke={color} strokeWidth="1.5"/><path d="M22 4l-10 8L2 4" fill="none" stroke={color} strokeWidth="1.5"/></>,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2" fill="none" stroke={color} strokeWidth="1.5"/><path d="M7 11V7a5 5 0 0110 0v4" fill="none" stroke={color} strokeWidth="1.5"/></>,
    mic: <><rect x="9" y="1" width="6" height="12" rx="3" fill="none" stroke={color} strokeWidth="1.5"/><path d="M5 10a7 7 0 0014 0M12 17v4M8 21h8" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none">{p[name]}</svg>;
};

// ─── HELPERS ─────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("de-DE").format(Math.round(n));
const fmtEur = (n) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const fmtPct = (n) => `${n.toFixed(1)}%`;

// ─── SUPABASE HELPERS ────────────────────────────────────────
async function upsertLead(leadData) {
  const { data, error } = await supabase
    .from('gt_leads')
    .upsert({ 
      email: leadData.email,
      name: leadData.name,
      company: leadData.company,
      role: leadData.role || null,
      fleet_size: leadData.ships || null,
      phone: leadData.phone || null,
      source: 'sales_calculator',
      status: 'new',
      last_activity: new Date().toISOString(),
    }, { onConflict: 'email' })
    .select()
    .single();
  return { data, error };
}

async function loadLeadByEmail(email) {
  const { data } = await supabase
    .from('gt_leads')
    .select('*')
    .eq('email', email)
    .single();
  return data;
}

async function saveCalculation(leadId, calcData) {
  const { data, error } = await supabase
    .from('gt_calculations')
    .insert({
      lead_id: leadId,
      name: calcData.name,
      inputs: calcData.inputs,
      results: {
        totalExcursions: calcData.totalExcursions,
        totalTraditionalCost: calcData.totalTraditionalCost,
        totalFintuttoCost: calcData.totalFintuttoCost,
        annualLicense: calcData.annualLicense,
        totalApiCostEur: calcData.totalApiCostEur,
        savings: calcData.savings,
        savingsPct: calcData.savingsPct,
        costPerPaxPerExcursion: calcData.costPerPaxPerExcursion,
        tierName: calcData.tierName,
      },
    })
    .select()
    .single();
  return { data, error };
}

async function loadCalculations(leadId) {
  const { data } = await supabase
    .from('gt_calculations')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });
  return data || [];
}

async function deleteCalculation(calcId) {
  await supabase.from('gt_calculations').delete().eq('id', calcId);
}

async function submitContactRequest(leadId, requestData) {
  const { data, error } = await supabase
    .from('gt_contact_requests')
    .insert({
      lead_id: leadId,
      interest_level: requestData.interest,
      timeline: requestData.timeline,
      message: requestData.message,
    })
    .select()
    .single();
  
  // Update lead status
  await supabase
    .from('gt_leads')
    .update({ status: 'request_sent', last_activity: new Date().toISOString() })
    .eq('id', leadId);
  
  return { data, error };
}

// ─── LOCAL STORAGE FALLBACK (if Supabase not configured) ─────
const LS_KEY = "gt-sales-data";
function lsLoad() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || null; } catch { return null; } }
function lsSave(d) { try { localStorage.setItem(LS_KEY, JSON.stringify(d)); } catch {} }

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [page, setPage] = useState("landing");
  const [lead, setLead] = useState(null);
  const [leadId, setLeadId] = useState(null);
  const [savedCalcs, setSavedCalcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [useSupabase, setUseSupabase] = useState(false);
  const [invitePrefill, setInvitePrefill] = useState(null);

  useEffect(() => {
    (async () => {
      // Check URL for admin or invite routes
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      const inviteToken = params.get("invite");

      if (path === "/admin" || path.startsWith("/admin")) {
        setPage("admin");
        setLoading(false);
        return;
      }

      // Check if Supabase is configured
      const hasKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      setUseSupabase(!!hasKey);

      // Handle invite token
      if (inviteToken && hasKey) {
        try {
          const { data } = await supabase
            .from('gt_leads')
            .select('*')
            .eq('invite_token', inviteToken)
            .single();
          if (data) {
            setInvitePrefill({
              name: data.name || "",
              email: data.email || "",
              company: data.company || "",
              role: data.role || "",
              ships: data.fleet_size || "",
              phone: data.phone || "",
              _inviteToken: inviteToken,
              _leadId: data.id,
            });
            setPage("register");
            setLoading(false);
            return;
          }
        } catch (e) { console.log("Invite lookup failed:", e); }
      }

      // Try loading from localStorage first (for instant UX)
      const local = lsLoad();
      if (local?.lead) {
        setLead(local.lead);
        setLeadId(local.leadId);
        setSavedCalcs(local.calcs || []);
        setPage("calculator");

        // If Supabase available, sync
        if (hasKey && local.lead.email) {
          try {
            const dbLead = await loadLeadByEmail(local.lead.email);
            if (dbLead) {
              setLeadId(dbLead.id);
              const calcs = await loadCalculations(dbLead.id);
              if (calcs.length) setSavedCalcs(calcs.map(c => ({
                id: c.id, name: c.name, date: c.created_at,
                inputs: c.inputs, ...c.results,
              })));
            }
          } catch (e) { console.log("Supabase sync skipped:", e); }
        }
      }
      setLoading(false);
    })();
  }, []);

  const handleRegister = async (info) => {
    const { password, _inviteToken, _leadId, ...leadInfo } = info;
    setLead(leadInfo);
    let dbId = _leadId || null;

    if (useSupabase) {
      try {
        if (_inviteToken && _leadId) {
          // Invite registration: update existing lead with password and mark as registered
          const updateData = {
            name: leadInfo.name,
            company: leadInfo.company,
            role: leadInfo.role || null,
            fleet_size: leadInfo.ships || null,
            phone: leadInfo.phone || null,
            password: password || null,
            status: 'registered',
            last_login: new Date().toISOString(),
            last_activity: new Date().toISOString(),
          };
          await supabase.from('gt_leads').update(updateData).eq('id', _leadId);
          dbId = _leadId;
        } else {
          const { data } = await upsertLead(leadInfo);
          if (data) dbId = data.id;
        }
      } catch (e) { console.log("Supabase lead save failed:", e); }
    }

    setLeadId(dbId);
    setSavedCalcs([]);
    setInvitePrefill(null);
    // Clean up URL
    window.history.replaceState({}, '', window.location.pathname);
    lsSave({ lead: leadInfo, leadId: dbId, calcs: [] });
    setPage("calculator");
  };

  const handleSaveCalc = async (calc) => {
    let savedCalc = { ...calc, id: Date.now(), date: new Date().toISOString() };

    if (useSupabase && leadId) {
      try {
        const { data } = await saveCalculation(leadId, calc);
        if (data) savedCalc = { ...savedCalc, id: data.id, date: data.created_at };
      } catch (e) { console.log("Supabase calc save failed:", e); }
    }

    const updated = [...savedCalcs, savedCalc];
    setSavedCalcs(updated);
    lsSave({ lead, leadId, calcs: updated });
  };

  const handleDeleteCalc = async (id) => {
    if (useSupabase) {
      try { await deleteCalculation(id); } catch {}
    }
    const updated = savedCalcs.filter(c => c.id !== id);
    setSavedCalcs(updated);
    lsSave({ lead, leadId, calcs: updated });
  };

  const handleContact = async (requestData) => {
    if (useSupabase && leadId) {
      try { await submitContactRequest(leadId, requestData); } catch (e) { console.log("Contact request failed:", e); }
    }
    return true;
  };

  const handleLogout = () => {
    setLead(null); setLeadId(null); setSavedCalcs([]); setPage("landing");
    localStorage.removeItem(LS_KEY);
  };

  if (loading) return (
    <div style={{ background: T.navy, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: T.gold, fontFamily: font, fontSize: 24, animation: "pulse 1.5s infinite" }}>GuideTranslator</div>
    </div>
  );

  const Nav = () => (
    <nav style={{
      position: "sticky", top: 0, zIndex: 100,
      background: `${T.navy}ee`, backdropFilter: "blur(20px)",
      borderBottom: `1px solid ${T.navyMid}`,
      padding: "0 24px", height: 64,
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setPage(lead ? "calculator" : "landing")}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: font, fontWeight: 700, fontSize: 14, color: T.navy,
        }}>GT</div>
        <span style={{ fontFamily: font, fontSize: 18, color: T.whiteTrue, fontWeight: 600 }}>GuideTranslator</span>
        <span style={{
          fontSize: 10, color: T.gold, background: `${T.gold}15`,
          padding: "2px 8px", borderRadius: 20, fontFamily: fontSans,
          border: `1px solid ${T.gold}30`, letterSpacing: 1, textTransform: "uppercase",
        }}>Enterprise</span>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {[
          { label: "Lösung", pg: "landing" },
          ...(lead ? [{ label: "Kalkulator", pg: "calculator" }] : []),
          ...(savedCalcs.length ? [{ label: `Kalkulationen (${savedCalcs.length})`, pg: "saved" }] : []),
          ...(lead ? [{ label: "Angebot", pg: "contact" }] : []),
        ].map(({ label, pg }) => (
          <button key={pg} onClick={() => setPage(pg)} style={{
            background: page === pg ? `${T.gold}20` : "transparent",
            border: page === pg ? `1px solid ${T.gold}40` : "1px solid transparent",
            color: page === pg ? T.gold : T.grayLight,
            padding: "6px 14px", borderRadius: 8, cursor: "pointer",
            fontFamily: fontSans, fontSize: 13, fontWeight: 500, transition: "all .2s",
          }}>{label}</button>
        ))}
        {lead && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 8, paddingLeft: 8, borderLeft: `1px solid ${T.navyMid}` }}>
            <span style={{ fontSize: 12, color: T.grayLight, fontFamily: fontSans }}>{lead.company}</span>
            <button onClick={handleLogout} style={{ background: "transparent", border: "none", color: T.gray, fontSize: 11, cursor: "pointer" }}>×</button>
          </div>
        )}
      </div>
    </nav>
  );

  return (
    <div style={{ background: T.navy, minHeight: "100vh", color: T.whiteTrue, fontFamily: fontSans }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        ::selection{background:${T.gold}40;color:${T.whiteTrue}}
        input,select,textarea{font-family:${fontSans}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        .fu{animation:fadeUp .7s ease both}.fu1{animation:fadeUp .7s ease .1s both}.fu2{animation:fadeUp .7s ease .2s both}.fu3{animation:fadeUp .7s ease .3s both}.fu4{animation:fadeUp .7s ease .4s both}
        .hl{transition:transform .25s,box-shadow .25s}.hl:hover{transform:translateY(-4px);box-shadow:0 20px 60px rgba(0,0,0,.4)}
        .gg{box-shadow:0 0 40px ${T.gold}15,0 0 80px ${T.gold}08}
        input:focus,select:focus,textarea:focus{outline:none;border-color:${T.gold}!important;box-shadow:0 0 0 3px ${T.gold}20}
        input[type=range]{width:100%;height:6px;-webkit-appearance:none;background:${T.navyMid};border-radius:3px;outline:none;accent-color:${T.gold}}
      `}</style>
      {page === "admin" ? (
        <Admin onBack={() => { setPage("landing"); window.history.replaceState({}, '', '/'); }} />
      ) : (
        <>
          <Nav />
          {page === "landing" && <Landing onStart={() => lead ? setPage("calculator") : setPage("register")} lead={lead} setPage={setPage} />}
          {page === "register" && <Register onRegister={handleRegister} setPage={setPage} prefill={invitePrefill} />}
          {page === "calculator" && <Calculator onSave={handleSaveCalc} lead={lead} setPage={setPage} />}
          {page === "saved" && <Saved calcs={savedCalcs} onDelete={handleDeleteCalc} setPage={setPage} lead={lead} />}
          {page === "contact" && <Contact lead={lead} calcs={savedCalcs} setPage={setPage} onSubmit={handleContact} />}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LANDING
// ═══════════════════════════════════════════════════════════════
function Landing({ onStart, lead, setPage }) {
  const S = ({ num, label, sub }) => (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: font, fontSize: 36, fontWeight: 700, color: T.gold }}>{num}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: T.whiteTrue, marginTop: 4 }}>{label}</div>
      <div style={{ fontSize: 11, color: T.gray, marginTop: 2 }}>{sub}</div>
    </div>
  );

  return (
    <div>
      {/* HERO */}
      <section style={{
        minHeight: "calc(100vh - 64px)", display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center", textAlign: "center", padding: "60px 24px",
        background: `radial-gradient(ellipse at 50% 20%, ${T.navyLight} 0%, ${T.navy} 70%)`,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: 80, left: "10%", width: 300, height: 300, borderRadius: "50%", background: `${T.sea}08`, filter: "blur(80px)" }} />
        <div style={{ position: "absolute", bottom: 100, right: "10%", width: 250, height: 250, borderRadius: "50%", background: `${T.gold}06`, filter: "blur(60px)" }} />

        <div className="fu" style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${T.gold}10`, border: `1px solid ${T.gold}25`, borderRadius: 30, padding: "6px 20px", marginBottom: 32 }}>
            <Icon name="ship" size={16} />
            <span style={{ fontSize: 13, color: T.gold, letterSpacing: 1, textTransform: "uppercase", fontWeight: 500 }}>Cruise Line Enterprise Solution</span>
          </div>
        </div>

        <h1 className="fu1" style={{ fontFamily: font, fontSize: "clamp(32px, 5vw, 64px)", fontWeight: 700, lineHeight: 1.1, maxWidth: 900, position: "relative", zIndex: 1 }}>
          <span>Ihr Guide spricht eine Sprache.</span><br />
          <span style={{ background: `linear-gradient(135deg, ${T.gold}, ${T.goldLight})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Ihre Gäste hören alle.</span>
        </h1>

        <p className="fu2" style={{ fontSize: "clamp(16px, 2vw, 20px)", color: T.grayLight, maxWidth: 640, lineHeight: 1.6, marginTop: 24, position: "relative", zIndex: 1 }}>
          KI-gestützte Echtzeit-Übersetzung für Landausflüge, Bordprogramme und Shore Excursions — in über 130 Sprachen, für weniger als 1 Cent pro Passagier.
        </p>

        <div className="fu3" style={{ display: "flex", gap: 16, marginTop: 40, flexWrap: "wrap", justifyContent: "center", position: "relative", zIndex: 1 }}>
          <button onClick={onStart} style={{
            background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`,
            color: T.navy, border: "none", padding: "16px 36px", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer",
            fontFamily: fontSans, display: "flex", alignItems: "center", gap: 10, boxShadow: `0 8px 32px ${T.gold}30`,
          }}>
            <Icon name="calc" size={20} color={T.navy} />
            {lead ? "Zum Kalkulator" : "Einsparung berechnen"}
          </button>
        </div>

        <div className="fu4" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 24, marginTop: 64, maxWidth: 700, width: "100%", position: "relative", zIndex: 1 }}>
          <S num="93%" label="Kostenersparnis" sub="vs. traditionelle Guides" />
          <S num="130+" label="Sprachen" sub="in Echtzeit verfügbar" />
          <S num="<1¢" label="pro Passagier" sub="pro Landausflug" />
          <S num="2-4s" label="Latenz" sub="Echtzeit-Übersetzung" />
        </div>
      </section>

      {/* PAIN POINTS */}
      <section style={{ padding: "80px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <h2 style={{ fontFamily: font, fontSize: "clamp(24px, 3.5vw, 40px)", fontWeight: 700, textAlign: "center", marginBottom: 48 }}>
          Das Problem kostet Sie <span style={{ color: T.red }}>Millionen</span>
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
          {[
            { icon: "globe", title: "Sprachbarriere", desc: "5-6 Sprachen statt 130+. Japanische, koreanische, arabische Gäste werden ausgeschlossen." },
            { icon: "money", title: "Guide-Kosten", desc: "€200-500 pro Guide pro Tag pro Sprache. 8 Sprachen = bis zu €4.000 pro Ausflug." },
            { icon: "users", title: "Verfügbarkeit", desc: "An exotischen Destinationen gibt es schlicht keine Guides in vielen Sprachen." },
            { icon: "chart", title: "Skalierung", desc: "Jedes neue Schiff, jede neue Route = neue Guides finden. Der Markt wächst, Guides nicht." },
          ].map((p, i) => (
            <div key={i} className="hl" style={{ background: T.navyLight, borderRadius: 16, padding: 28, border: `1px solid ${T.navyMid}` }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: `${T.gold}10`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Icon name={p.icon} size={24} />
              </div>
              <h3 style={{ fontFamily: font, fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{p.title}</h3>
              <p style={{ fontSize: 14, color: T.grayLight, lineHeight: 1.6 }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* COMPARISON */}
      <section style={{ padding: "80px 24px", background: `linear-gradient(180deg, ${T.navyLight} 0%, ${T.navy} 100%)` }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{ fontFamily: font, fontSize: "clamp(24px, 3.5vw, 36px)", textAlign: "center", marginBottom: 48 }}>
            Traditionell vs. <span style={{ color: T.gold }}>GuideTranslator</span>
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={{ background: `${T.red}08`, border: `1px solid ${T.red}20`, borderRadius: 16, padding: 28 }}>
              <div style={{ fontSize: 14, color: T.red, fontWeight: 600, marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>Heute</div>
              {["8 Guides × €300/Tag = €2.400/Ausflug", "Nur 5-6 Sprachen verfügbar", "Qualität nicht kontrollierbar", "€480.000/Schiff/Jahr"].map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10, fontSize: 14, color: T.grayLight }}><span style={{ color: T.red }}>✗</span>{t}</div>
              ))}
            </div>
            <div className="gg" style={{ background: `${T.gold}08`, border: `1px solid ${T.gold}25`, borderRadius: 16, padding: 28 }}>
              <div style={{ fontSize: 14, color: T.gold, fontWeight: 600, marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>Mit GuideTranslator</div>
              {["1 Guide + KI = alle Sprachen", "130+ Sprachen sofort verfügbar", "Standardisierte, geprüfte Inhalte", "~€32.500/Schiff/Jahr (-93%)"].map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10, fontSize: 14, color: T.whiteTrue }}><Icon name="check" size={16} color={T.green} />{t}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: "80px 24px", maxWidth: 900, margin: "0 auto" }}>
        <h2 style={{ fontFamily: font, fontSize: "clamp(24px, 3.5vw, 36px)", textAlign: "center", marginBottom: 48 }}>So funktioniert es</h2>
        {[
          { s: "01", icon: "mic", t: "Guide spricht", d: "Ihr Guide führt die Tour in seiner Muttersprache. Keine Änderung am bestehenden Ablauf." },
          { s: "02", icon: "globe", t: "KI übersetzt in Echtzeit", d: "Google Cloud Translation erkennt und übersetzt in 2-4 Sekunden in alle gewünschten Zielsprachen." },
          { s: "03", icon: "users", t: "Gäste hören in ihrer Sprache", d: "Passagiere scannen einen QR-Code, wählen ihre Sprache und hören auf dem eigenen Smartphone." },
        ].map((x, i) => (
          <div key={i} style={{ display: "flex", gap: 24, alignItems: "flex-start", background: T.navyLight, borderRadius: 16, padding: 28, border: `1px solid ${T.navyMid}`, marginBottom: 16 }}>
            <div style={{ minWidth: 56, height: 56, borderRadius: 14, background: `linear-gradient(135deg, ${T.gold}20, ${T.gold}05)`, border: `1px solid ${T.gold}30`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font, fontSize: 20, fontWeight: 700, color: T.gold }}>{x.s}</div>
            <div><h3 style={{ fontFamily: font, fontSize: 20, fontWeight: 600, marginBottom: 6 }}>{x.t}</h3><p style={{ fontSize: 14, color: T.grayLight, lineHeight: 1.6 }}>{x.d}</p></div>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section style={{ padding: "80px 24px", textAlign: "center", background: `linear-gradient(135deg, ${T.navyMid}, ${T.navyLight})`, borderTop: `1px solid ${T.gold}15` }}>
        <h2 style={{ fontFamily: font, fontSize: "clamp(24px, 3.5vw, 40px)", maxWidth: 600, margin: "0 auto 16px" }}>Berechnen Sie Ihre <span style={{ color: T.gold }}>Ersparnis</span></h2>
        <p style={{ color: T.grayLight, marginBottom: 32 }}>Individuell für Ihre Flotte — in 2 Minuten</p>
        <button onClick={onStart} style={{ background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`, color: T.navy, border: "none", padding: "18px 48px", borderRadius: 12, fontSize: 18, fontWeight: 700, cursor: "pointer", boxShadow: `0 8px 32px ${T.gold}30` }}>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}><Icon name="arrow" size={20} color={T.navy} />{lead ? "Kalkulator öffnen" : "Kostenlos berechnen"}</span>
        </button>
      </section>

      <footer style={{ padding: "32px 24px", textAlign: "center", borderTop: `1px solid ${T.navyMid}` }}>
        <p style={{ fontSize: 12, color: T.gray }}>© 2026 FinTuttO GmbH — Powered by Google Cloud AI | <a href="https://fintutto.de" style={{ color: T.gold, textDecoration: "none" }}>fintutto.de</a></p>
      </footer>
    </div>
  );
}

// ─── FORM FIELD (extracted to prevent cursor jumping on re-render) ──
function FormField({ label, name, type = "text", ph, req, opts, value, onChange }) {
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
// REGISTER (Lead Capture)
// ═══════════════════════════════════════════════════════════════
function Register({ onRegister, setPage, prefill }) {
  const [f, setF] = useState(prefill || { name: "", email: "", company: "", role: "", ships: "", phone: "" });
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isInvite = !!prefill;

  const handleChange = useCallback((name, value) => {
    setF(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!f.name || !f.email || !f.company) { setErr("Bitte Name, E-Mail und Unternehmen ausfüllen."); return; }
    if (isInvite && !password) { setErr("Bitte vergeben Sie ein Passwort."); return; }
    setSubmitting(true);
    await onRegister({ ...f, password: password || undefined });
    setSubmitting(false);
  };

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "60px 24px" }}>
      <div className="fu" style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", margin: "0 auto 20px", background: `linear-gradient(135deg, ${T.gold}20, ${T.gold}05)`, border: `1px solid ${T.gold}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="lock" size={28} />
        </div>
        <h2 style={{ fontFamily: font, fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
          {isInvite ? "Willkommen bei GuideTranslator" : "Enterprise Kalkulator"}
        </h2>
        <p style={{ color: T.grayLight, fontSize: 15 }}>
          {isInvite
            ? "Bitte prüfen Sie Ihre Daten und vergeben Sie ein Passwort."
            : "Registrieren Sie sich kostenlos für Ihren individuellen Einsparungs-Kalkulator."}
        </p>
      </div>
      <form onSubmit={handleSubmit} className="fu1" style={{ background: T.navyLight, borderRadius: 20, padding: 32, border: `1px solid ${T.navyMid}`, display: "flex", flexDirection: "column", gap: 16 }}>
        <FormField label="Ihr Name" name="name" ph="Max Mustermann" req value={f.name} onChange={handleChange} />
        <FormField label="E-Mail" name="email" type="email" ph="m.mustermann@reederei.de" req value={f.email} onChange={handleChange} />
        <FormField label="Unternehmen / Reederei" name="company" ph="z.B. AIDA Cruises" req value={f.company} onChange={handleChange} />
        <FormField label="Ihre Position" name="role" value={f.role} onChange={handleChange} opts={["C-Level / Geschäftsführung", "VP / Director Shore Excursions", "Einkauf / Procurement", "IT / Digital", "Operations", "Hotel Director", "Marketing", "Sonstige"]} />
        <FormField label="Flottengröße" name="ships" value={f.ships} onChange={handleChange} opts={["1-2 Schiffe", "3-5 Schiffe", "6-10 Schiffe", "11-20 Schiffe", "20+ Schiffe"]} />
        <FormField label="Telefon (optional)" name="phone" type="tel" ph="+49 ..." value={f.phone} onChange={handleChange} />
        {isInvite && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, color: T.grayLight, fontWeight: 500 }}>Passwort vergeben <span style={{ color: T.gold }}>*</span></label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mindestens 6 Zeichen" style={{ width: "100%", background: T.navyMid, border: `1px solid ${T.navyMid}`, borderRadius: 10, padding: "12px 16px", color: T.whiteTrue, fontSize: 15 }} />
          </div>
        )}
        {err && <p style={{ color: T.red, fontSize: 13 }}>{err}</p>}
        <button type="submit" disabled={submitting} style={{ background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`, color: T.navy, border: "none", padding: "14px 24px", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer", marginTop: 8, opacity: submitting ? 0.6 : 1 }}>
          {submitting ? "Wird gespeichert..." : isInvite ? "Registrierung abschließen" : "Kostenlos registrieren & berechnen"}
        </button>
        <p style={{ fontSize: 11, color: T.gray, textAlign: "center" }}>Keine Kreditkarte erforderlich. DSGVO-konform.</p>
      </form>
      {!isInvite && <button onClick={() => setPage("landing")} style={{ background: "transparent", border: "none", color: T.grayLight, fontSize: 14, marginTop: 20, cursor: "pointer", display: "block", margin: "20px auto 0" }}>← Zurück</button>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CALCULATOR
// ═══════════════════════════════════════════════════════════════
function Calculator({ onSave, lead, setPage }) {
  const [c, setC] = useState({ ships: 5, paxPerShip: 4000, excursionDays: 200, excursionsPerDay: 2, paxParticipation: 60, guideMinsPerExcursion: 90, languages: 8, costPerGuideDay: 350, ttsQuality: "neural2" });
  const [showResult, setShowResult] = useState(false);
  const [saved, setSaved] = useState(false);
  const ref = useRef(null);

  const totalExcursions = c.ships * c.excursionDays * c.excursionsPerDay;
  const paxPerExcursion = Math.round(c.paxPerShip * (c.paxParticipation / 100));
  const guideChars = c.guideMinsPerExcursion * 900;
  const transChars = guideChars * c.languages;
  const transCost = 0.00002;
  const ttsCost = c.ttsQuality === "wavenet" ? 0.000004 : c.ttsQuality === "neural2" ? 0.000016 : 0.00003;
  const apiPerExc = transChars * (transCost + ttsCost);
  const totalApi = totalExcursions * apiPerExc * 0.92;
  let monthlyLic = 0, tier = "";
  if (c.ships <= 1) { monthlyLic = 2990; tier = "Starter"; }
  else if (c.ships <= 5) { monthlyLic = 9990; tier = "Fleet"; }
  else if (c.ships <= 10) { monthlyLic = 19990; tier = "Armada"; }
  else { monthlyLic = 19990 + (c.ships - 10) * 1500; tier = "Custom Enterprise"; }
  const annualLic = monthlyLic * 12;
  const totalFT = totalApi + annualLic;
  const costPP = totalFT / (totalExcursions * paxPerExcursion);
  const tradPerExc = c.languages * c.costPerGuideDay;
  const totalTrad = totalExcursions * tradPerExc;
  const savings = totalTrad - totalFT;
  const savPct = (savings / totalTrad) * 100;

  const calcResult = {
    name: `${lead?.company || "Kalkulation"} — ${c.ships} Schiffe, ${c.languages} Sprachen`,
    inputs: { ...c }, totalExcursions, totalTraditionalCost: totalTrad, totalFintuttoCost: totalFT,
    annualLicense: annualLic, totalApiCostEur: totalApi, savings, savingsPct: savPct, costPerPaxPerExcursion: costPP, tierName: tier,
  };

  const doCalc = () => { setShowResult(true); setSaved(false); setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth" }), 100); };
  const doSave = async () => { await onSave(calcResult); setSaved(true); };

  const Sl = ({ label, name, min, max, step = 1, unit = "", format: fm }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: T.grayLight, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: T.gold, fontFamily: font }}>{fm ? fm(c[name]) : `${fmt(c[name])}${unit}`}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={c[name]} onChange={e => { setC({ ...c, [name]: Number(e.target.value) }); setShowResult(false); }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.gray, marginTop: 4 }}>
        <span>{fm ? fm(min) : `${fmt(min)}${unit}`}</span><span>{fm ? fm(max) : `${fmt(max)}${unit}`}</span>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px 80px" }}>
      <div className="fu" style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: font, fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 700 }}><span style={{ color: T.gold }}>Enterprise</span> Kalkulator</h2>
        <p style={{ color: T.grayLight, marginTop: 8 }}>Passen Sie die Parameter an Ihre Flotte an.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 24 }}>
        <div className="fu1" style={{ background: T.navyLight, borderRadius: 20, padding: 28, border: `1px solid ${T.navyMid}` }}>
          <h3 style={{ fontFamily: font, fontSize: 18, marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}><Icon name="ship" size={20} /> Ihre Flotte</h3>
          <Sl label="Anzahl Schiffe" name="ships" min={1} max={50} />
          <Sl label="Passagiere pro Schiff" name="paxPerShip" min={500} max={8000} step={100} />
          <Sl label="Ausflugstage pro Jahr" name="excursionDays" min={50} max={350} />
          <Sl label="Ausflüge pro Tag" name="excursionsPerDay" min={1} max={5} />
        </div>
        <div className="fu2" style={{ background: T.navyLight, borderRadius: 20, padding: 28, border: `1px solid ${T.navyMid}` }}>
          <h3 style={{ fontFamily: font, fontSize: 18, marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}><Icon name="globe" size={20} /> Ausflug-Parameter</h3>
          <Sl label="Teilnahmequote" name="paxParticipation" min={20} max={90} unit="%" />
          <Sl label="Guide-Minuten/Ausflug" name="guideMinsPerExcursion" min={30} max={240} unit=" min" />
          <Sl label="Zielsprachen" name="languages" min={2} max={30} />
          <Sl label="Kosten/Guide/Tag (traditionell)" name="costPerGuideDay" min={100} max={800} format={v => fmtEur(v)} />
          <div style={{ marginTop: 8 }}>
            <span style={{ fontSize: 13, color: T.grayLight, fontWeight: 500, marginBottom: 8, display: "block" }}>Sprachqualität</span>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ id: "wavenet", l: "WaveNet", s: "Gut" }, { id: "neural2", l: "Neural2", s: "Sehr gut" }, { id: "chirp3", l: "Chirp 3 HD", s: "Premium" }].map(q => (
                <button key={q.id} onClick={() => { setC({ ...c, ttsQuality: q.id }); setShowResult(false); }} style={{
                  flex: 1, padding: "10px 8px", borderRadius: 10, cursor: "pointer", textAlign: "center",
                  background: c.ttsQuality === q.id ? `${T.gold}15` : T.navyMid,
                  border: c.ttsQuality === q.id ? `1px solid ${T.gold}50` : `1px solid transparent`,
                  color: c.ttsQuality === q.id ? T.gold : T.grayLight,
                }}><div style={{ fontSize: 13, fontWeight: 600 }}>{q.l}</div><div style={{ fontSize: 10, marginTop: 2 }}>{q.s}</div></button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <button onClick={doCalc} style={{ background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`, color: T.navy, border: "none", padding: "16px 48px", borderRadius: 12, fontSize: 18, fontWeight: 700, cursor: "pointer", boxShadow: `0 8px 32px ${T.gold}30`, display: "inline-flex", alignItems: "center", gap: 10 }}>
          <Icon name="chart" size={22} color={T.navy} /> Ersparnis berechnen
        </button>
      </div>

      {showResult && (
        <div ref={ref} className="fu" style={{ marginTop: 40 }}>
          <div className="gg" style={{ background: `linear-gradient(135deg, ${T.gold}12, ${T.gold}04)`, border: `1px solid ${T.gold}30`, borderRadius: 24, padding: "40px 32px", textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 14, color: T.gold, textTransform: "uppercase", letterSpacing: 2, fontWeight: 600, marginBottom: 8 }}>Ihre jährliche Ersparnis</div>
            <div style={{ fontFamily: font, fontSize: "clamp(40px, 6vw, 72px)", fontWeight: 800, color: T.gold, lineHeight: 1 }}>{fmtEur(savings)}</div>
            <div style={{ fontSize: 18, color: T.green, fontWeight: 600, marginTop: 8 }}>{fmtPct(savPct)} weniger als traditionelle Guide-Kosten</div>
            <div style={{ fontSize: 14, color: T.grayLight, marginTop: 4 }}>Lizenzpaket: {tier} | {c.ships} Schiffe | {c.languages} Sprachen</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
            {[
              { l: "Traditionelle Kosten", v: fmtEur(totalTrad), s: `${fmt(totalExcursions)} Ausflüge × ${c.languages} Guides`, cl: T.red },
              { l: "GuideTranslator Kosten", v: fmtEur(totalFT), s: `Lizenz ${fmtEur(annualLic)} + API ${fmtEur(totalApi)}`, cl: T.seaLight },
              { l: "Kosten/Passagier", v: `${(costPP * 100).toFixed(2)}¢`, s: "pro Ausflug komplett", cl: T.gold },
            ].map((d, i) => (
              <div key={i} style={{ background: T.navyLight, borderRadius: 16, padding: 24, border: `1px solid ${T.navyMid}`, textAlign: "center" }}>
                <div style={{ fontSize: 12, color: T.grayLight, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{d.l}</div>
                <div style={{ fontFamily: font, fontSize: 28, fontWeight: 700, color: d.cl }}>{d.v}</div>
                <div style={{ fontSize: 11, color: T.gray, marginTop: 6 }}>{d.s}</div>
              </div>
            ))}
          </div>

          <div style={{ background: `${T.green}08`, borderRadius: 16, padding: 24, border: `1px solid ${T.green}20`, marginBottom: 24 }}>
            <h3 style={{ fontFamily: font, fontSize: 18, marginBottom: 8, color: T.green }}>Zusätzliches Umsatzpotenzial</h3>
            <p style={{ fontSize: 14, color: T.grayLight, lineHeight: 1.7 }}>
              +15-25% mehr Ausflugsbuchungen durch Wegfall der Sprachbarriere = <strong style={{ color: T.green }}>{fmtEur(totalExcursions * paxPerExcursion * 100 * 0.20)} Zusatzumsatz/Jahr</strong>
            </p>
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={doSave} disabled={saved} style={{
              background: saved ? T.green : T.navyMid, color: saved ? T.whiteTrue : T.gold,
              border: saved ? "none" : `1px solid ${T.gold}40`, padding: "14px 28px", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: saved ? "default" : "pointer",
              display: "flex", alignItems: "center", gap: 8,
            }}><Icon name={saved ? "check" : "save"} size={18} color={saved ? T.whiteTrue : T.gold} />{saved ? "Gespeichert!" : "Kalkulation speichern"}</button>
            <button onClick={() => setPage("contact")} style={{
              background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`, color: T.navy, border: "none", padding: "14px 28px", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8,
            }}><Icon name="mail" size={18} color={T.navy} /> Angebot anfordern</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SAVED CALCS
// ═══════════════════════════════════════════════════════════════
function Saved({ calcs, onDelete, setPage, lead }) {
  if (!calcs.length) return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
      <Icon name="save" size={48} color={T.gray} />
      <h2 style={{ fontFamily: font, fontSize: 24, marginTop: 16, color: T.grayLight }}>Keine gespeicherten Kalkulationen</h2>
      <button onClick={() => setPage("calculator")} style={{ background: T.navyMid, color: T.gold, border: `1px solid ${T.gold}40`, padding: "12px 24px", borderRadius: 10, fontSize: 14, cursor: "pointer", marginTop: 24 }}>Zum Kalkulator</button>
    </div>
  );

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 80px" }}>
      <h2 style={{ fontFamily: font, fontSize: "clamp(24px, 3vw, 32px)", marginBottom: 32 }}>Gespeicherte <span style={{ color: T.gold }}>Kalkulationen</span></h2>
      {calcs.map(calc => (
        <div key={calc.id} className="hl" style={{ background: T.navyLight, borderRadius: 16, padding: 24, border: `1px solid ${T.navyMid}`, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: font, fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{calc.name}</div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13 }}>
              <span style={{ color: T.grayLight }}><strong style={{ color: T.gold }}>{fmtEur(calc.savings)}</strong> Ersparnis</span>
              <span style={{ color: T.grayLight }}><strong style={{ color: T.green }}>{fmtPct(calc.savingsPct)}</strong></span>
              <span style={{ color: T.gray }}>{new Date(calc.date).toLocaleDateString("de-DE")}</span>
            </div>
          </div>
          <button onClick={() => onDelete(calc.id)} style={{ background: `${T.red}15`, border: `1px solid ${T.red}30`, color: T.red, padding: "8px 14px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>Löschen</button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
        <button onClick={() => setPage("calculator")} style={{ background: T.navyMid, color: T.gold, border: `1px solid ${T.gold}40`, padding: "12px 24px", borderRadius: 10, fontSize: 14, cursor: "pointer" }}>Neue Kalkulation</button>
        <button onClick={() => setPage("contact")} style={{ background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`, color: T.navy, border: "none", padding: "12px 24px", borderRadius: 10, fontSize: 14, cursor: "pointer", fontWeight: 700 }}>Angebot anfordern</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CONTACT
// ═══════════════════════════════════════════════════════════════
function Contact({ lead, calcs, setPage, onSubmit }) {
  const [msg, setMsg] = useState("");
  const [interest, setInterest] = useState("");
  const [timeline, setTimeline] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const best = calcs.length ? calcs.reduce((a, b) => (b.savings || 0) > (a.savings || 0) ? b : a, calcs[0]) : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit({ interest, timeline, message: msg });
    setDone(true);
    setSubmitting(false);
  };

  if (done) return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
      <div className="fu" style={{ width: 80, height: 80, borderRadius: "50%", margin: "0 auto 24px", background: `${T.green}15`, border: `2px solid ${T.green}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name="check" size={40} color={T.green} />
      </div>
      <h2 className="fu1" style={{ fontFamily: font, fontSize: 32, fontWeight: 700, marginBottom: 12 }}>Anfrage erhalten!</h2>
      <p className="fu2" style={{ color: T.grayLight, fontSize: 16, lineHeight: 1.7, marginBottom: 32 }}>
        Vielen Dank, <strong style={{ color: T.whiteTrue }}>{lead?.name}</strong>. Unser Enterprise-Team meldet sich innerhalb von 24 Stunden mit einem individuellen Angebot für <strong style={{ color: T.gold }}>{lead?.company}</strong>.
      </p>
      {best && (
        <div className="fu3 gg" style={{ background: `${T.gold}08`, border: `1px solid ${T.gold}25`, borderRadius: 16, padding: 24, marginBottom: 32 }}>
          <div style={{ fontSize: 13, color: T.gold, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Ihre Top-Kalkulation</div>
          <div style={{ fontFamily: font, fontSize: 36, fontWeight: 700, color: T.gold }}>{fmtEur(best.savings)} Ersparnis/Jahr</div>
        </div>
      )}
      <p style={{ fontSize: 14, color: T.gray }}>Ihr Ansprechpartner: <strong style={{ color: T.whiteTrue }}>Ulrich — GuideTranslator Enterprise</strong><br />enterprise@guidetranslator.com</p>
      <button onClick={() => setPage("calculator")} style={{ background: T.navyMid, color: T.gold, border: `1px solid ${T.gold}40`, padding: "12px 24px", borderRadius: 10, fontSize: 14, cursor: "pointer", marginTop: 32 }}>Weitere Kalkulationen</button>
    </div>
  );

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "40px 24px 80px" }}>
      <h2 className="fu" style={{ fontFamily: font, fontSize: "clamp(24px, 3vw, 36px)", marginBottom: 32 }}>Angebot <span style={{ color: T.gold }}>anfordern</span></h2>

      <div className="fu1" style={{ background: T.navyLight, borderRadius: 16, padding: 20, border: `1px solid ${T.navyMid}`, marginBottom: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 14 }}>
        <div><span style={{ color: T.grayLight }}>Name:</span> <strong>{lead?.name}</strong></div>
        <div><span style={{ color: T.grayLight }}>Unternehmen:</span> <strong style={{ color: T.gold }}>{lead?.company}</strong></div>
        <div><span style={{ color: T.grayLight }}>E-Mail:</span> {lead?.email}</div>
        <div><span style={{ color: T.grayLight }}>Position:</span> {lead?.role || "—"}</div>
      </div>

      {best && (
        <div className="fu2 gg" style={{ background: `${T.gold}08`, border: `1px solid ${T.gold}25`, borderRadius: 16, padding: 20, marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div><div style={{ fontSize: 12, color: T.gold, textTransform: "uppercase", letterSpacing: 1 }}>Beste Kalkulation</div><div style={{ fontFamily: font, fontSize: 28, fontWeight: 700, color: T.gold, marginTop: 4 }}>{fmtEur(best.savings)} Ersparnis</div></div>
          <div style={{ textAlign: "right", fontSize: 13, color: T.grayLight }}>{best.tierName}<br />{best.inputs?.ships} Schiffe · {best.inputs?.languages} Sprachen</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="fu3" style={{ background: T.navyLight, borderRadius: 20, padding: 28, border: `1px solid ${T.navyMid}`, display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={{ fontSize: 13, color: T.grayLight, fontWeight: 500, marginBottom: 8, display: "block" }}>Interesse an</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["Pilot (1 Schiff)", "Fleet-Lizenz", "Armada-Lizenz", "Custom Enterprise", "Nur Demo"].map(o => (
              <button key={o} type="button" onClick={() => setInterest(o)} style={{ padding: "8px 16px", borderRadius: 10, cursor: "pointer", background: interest === o ? `${T.gold}15` : T.navyMid, border: interest === o ? `1px solid ${T.gold}50` : `1px solid transparent`, color: interest === o ? T.gold : T.grayLight, fontSize: 13 }}>{o}</button>
            ))}
          </div>
        </div>
        <div>
          <label style={{ fontSize: 13, color: T.grayLight, fontWeight: 500, marginBottom: 8, display: "block" }}>Zeitrahmen</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["Sofort / ASAP", "Q2 2026", "Q3 2026", "2027", "Nur informativ"].map(o => (
              <button key={o} type="button" onClick={() => setTimeline(o)} style={{ padding: "8px 16px", borderRadius: 10, cursor: "pointer", background: timeline === o ? `${T.gold}15` : T.navyMid, border: timeline === o ? `1px solid ${T.gold}50` : `1px solid transparent`, color: timeline === o ? T.gold : T.grayLight, fontSize: 13 }}>{o}</button>
            ))}
          </div>
        </div>
        <div>
          <label style={{ fontSize: 13, color: T.grayLight, fontWeight: 500, marginBottom: 6, display: "block" }}>Nachricht</label>
          <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={4} placeholder="z.B. Wir suchen eine Lösung für unsere Mittelmeer-Routen..." style={{ width: "100%", background: T.navyMid, border: `1px solid ${T.navyMid}`, borderRadius: 12, padding: "12px 16px", color: T.whiteTrue, fontSize: 14, resize: "vertical", lineHeight: 1.6 }} />
        </div>
        <button type="submit" disabled={submitting} style={{ background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`, color: T.navy, border: "none", padding: "16px 32px", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, opacity: submitting ? 0.6 : 1 }}>
          <Icon name="mail" size={20} color={T.navy} /> {submitting ? "Wird gesendet..." : "Angebot anfordern"}
        </button>
      </form>
    </div>
  );
}
