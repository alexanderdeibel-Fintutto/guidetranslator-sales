import { useState, useEffect, lazy, Suspense } from "react";
import { Routes, Route, useParams, Link, Navigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { T, font, fontSans, globalCSS } from "./lib/tokens";
import { Icon } from "./components/Icon";
import { useAuth } from "./lib/AuthContext";
import { upsertLead, loadLeadByEmail, saveCalculation, loadCalculations, deleteCalculation, submitContactRequest, lsLoad, lsSave, lsClear } from "./lib/supabaseHelpers";
import { getSegment } from "./config/segments";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Pages — lazy-loaded for code-splitting
const Admin = lazy(() => import("./Admin"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Pricing = lazy(() => import("./pages/Pricing"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const SegmentHub = lazy(() => import("./pages/SegmentHub"));
const SegmentLanding = lazy(() => import("./pages/SegmentLanding"));
const Register = lazy(() => import("./pages/Register"));
const Calculator = lazy(() => import("./pages/Calculator"));
const Saved = lazy(() => import("./pages/Saved"));
const Contact = lazy(() => import("./pages/Contact"));
const PostOffer = lazy(() => import("./pages/PostOffer"));
const HowTo = lazy(() => import("./pages/HowTo"));
const Setup = lazy(() => import("./pages/Setup"));

function PageLoader() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 80 }}>
      <div style={{ color: T.gold, fontFamily: font, fontSize: 18, animation: "pulse 1.5s infinite" }}>Laden...</div>
    </div>
  );
}

// ─── NAV ─────────────────────────────────────────────────────
function Nav({ lead, savedCalcs, onLogout }) {
  const { segment } = useParams();
  const auth = useAuth();
  const seg = segment ? getSegment(segment) : null;
  const accentColor = seg?.color || T.gold;
  const navLink = { padding: "6px 14px", borderRadius: 8, fontSize: 13, color: T.grayLight, textDecoration: "none", fontFamily: fontSans };

  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 100,
      background: `${T.navy}ee`, backdropFilter: "blur(20px)",
      borderBottom: `1px solid ${T.navyMid}`,
      padding: "0 24px", height: 64,
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <Link to={lead && segment ? `/${segment}/calculator` : "/"} style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: font, fontWeight: 700, fontSize: 14, color: T.navy,
        }}>GT</div>
        <span style={{ fontFamily: font, fontSize: 18, color: T.whiteTrue, fontWeight: 600 }}>GuideTranslator</span>
        {seg && (
          <span style={{
            fontSize: 10, color: accentColor, background: `${accentColor}15`,
            padding: "2px 8px", borderRadius: 20, fontFamily: fontSans,
            border: `1px solid ${accentColor}30`, letterSpacing: 1, textTransform: "uppercase",
          }}>{seg.label}</span>
        )}
      </Link>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {segment && lead && (
          <>
            <Link to={`/${segment}/calculator`} style={navLink}>Kalkulator</Link>
            {savedCalcs.length > 0 && (
              <Link to={`/${segment}/saved`} style={navLink}>Kalkulationen ({savedCalcs.length})</Link>
            )}
            <Link to={`/${segment}/contact`} style={navLink}>Angebot</Link>
          </>
        )}
        {segment && <Link to={`/${segment}/pricing`} style={navLink}>Preise</Link>}
        <Link to="/howto" style={navLink}>Anleitung</Link>
        {auth?.user && (
          <Link to="/dashboard" style={{ ...navLink, color: T.gold, border: `1px solid ${T.gold}30`, background: `${T.gold}08` }}>Dashboard</Link>
        )}
        {auth?.isAdmin?.() && (
          <Link to="/admin" style={{ ...navLink, color: T.red, fontSize: 11 }}>Admin</Link>
        )}
        {lead && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 8, paddingLeft: 8, borderLeft: `1px solid ${T.navyMid}` }}>
            <span style={{ fontSize: 12, color: T.grayLight, fontFamily: fontSans }}>{lead.company}</span>
            <button onClick={onLogout} style={{ background: "transparent", border: "none", color: T.gray, fontSize: 11, cursor: "pointer" }}>×</button>
          </div>
        )}
      </div>
    </nav>
  );
}

