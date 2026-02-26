import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../supabaseClient";
import { T, font, fontSans } from "../lib/tokens";
import { getTier, formatPrice } from "../config/pricing";

export default function Dashboard() {
  const { user, role, loading: authLoading, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [profile, setProfile] = useState(null);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subAccounts, setSubAccounts] = useState([]);
  const [subLoading, setSubLoading] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");
  const [inviteErr, setInviteErr] = useState("");
  const checkoutSuccess = searchParams.get("checkout") === "success";

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadDashboardData();
  }, [user]);

  const getAuthToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token;
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const { data: lead } = await supabase
        .from("gt_leads")
        .select("*")
        .eq("email", user.email)
        .single();

      if (lead) {
        setProfile(lead);
        try {
          const { data: usageData } = await supabase
            .from("gt_usage")
            .select("*")
            .eq("lead_id", lead.id)
            .order("created_at", { ascending: false })
            .limit(30);
          setUsage(usageData || []);
        } catch {
          setUsage([]);
        }
      }
    } catch (e) {
      console.log("Dashboard load error:", e);
    }
    setLoading(false);
    loadSubAccounts();
  };

  const loadSubAccounts = async () => {
    setSubLoading(true);
    try {
      const token = await getAuthToken();
      const res = await fetch("/api/sub-accounts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSubAccounts(data.subAccounts || []);
      }
    } catch {}
    setSubLoading(false);
  };

  const handleInviteSubAccount = async () => {
    if (!inviteName || !inviteEmail) { setInviteErr("Name und E-Mail erforderlich."); return; }
    setInviteErr("");
    setInviteMsg("");
    try {
      const token = await getAuthToken();
      const res = await fetch("/api/sub-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: inviteEmail, name: inviteName }),
      });
      const data = await res.json();
      if (!res.ok) { setInviteErr(data.error || "Fehler beim Erstellen."); return; }
      setInviteMsg(`${inviteName} wurde eingeladen!`);
      setInviteName("");
      setInviteEmail("");
      setShowInvite(false);
      loadSubAccounts();
    } catch {
      setInviteErr("Netzwerkfehler.");
    }
  };

  const handleRemoveSubAccount = async (userId, email) => {
    if (!confirm(`Sub-Account ${email} wirklich entfernen?`)) return;
    try {
      const token = await getAuthToken();
      await fetch("/api/sub-accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId }),
      });
      loadSubAccounts();
    } catch {}
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

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
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

  const totalMinutesUsed = usage?.reduce((sum, u) => sum + (u.minutes || 0), 0) || 0;
  const totalSessions = usage?.length || 0;
  const tier = profile?.subscription_tier ? getTier(profile.subscription_tier) : null;
  const minutesLimit = tier?.limits?.minutes || 0;
  const usagePct = minutesLimit > 0 ? Math.min((totalMinutesUsed / minutesLimit) * 100, 100) : 0;
  const isCustomerOrAdmin = role === "customer" || role === "admin" || role === "super_admin";

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
          {isAdmin() && (
            <Link to="/admin" style={{
              padding: "6px 14px", borderRadius: 8, fontSize: 13,
              color: T.gold, textDecoration: "none", border: `1px solid ${T.gold}30`,
            }}>Admin</Link>
          )}
          <button onClick={handleLogout} style={{
            padding: "6px 14px", borderRadius: 8, fontSize: 13,
            color: T.grayLight, background: "transparent",
            border: `1px solid ${T.navyMid}`, cursor: "pointer",
          }}>Abmelden</button>
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
            <span style={{ fontSize: 32 }}>&#10003;</span>
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

        {/* Invite success msg */}
        {inviteMsg && (
          <div style={{
            background: `${T.green}10`, border: `1px solid ${T.green}30`,
            borderRadius: 12, padding: "12px 20px", marginBottom: 24,
            fontSize: 14, color: T.green,
          }}>{inviteMsg}</div>
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
                ["Name", profile?.name || user.user_metadata?.name || "\u2014"],
                ["E-Mail", user.email],
                ["Unternehmen", profile?.company || "\u2014"],
                ["Segment", profile?.segment || "\u2014"],
                ["Rolle", { customer: "Kunden-Admin", admin: "Admin", super_admin: "Super-Admin", sub_account: "Sub-Account", sales: "Sales" }[role] || role || "\u2014"],
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
              { label: "Minuten genutzt", value: `${totalMinutesUsed}`, sub: minutesLimit ? `von ${minutesLimit}` : "\u2014", color: T.gold },
              { label: "Sitzungen", value: `${totalSessions}`, sub: "diesen Monat", color: T.seaLight },
              { label: "Kontingent", value: minutesLimit ? `${usagePct.toFixed(0)}%` : "\u2014", sub: minutesLimit ? "verbraucht" : "Kein Limit", color: usagePct > 80 ? T.red : T.green },
            ].map((s, i) => (
              <div key={i} style={{ background: T.navyMid, borderRadius: 12, padding: "16px 20px" }}>
                <div style={{ fontSize: 11, color: T.grayLight, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontFamily: font, fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: T.gray, marginTop: 2 }}>{s.sub}</div>
              </div>
            ))}
          </div>

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

        {/* Sub-Account Management (for customers and admins) */}
        {isCustomerOrAdmin && (
          <div style={{
            background: T.navyLight, borderRadius: 16, padding: 24,
            border: `1px solid ${T.navyMid}`, marginBottom: 24,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontFamily: font, fontSize: 18 }}>
                Team / Sub-Accounts
                {subAccounts.length > 0 && (
                  <span style={{ fontSize: 13, color: T.grayLight, fontWeight: 400, marginLeft: 8 }}>
                    ({subAccounts.length})
                  </span>
                )}
              </h3>
              <button
                onClick={() => { setShowInvite(!showInvite); setInviteErr(""); }}
                style={{
                  background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`,
                  color: T.navy, border: "none", padding: "8px 16px", borderRadius: 8,
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}
              >
                {showInvite ? "Abbrechen" : "+ Einladen"}
              </button>
            </div>

            {/* Invite Form */}
            {showInvite && (
              <div style={{
                background: T.navyMid, borderRadius: 12, padding: 20, marginBottom: 20,
                display: "flex", flexDirection: "column", gap: 12,
              }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, color: T.grayLight, display: "block", marginBottom: 4 }}>Name</label>
                    <input
                      value={inviteName}
                      onChange={e => setInviteName(e.target.value)}
                      placeholder="Max Mustermann"
                      style={{
                        width: "100%", background: T.navy, border: `1px solid ${T.navyMid}`,
                        borderRadius: 8, padding: "10px 14px", color: T.whiteTrue, fontSize: 14,
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: T.grayLight, display: "block", marginBottom: 4 }}>E-Mail</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      placeholder="guide@firma.de"
                      style={{
                        width: "100%", background: T.navy, border: `1px solid ${T.navyMid}`,
                        borderRadius: 8, padding: "10px 14px", color: T.whiteTrue, fontSize: 14,
                      }}
                    />
                  </div>
                </div>
                {inviteErr && <p style={{ color: T.red, fontSize: 13 }}>{inviteErr}</p>}
                <button onClick={handleInviteSubAccount} style={{
                  background: T.gold, color: T.navy, border: "none",
                  padding: "10px 20px", borderRadius: 8, fontSize: 14,
                  fontWeight: 700, cursor: "pointer", alignSelf: "flex-start",
                }}>Sub-Account erstellen</button>
                <p style={{ fontSize: 12, color: T.gray }}>
                  Der Benutzer erhält eine E-Mail mit Zugangsdaten.
                </p>
              </div>
            )}

            {/* Sub-Account List */}
            {subLoading ? (
              <p style={{ color: T.grayLight, fontSize: 14 }}>Wird geladen...</p>
            ) : subAccounts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <p style={{ color: T.grayLight, fontSize: 14, marginBottom: 8 }}>
                  Noch keine Sub-Accounts erstellt.
                </p>
                <p style={{ color: T.gray, fontSize: 12 }}>
                  Laden Sie Guides und Team-Mitglieder ein, GuideTranslator zu nutzen.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {subAccounts.map(sa => (
                  <div key={sa.id} style={{
                    background: T.navyMid, borderRadius: 10, padding: "12px 16px",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{sa.name}</div>
                      <div style={{ fontSize: 12, color: T.grayLight }}>{sa.email}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{
                        fontSize: 11, color: T.grayLight, background: T.navy,
                        padding: "2px 8px", borderRadius: 4,
                      }}>
                        {new Date(sa.created_at).toLocaleDateString("de-DE")}
                      </span>
                      <button
                        onClick={() => handleRemoveSubAccount(sa.id, sa.email)}
                        style={{
                          background: "transparent", border: `1px solid ${T.red}30`,
                          color: T.red, padding: "4px 10px", borderRadius: 6,
                          fontSize: 11, cursor: "pointer",
                        }}
                      >Entfernen</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick Links */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16,
        }}>
          {[
            { label: "App starten", desc: "GuideTranslator Echtzeit-Übersetzung", href: "https://app.guidetranslator.com", external: true, color: T.gold },
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
