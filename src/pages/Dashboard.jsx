import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../supabaseClient";
import { T, font, fontSans } from "../lib/tokens";
import { getTier, formatPrice } from "../config/pricing";

export default function Dashboard() {
  const { user, role, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const [profile, setProfile] = useState(null);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const checkoutSuccess = searchParams.get("checkout") === "success";

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load lead/customer data by auth user email
      const { data: lead } = await supabase
        .from("gt_leads")
        .select("*")
        .eq("email", user.email)
        .single();

      if (lead) {
        setProfile(lead);

        // Load usage data (if gt_usage table exists)
        try {
          const { data: usageData } = await supabase
            .from("gt_usage")
            .select("*")
            .eq("lead_id", lead.id)
            .order("created_at", { ascending: false })
            .limit(30);
          setUsage(usageData || []);
        } catch {
          // gt_usage table might not exist yet
          setUsage([]);
        }
      }
    } catch (e) {
      console.log("Dashboard load error:", e);
    }
    setLoading(false);
  };

  const handleOpenPortal = async () => {
    if (!profile?.stripe_customer_id) return;
    try {
      const res = await fetch("/api/customer-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: profile.stripe_customer_id }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error("Portal error:", err);
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{
        minHeight: "100vh", background: T.navy,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: fontSans,
      }}>
        <div style={{ color: T.gold, fontFamily: font, fontSize: 20, animation: "pulse 1.5s infinite" }}>
          Dashboard wird geladen...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{
        minHeight: "100vh", background: T.navy,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: fontSans, color: T.whiteTrue,
      }}>
        <div style={{ textAlign: "center", maxWidth: 400, padding: 24 }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%", margin: "0 auto 16px",
            background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: font, fontWeight: 700, fontSize: 22, color: T.navy,
          }}>GT</div>
          <h2 style={{ fontFamily: font, fontSize: 24, marginBottom: 12 }}>Kunden-Dashboard</h2>
          <p style={{ color: T.grayLight, fontSize: 14, marginBottom: 24 }}>
            Bitte melden Sie sich an, um Ihr Dashboard zu sehen.
          </p>
          <Link to="/login" style={{
            display: "inline-block", textDecoration: "none",
            background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`,
            color: T.navy, padding: "14px 32px", borderRadius: 12,
            fontSize: 16, fontWeight: 700,
          }}>Anmelden</Link>
        </div>
      </div>
    );
  }

  // Calculate usage stats
  const totalMinutesUsed = usage?.reduce((sum, u) => sum + (u.minutes || 0), 0) || 0;
  const totalSessions = usage?.length || 0;
  const tier = profile?.subscription_tier ? getTier(profile.subscription_tier) : null;
  const minutesLimit = tier?.limits?.minutes || 0;
  const usagePct = minutesLimit > 0 ? Math.min((totalMinutesUsed / minutesLimit) * 100, 100) : 0;

  return (
    <div style={{ minHeight: "100vh", background: T.navy, fontFamily: fontSans, color: T.whiteTrue }}>
      {/* Nav */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: `${T.navy}ee`, backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${T.navyMid}`,
        padding: "0 24px", height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: font, fontWeight: 700, fontSize: 14, color: T.navy,
          }}>GT</div>
          <span style={{ fontFamily: font, fontSize: 18, color: T.whiteTrue, fontWeight: 600 }}>Dashboard</span>
        </Link>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: T.grayLight }}>{user.email}</span>
          <Link to="/" style={{
            padding: "6px 14px", borderRadius: 8, fontSize: 13,
            color: T.grayLight, textDecoration: "none", border: `1px solid ${T.navyMid}`,
          }}>← Startseite</Link>
        </div>
      </nav>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 24px 80px" }}>
        {/* Checkout Success Banner */}
        {checkoutSuccess && (
          <div style={{
            background: `${T.green}10`, border: `1px solid ${T.green}30`,
            borderRadius: 16, padding: "20px 24px", marginBottom: 24,
            display: "flex", alignItems: "center", gap: 16,
          }}>
            <span style={{ fontSize: 32 }}>✓</span>
            <div>
              <h3 style={{ fontFamily: font, fontSize: 18, color: T.green, marginBottom: 4 }}>
                Abonnement aktiviert!
              </h3>
              <p style={{ fontSize: 14, color: T.grayLight }}>
                Vielen Dank! Ihr Plan ist jetzt aktiv. Sie können sofort loslegen.
              </p>
            </div>
          </div>
        )}

        {/* Profile + Plan */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24,
        }}>
          {/* Profile Card */}
          <div style={{
            background: T.navyLight, borderRadius: 16, padding: 24,
            border: `1px solid ${T.navyMid}`,
          }}>
            <h3 style={{ fontFamily: font, fontSize: 18, marginBottom: 16 }}>Profil</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                ["Name", profile?.name || user.user_metadata?.name || "—"],
                ["E-Mail", user.email],
                ["Unternehmen", profile?.company || "—"],
                ["Segment", profile?.segment || "—"],
                ["Rolle", role || "—"],
              ].map(([label, value]) => (
                <div key={label}>
                  <span style={{ fontSize: 11, color: T.gray, textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
                  <div style={{ fontSize: 14, marginTop: 2 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Plan Card */}
          <div style={{
            background: T.navyLight, borderRadius: 16, padding: 24,
            border: `1px solid ${T.navyMid}`,
          }}>
            <h3 style={{ fontFamily: font, fontSize: 18, marginBottom: 16 }}>Ihr Plan</h3>
            {tier ? (
              <div>
                <div style={{
                  display: "inline-block", fontSize: 11, padding: "4px 12px",
                  borderRadius: 20, background: `${T.gold}15`, color: T.gold,
                  border: `1px solid ${T.gold}30`, marginBottom: 12,
                }}>{tier.name}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 16 }}>
                  <span style={{ fontFamily: font, fontSize: 32, fontWeight: 700, color: T.gold }}>
                    {formatPrice(tier.price)}
                  </span>
                  <span style={{ fontSize: 13, color: T.grayLight }}>/ Monat</span>
                </div>
                <div style={{ fontSize: 13, color: T.grayLight, marginBottom: 4 }}>
                  Status: <span style={{
                    color: profile?.subscription_status === "active" ? T.green : T.gold,
                    fontWeight: 600,
                  }}>{profile?.subscription_status || "aktiv"}</span>
                </div>
                {profile?.stripe_customer_id && (
                  <button onClick={handleOpenPortal} style={{
                    marginTop: 12, background: T.navyMid,
                    border: `1px solid ${T.gold}30`, color: T.gold,
                    padding: "8px 16px", borderRadius: 8,
                    fontSize: 13, cursor: "pointer",
                  }}>Abo verwalten</button>
                )}
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 14, color: T.grayLight, marginBottom: 16 }}>
                  Sie haben noch kein aktives Abonnement.
                </p>
                <Link to={`/${profile?.segment || "kreuzfahrt"}/pricing`} style={{
                  display: "inline-block", textDecoration: "none",
                  background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`,
                  color: T.navy, padding: "10px 20px", borderRadius: 10,
                  fontSize: 14, fontWeight: 700,
                }}>Pläne ansehen</Link>
              </div>
            )}
          </div>
        </div>

        {/* Usage Overview */}
        <div style={{
          background: T.navyLight, borderRadius: 16, padding: 24,
          border: `1px solid ${T.navyMid}`, marginBottom: 24,
        }}>
          <h3 style={{ fontFamily: font, fontSize: 18, marginBottom: 20 }}>Nutzung</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 20 }}>
            {[
              { label: "Minuten genutzt", value: `${totalMinutesUsed}`, sub: minutesLimit ? `von ${minutesLimit}` : "—", color: T.gold },
              { label: "Sitzungen", value: `${totalSessions}`, sub: "diesen Monat", color: T.seaLight },
              { label: "Kontingent", value: minutesLimit ? `${usagePct.toFixed(0)}%` : "—", sub: minutesLimit ? "verbraucht" : "Kein Limit", color: usagePct > 80 ? T.red : T.green },
            ].map((s, i) => (
              <div key={i} style={{ background: T.navyMid, borderRadius: 12, padding: "16px 20px" }}>
                <div style={{ fontSize: 11, color: T.grayLight, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontFamily: font, fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: T.gray, marginTop: 2 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Usage Bar */}
          {minutesLimit > 0 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.grayLight, marginBottom: 6 }}>
                <span>{totalMinutesUsed} Min</span>
                <span>{minutesLimit} Min</span>
              </div>
              <div style={{ background: T.navyMid, borderRadius: 6, height: 10, overflow: "hidden" }}>
                <div style={{
                  width: `${usagePct}%`, height: "100%",
                  background: usagePct > 80
                    ? `linear-gradient(90deg, ${T.gold}, ${T.red})`
                    : `linear-gradient(90deg, ${T.gold}, ${T.green})`,
                  borderRadius: 6, transition: "width 0.5s",
                }} />
              </div>
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16,
        }}>
          {[
            { label: "App öffnen", desc: "GuideTranslator starten", href: "https://app.guidetranslator.com", external: true, color: T.gold },
            { label: "Anleitung", desc: "So funktioniert die App", to: "/howto", color: T.seaLight },
            { label: "Support", desc: "Fragen? Wir helfen.", href: "mailto:enterprise@guidetranslator.com", external: true, color: T.green },
          ].map((link, i) => (
            link.external ? (
              <a key={i} href={link.href} target="_blank" rel="noopener noreferrer" style={{
                background: T.navyLight, borderRadius: 12, padding: "20px 24px",
                border: `1px solid ${T.navyMid}`, textDecoration: "none",
                display: "block",
              }}>
                <h4 style={{ fontSize: 16, fontWeight: 600, color: link.color, marginBottom: 4 }}>{link.label}</h4>
                <p style={{ fontSize: 13, color: T.grayLight }}>{link.desc}</p>
              </a>
            ) : (
              <Link key={i} to={link.to} style={{
                background: T.navyLight, borderRadius: 12, padding: "20px 24px",
                border: `1px solid ${T.navyMid}`, textDecoration: "none",
                display: "block",
              }}>
                <h4 style={{ fontSize: 16, fontWeight: 600, color: link.color, marginBottom: 4 }}>{link.label}</h4>
                <p style={{ fontSize: 13, color: T.grayLight }}>{link.desc}</p>
              </Link>
            )
          ))}
        </div>
      </div>
    </div>
  );
}
