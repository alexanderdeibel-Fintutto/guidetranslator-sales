import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { T, font, fontSans } from "../lib/tokens";

export default function Login() {
  const { login, user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect
  if (user) {
    if (isAdmin()) {
      navigate("/admin", { replace: true });
    } else {
      navigate("/", { replace: true });
    }
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Bitte E-Mail und Passwort eingeben.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      // Auth state change will trigger redirect via useAuth
      navigate("/admin", { replace: true });
    } catch (err) {
      if (err.message?.includes("Invalid login")) {
        setError("Ungültige E-Mail oder Passwort.");
      } else {
        setError(err.message || "Anmeldung fehlgeschlagen.");
      }
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh", background: T.navy,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: fontSans, color: T.whiteTrue,
    }}>
      <div style={{ maxWidth: 420, width: "100%", padding: 24 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%", margin: "0 auto 16px",
            background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: font, fontWeight: 700, fontSize: 22, color: T.navy,
          }}>GT</div>
          <h1 style={{ fontFamily: font, fontSize: 28, marginBottom: 8 }}>Anmelden</h1>
          <p style={{ fontSize: 14, color: T.grayLight }}>GuideTranslator Admin & Sales</p>
        </div>

        <form onSubmit={handleSubmit} style={{
          background: T.navyLight, borderRadius: 16, padding: 28,
          border: `1px solid ${T.navyMid}`,
          display: "flex", flexDirection: "column", gap: 16,
        }}>
          <div>
            <label style={{ fontSize: 13, color: T.grayLight, fontWeight: 500, marginBottom: 8, display: "block" }}>E-Mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ihre@email.de"
              autoFocus
              autoComplete="email"
              style={{
                width: "100%", background: T.navyMid,
                border: `1px solid ${T.navyMid}`, borderRadius: 10,
                padding: "12px 16px", color: T.whiteTrue, fontSize: 15,
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 13, color: T.grayLight, fontWeight: 500, marginBottom: 8, display: "block" }}>Passwort</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Passwort eingeben"
              autoComplete="current-password"
              style={{
                width: "100%", background: T.navyMid,
                border: `1px solid ${T.navyMid}`, borderRadius: 10,
                padding: "12px 16px", color: T.whiteTrue, fontSize: 15,
              }}
            />
          </div>

          {error && (
            <div style={{
              background: `${T.red}10`, border: `1px solid ${T.red}30`,
              borderRadius: 8, padding: "10px 14px",
              fontSize: 13, color: T.red,
            }}>{error}</div>
          )}

          <button type="submit" disabled={loading} style={{
            width: "100%",
            background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`,
            color: T.navy, border: "none", padding: "14px 24px", borderRadius: 12,
            fontSize: 16, fontWeight: 700, cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}>{loading ? "Wird angemeldet..." : "Anmelden"}</button>
        </form>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <Link to="/" style={{
            color: T.grayLight, fontSize: 14, textDecoration: "none",
          }}>← Zurück zur Startseite</Link>
        </div>
      </div>
    </div>
  );
}