// ─── LAYOUT WRAPPER ──────────────────────────────────────────
function Layout({ lead, savedCalcs, onLogout, children }) {
  return (
    <>
      <Nav lead={lead} savedCalcs={savedCalcs} onLogout={onLogout} />
      {children}
    </>
  );
}

// ─── REQUIRE AUTH WRAPPER ────────────────────────────────────
function RequireAuth({ lead, children }) {
  const { segment } = useParams();
  if (!lead) return <Navigate to={`/${segment || "kreuzfahrt"}/register`} replace />;
  return children;
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [lead, setLead] = useState(null);
  const [leadId, setLeadId] = useState(null);
  const [savedCalcs, setSavedCalcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [useSupabase, setUseSupabase] = useState(false);

  useEffect(() => {
    (async () => {
      const hasKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      setUseSupabase(!!hasKey);

      // Handle invite tokens
      const params = new URLSearchParams(window.location.search);
      const inviteToken = params.get("invite");
      if (inviteToken && hasKey) {
        try {
          const { data } = await supabase.from('gt_leads').select('*').eq('invite_token', inviteToken).single();
          if (data) {
            sessionStorage.setItem("gt-invite", JSON.stringify({
              name: data.name || "", email: data.email || "", company: data.company || "",
              role: data.role || "", size: data.fleet_size || "", phone: data.phone || "",
              _inviteToken: inviteToken, _leadId: data.id, _segment: data.segment || "kreuzfahrt",
            }));
          }
        } catch (e) { console.log("Invite lookup failed:", e); }
      }

      // Try localStorage
      const local = lsLoad();
      if (local?.lead) {
        setLead(local.lead);
        setLeadId(local.leadId);
        setSavedCalcs(local.calcs || []);
        if (hasKey && local.lead.email) {
          try {
            const dbLead = await loadLeadByEmail(local.lead.email);
            if (dbLead) {
              setLeadId(dbLead.id);
              const calcs = await loadCalculations(dbLead.id);
              if (calcs.length) setSavedCalcs(calcs.map(c => ({ id: c.id, name: c.name, date: c.created_at, inputs: c.inputs, ...c.results })));
            }
          } catch (e) { console.log("Supabase sync skipped:", e); }
        }
      }
      setLoading(false);
    })();
  }, []);

  const handleRegister = async (info) => {
    const { password, _inviteToken, _leadId, segment: seg, ...leadInfo } = info;
    setLead(leadInfo);
    let dbId = _leadId || null;

    if (useSupabase) {
      try {
        if (_inviteToken && _leadId) {
          await supabase.from('gt_leads').update({
            name: leadInfo.name, company: leadInfo.company,
            role: leadInfo.role || null, fleet_size: leadInfo.ships || null,
            phone: leadInfo.phone || null, password: password || null,
            segment: seg || 'kreuzfahrt',
            status: 'registered', pipeline_stage: 'registriert',
            last_login: new Date().toISOString(), last_activity: new Date().toISOString(),
          }).eq('id', _leadId);
          dbId = _leadId;
        } else {
          const { data } = await upsertLead({ ...leadInfo, segment: seg });
          if (data) dbId = data.id;
        }
      } catch (e) { console.log("Supabase lead save failed:", e); }
    }

    setLeadId(dbId);
    setSavedCalcs([]);
    sessionStorage.removeItem("gt-invite");
    window.history.replaceState({}, '', window.location.pathname);
    lsSave({ lead: leadInfo, leadId: dbId, calcs: [], segment: seg });
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
    if (useSupabase) { try { await deleteCalculation(id); } catch {} }
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

  const handleTrackTest = async (type) => {
    if (!useSupabase || !leadId) return;
    try {
      if (type === "tested") {
        await supabase.from('gt_leads').update({ tested_at: new Date().toISOString(), pipeline_stage: 'getestet', last_activity: new Date().toISOString() }).eq('id', leadId);
      } else {
        await supabase.from('gt_leads').update({ pipeline_stage: 'testet_spaeter', last_activity: new Date().toISOString() }).eq('id', leadId);
      }
    } catch {}
  };

  const handleLogout = () => {
    setLead(null); setLeadId(null); setSavedCalcs([]);
    lsClear();
  };

  // Invite prefill
  let invitePrefill = null;
  try { invitePrefill = JSON.parse(sessionStorage.getItem("gt-invite")); } catch {}

  if (loading) return (
    <div style={{ background: T.navy, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: T.gold, fontFamily: font, fontSize: 24, animation: "pulse 1.5s infinite" }}>GuideTranslator</div>
    </div>
  );

  return (
    <div style={{ background: T.navy, minHeight: "100vh", color: T.whiteTrue, fontFamily: fontSans }}>
      <style>{globalCSS}</style>
      <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Admin */}
        <Route path="/admin/*" element={<Admin onBack={() => window.location.href = "/"} />} />

        {/* Dashboard */}
        <Route path="/dashboard" element={<ErrorBoundary label="Dashboard"><Dashboard /></ErrorBoundary>} />

        {/* HowTo */}
        <Route path="/howto" element={<Layout lead={lead} savedCalcs={savedCalcs} onLogout={handleLogout}><HowTo /></Layout>} />

        {/* Setup (one-time Stripe + Admin setup) */}
        <Route path="/setup" element={<Setup />} />

        {/* Segment Routes */}
        <Route path="/:segment/pricing" element={<Layout lead={lead} savedCalcs={savedCalcs} onLogout={handleLogout}><ErrorBoundary label="Preise"><Pricing /></ErrorBoundary></Layout>} />
        <Route path="/:segment/register" element={<Layout lead={lead} savedCalcs={savedCalcs} onLogout={handleLogout}><Register onRegister={handleRegister} prefill={invitePrefill} /></Layout>} />
        <Route path="/:segment/calculator" element={<Layout lead={lead} savedCalcs={savedCalcs} onLogout={handleLogout}><RequireAuth lead={lead}><ErrorBoundary label="Kalkulator"><Calculator onSave={handleSaveCalc} lead={lead} /></ErrorBoundary></RequireAuth></Layout>} />
        <Route path="/:segment/saved" element={<Layout lead={lead} savedCalcs={savedCalcs} onLogout={handleLogout}><RequireAuth lead={lead}><Saved calcs={savedCalcs} onDelete={handleDeleteCalc} /></RequireAuth></Layout>} />
        <Route path="/:segment/contact" element={<Layout lead={lead} savedCalcs={savedCalcs} onLogout={handleLogout}><RequireAuth lead={lead}><Contact lead={lead} calcs={savedCalcs} onSubmit={handleContact} /></RequireAuth></Layout>} />
        <Route path="/:segment/offer" element={<Layout lead={lead} savedCalcs={savedCalcs} onLogout={handleLogout}><RequireAuth lead={lead}><PostOffer lead={lead} calcs={savedCalcs} onTrackTest={handleTrackTest} /></RequireAuth></Layout>} />

        {/* Segment Landing */}
        <Route path="/:segment" element={<Layout lead={lead} savedCalcs={savedCalcs} onLogout={handleLogout}><SegmentLanding /></Layout>} />

        {/* Hub */}
        <Route path="/" element={<Layout lead={lead} savedCalcs={savedCalcs} onLogout={handleLogout}><SegmentHub /></Layout>} />
      </Routes>
      </Suspense>
    </div>
  );
}
