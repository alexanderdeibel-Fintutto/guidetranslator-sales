import { useState } from "react";

const S = {
  page: { background: "#0a1628", color: "#f0f2f5", fontFamily: "'Segoe UI', sans-serif", padding: 32, minHeight: "100vh" },
  h1: { fontFamily: "Georgia, serif", marginBottom: 8 },
  sub: { color: "#6b7a8d", marginBottom: 32 },
  card: { background: "#132038", border: "1px solid #1a2d4a", borderRadius: 16, padding: 28, marginBottom: 20 },
  label: { display: "block", color: "#c8d6e5", fontSize: 14, marginBottom: 6 },
  input: { width: "100%", padding: "12px 16px", borderRadius: 8, border: "1px solid #1a2d4a", background: "#0d1b30", color: "#f0f2f5", fontSize: 15 },
  btnGold: { padding: "14px 32px", borderRadius: 10, border: "none", fontWeight: 700, fontSize: 16, cursor: "pointer", marginTop: 16, background: "linear-gradient(135deg, #c8a84e, #a08030)", color: "#0a1628" },
  btnSeed: { padding: "14px 32px", borderRadius: 10, border: "none", fontWeight: 700, fontSize: 16, cursor: "pointer", marginTop: 16, background: "linear-gradient(135deg, #e74c3c, #c0392b)", color: "#fff" },
  btnCopy: { background: "#1a2d4a", color: "#c8a84e", fontSize: 13, padding: "8px 16px", marginTop: 8, border: "none", borderRadius: 8, cursor: "pointer" },
  pre: { background: "#0d1b30", border: "1px solid #1a2d4a", borderRadius: 8, padding: 16, overflowX: "auto", fontSize: 13, lineHeight: 1.6, marginTop: 12, whiteSpace: "pre-wrap", color: "#f0f2f5" },
  success: { color: "#2ecc71", marginTop: 16 },
  error: { color: "#e74c3c", marginTop: 16 },
  warn: { background: "#2c1810", border: "1px solid rgba(230,126,34,0.25)", borderRadius: 8, padding: "12px 16px", color: "#e67e22", fontSize: 13, marginBottom: 16 },
  section: { marginTop: 40, paddingTop: 24, borderTop: "1px solid #1a2d4a" },
  pwBox: { background: "#1a0a0a", border: "2px solid #e74c3c", borderRadius: 8, padding: 16, marginTop: 12 },
  resultItem: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1a2d4a", fontSize: 14 },
  priceId: { color: "#c8a84e", fontFamily: "monospace" },
};

function escHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export default function Setup() {
  const [secret1, setSecret1] = useState("");
  const [secret2, setSecret2] = useState("");
  const [stripeLoading, setStripeLoading] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [stripeResult, setStripeResult] = useState(null);
  const [seedResult, setSeedResult] = useState(null);

  const runStripeSetup = async () => {
    if (!secret1.trim()) { alert("Bitte SEED_SECRET eingeben"); return; }
    setStripeLoading(true);
    setStripeResult(null);
    try {
      const res = await fetch("/api/setup-stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: secret1.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStripeResult({ error: data.error || res.statusText });
      } else {
        setStripeResult({ ok: true, data });
      }
    } catch (err) {
      setStripeResult({ error: "Netzwerk-Fehler: " + err.message });
    } finally {
      setStripeLoading(false);
    }
  };

  const runSeedAdmin = async () => {
    if (!secret2.trim()) { alert("Bitte SEED_SECRET eingeben"); return; }
    setSeedLoading(true);
    setSeedResult(null);
    try {
      const res = await fetch("/api/seed-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: secret2.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSeedResult({ error: data.error || res.statusText });
      } else {
        setSeedResult({ ok: true, data });
      }
    } catch (err) {
      setSeedResult({ error: "Netzwerk-Fehler: " + err.message });
    } finally {
      setSeedLoading(false);
    }
  };

  const copyText = (text) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Stripe &amp; Admin Setup</h1>
      <p style={S.sub}>Einmalige Einrichtung — erstellt Stripe-Produkte und Admin-Accounts</p>

      <div style={S.warn}>
        Diese Seite ist nur für die einmalige Einrichtung. Nach Nutzung bitte die Vercel-Umgebungsvariable SEED_SECRET entfernen.
      </div>

      {/* STRIPE SETUP */}
      <div style={S.card}>
        <h2 style={{ marginBottom: 16 }}>1. Stripe-Produkte erstellen</h2>
        <p style={{ color: "#c8d6e5", fontSize: 14, marginBottom: 16 }}>
          Erstellt alle 11 Produkte + Preise in Stripe (6 Abos + 5 Add-Ons). Die Price-IDs müssen in <code>pricing.js</code> eingetragen werden.
        </p>
        <label style={S.label}>SEED_SECRET</label>
        <input
          type="password"
          style={S.input}
          value={secret1}
          onChange={(e) => setSecret1(e.target.value)}
          placeholder="z.B. gt-seed-admin-einmalig"
        />
        <button
          style={{ ...S.btnGold, opacity: stripeLoading ? 0.5 : 1 }}
          onClick={runStripeSetup}
          disabled={stripeLoading}
        >
          {stripeLoading ? "Erstelle Produkte..." : "Stripe-Produkte erstellen"}
        </button>

        {stripeResult?.error && (
          <p style={S.error}>Fehler: {stripeResult.error}</p>
        )}

        {stripeResult?.ok && (
          <div>
            <h3 style={S.success}>Erfolgreich erstellt!</h3>
            <div style={{ marginTop: 12 }}>
              {Object.entries(stripeResult.data.results || {}).map(([id, info]) => (
                <div key={id} style={S.resultItem}>
                  <span>{info.error ? id : `${id} (${info.amount}, ${info.type})`}</span>
                  <span style={info.error ? { color: "#e74c3c" } : S.priceId}>
                    {info.error || info.priceId}
                  </span>
                </div>
              ))}
            </div>

            {stripeResult.data.pricingJsSnippet && (
              <>
                <h3 style={{ marginTop: 24 }}>pricing.js Snippet:</h3>
                <pre style={S.pre}>{stripeResult.data.pricingJsSnippet}</pre>
                <button style={S.btnCopy} onClick={() => copyText(stripeResult.data.pricingJsSnippet)}>
                  Snippet kopieren
                </button>
              </>
            )}

            <h3 style={{ marginTop: 24 }}>Vollständige Antwort (JSON):</h3>
            <pre style={S.pre}>{JSON.stringify(stripeResult.data, null, 2)}</pre>
            <button style={S.btnCopy} onClick={() => copyText(JSON.stringify(stripeResult.data, null, 2))}>
              JSON kopieren
            </button>
          </div>
        )}
      </div>

      {/* ADMIN SEED */}
      <div style={{ ...S.card, ...S.section }}>
        <h2 style={{ marginBottom: 16 }}>2. Admin-Accounts anlegen</h2>
        <p style={{ color: "#c8d6e5", fontSize: 14, marginBottom: 16 }}>
          Erstellt Alexander (super_admin) und Ulrich (admin). Passwörter werden <strong>nur einmal</strong> angezeigt!
        </p>
        <label style={S.label}>SEED_SECRET</label>
        <input
          type="password"
          style={S.input}
          value={secret2}
          onChange={(e) => setSecret2(e.target.value)}
          placeholder="z.B. gt-seed-admin-einmalig"
        />
        <button
          style={{ ...S.btnSeed, opacity: seedLoading ? 0.5 : 1 }}
          onClick={runSeedAdmin}
          disabled={seedLoading}
        >
          {seedLoading ? "Erstelle Accounts..." : "Admin-Accounts erstellen"}
        </button>

        {seedResult?.error && (
          <p style={S.error}>Fehler: {seedResult.error}</p>
        )}

        {seedResult?.ok && (
          <div>
            <h3 style={S.success}>Admin-Accounts erstellt!</h3>
            <div style={{ ...S.warn, marginTop: 12 }}>
              ACHTUNG: Passwörter werden nur EINMAL angezeigt. Jetzt sofort sicher abspeichern!
            </div>
            {(seedResult.data.accounts || seedResult.data.results || []).map((acc, i) => (
              <div key={i} style={S.pwBox}>
                <p style={{ fontSize: 14, color: "#f0f2f5", marginBottom: 4 }}>
                  <strong>{acc.email}</strong> — {acc.role || ""} ({acc.status || ""})
                </p>
                <p style={{ fontSize: 14, color: "#f0f2f5" }}>
                  Passwort: <span style={{ color: "#e74c3c", fontFamily: "monospace", fontSize: 16, fontWeight: 700 }}>
                    {acc.password || acc.tempPassword || "(siehe JSON)"}
                  </span>
                </p>
              </div>
            ))}
            <h3 style={{ marginTop: 24 }}>Vollständige Antwort:</h3>
            <pre style={S.pre}>{JSON.stringify(seedResult.data, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
