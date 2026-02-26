import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { T, font, fontSans } from "../lib/tokens";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Supabase handles the token exchange automatically via onAuthStateChange
    // when the user lands on this page from the reset email link
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setHasSession(true);
        setChecking(false);
      }
    });

    // Also check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setHasSession(true);
      setChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      setError("Passwort muss mindestens 6 Zeichen lang sein.");
      return;
    }
    if (password !== confirm) {
      setError("Passwörter stimmen nicht überein.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(true);
      setTimeout(() => navigate("/login", { replace: true }), 3000);
    } catch (err) {
      setError(err.message || "Passwort-Änderung fehlgeschlagen.");
    }
    setLoading(false);
  };

  if (checking) {
    return (
      <div style={{
        minHeight: "100vh", background: T.navy,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: fontSans,
      }}>
        <div style={{ color: T.gold, fontFamily: font, fontSize: 18, animation: "pulse 1.5s infinite" }}>
          Wird geladen...
        </div>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div style={{
        minHeight: "100vh", background: T.navy,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: fontSans, color: T.whiteTrue,
      }}>
        <div style={{ textAlign: "center", maxWidth: 400, padding: 24 }}>
          <h2 style={{ fontFamily: font, fontSize: 24, marginBottom: 12 }}>Ungültiger Link</h2>
          <p style={{ color: T.grayLight, fontSize: 14, marginBottom: 24 }}>
            Dieser Passwort-Reset-Link ist ungültig oder abgelaufen.
          </p>
          <Link to="/login" style={{
            display: "inline-block", textDecoration: "none",
            background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`,
            color: T.navy, padding: "14px 32px", borderRadius: 12,
            fontSize: 16, fontWeight: 700,
          }}>Zur Anmeldung</Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{
        minHeight: "100vh", background: T.navy,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: fontSans, color: T.whiteTrue,
      }}>
        <div style={{ textAlign: "center", maxWidth: 400, padding: 24 }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%", margin: "0 auto 16px",
            background: `${T.green}15`, border: `2px solid ${T.green}40`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, color: T.green,
          }}>&#10003;</div>
          <h2 style={{ fontFamily: font, fontSize: 24, marginBottom: 12 }}>Passwort geändert!</h2>
          <p style={{ color: T.grayLight, fontSize: 14 }}>
            Sie werden zur Anmeldung weitergeleitet...
          </p>
        </div>
      </div>
    );
  }

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
          <h1 style={{ fontFamily: font, fontSize: 28, marginBottom: 8 }}>Neues Passwort</h1>
          <p style={{ fontSize: 14, color: T.grayLight }}>Vergeben Sie ein neues Passwort für Ihren Account.</p>
        </div>

        <form onSubmit={handleSubmit} style={{
          background: T.navyLight, borderRadius: 16, padding: 28,
          border: `1px solid ${T.navyMid}`,
          display: "flex", flexDirection: "column", gap: 16,
        }}>
          <div>
            <label style={{ fontSize: 13, color: T.grayLight, fontWeight: 500, marginBottom: 8, display: "block" }}>Neues Passwort</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mindestens 6 Zeichen"
              autoFocus
              autoComplete="new-password"
              style={{
                width: "100%", background: T.navyMid,
                border: `1px solid ${T.navyMid}`, borderRadius: 10,
                padding: "12px 16px", color: T.whiteTrue, fontSize: 15,
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 13, color: T.grayLight, fontWeight: 500, marginBottom: 8, display: "block" }}>Passwort bestätigen</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Passwort wiederholen"
              autoComplete="new-password"
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
          }}>{loading ? "Wird gespeichert..." : "Passwort ändern"}</button>
        </form>
      </div>
    </div>
  );
}
