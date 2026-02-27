import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { T, font } from "../lib/tokens";
import { Icon } from "../components/Icon";
import { FormField } from "../components/FormField";
import { getSegment } from "../config/segments";

export default function Register({ onRegister, prefill }) {
  const { segment } = useParams();
  const navigate = useNavigate();
  const seg = getSegment(segment);
  const rf = seg.registerFields;

  const [f, setF] = useState(prefill || { name: "", email: "", company: "", role: "", size: "", phone: "" });
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isInvite = !!prefill;

  // Email verification state
  const [verifyStep, setVerifyStep] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifySending, setVerifySending] = useState(false);
  const [verifyResent, setVerifyResent] = useState(false);

  const handleChange = useCallback((name, value) => {
    setF(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSendCode = async () => {
    if (!f.email) { setErr("Bitte geben Sie Ihre E-Mail-Adresse ein."); return; }
    setVerifySending(true);
    setErr("");
    try {
      const res = await fetch("/api/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: f.email }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "Code konnte nicht gesendet werden."); setVerifySending(false); return; }
      setVerifyStep(true);
      setVerifyResent(false);
    } catch {
      setErr("Netzwerkfehler. Bitte versuchen Sie es erneut.");
    }
    setVerifySending(false);
  };

  const handleVerifyCode = async () => {
    if (!verifyCode || verifyCode.length !== 6) { setErr("Bitte geben Sie den 6-stelligen Code ein."); return; }
    setVerifySending(true);
    setErr("");
    try {
      const res = await fetch("/api/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: f.email, code: verifyCode }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "Verifizierung fehlgeschlagen."); setVerifySending(false); return; }
      // Verified — proceed with registration
      setSubmitting(true);
      await onRegister({ ...f, segment, ships: f.size, password: password || undefined, emailVerified: true });
      setSubmitting(false);
    } catch {
      setErr("Netzwerkfehler. Bitte versuchen Sie es erneut.");
    }
    setVerifySending(false);
  };

  const handleResend = async () => {
    setVerifyResent(false);
    await handleSendCode();
    setVerifyResent(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!f.name || !f.email || !f.company) { setErr("Bitte Name, E-Mail und Unternehmen ausfüllen."); return; }
    if (isInvite && !password) { setErr("Bitte vergeben Sie ein Passwort."); return; }

    // Invite users skip email verification (already verified via invite link)
    if (isInvite) {
      setSubmitting(true);
      await onRegister({ ...f, segment, ships: f.size, password: password || undefined });
      setSubmitting(false);
      return;
    }

    // For regular registration: send verification code
    await handleSendCode();
  };

  // ─── Verification Step ─────────────────────────────────────
  if (verifyStep && !isInvite) {
    return (
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "60px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", margin: "0 auto 20px", background: `${seg.color}15`, border: `1px solid ${seg.color}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="mail" size={28} color={seg.color} />
          </div>
          <h2 style={{ fontFamily: font, fontSize: 28, fontWeight: 700, marginBottom: 8 }}>E-Mail bestätigen</h2>
          <p style={{ color: T.grayLight, fontSize: 15, lineHeight: 1.6 }}>
            Wir haben einen 6-stelligen Code an<br />
            <strong style={{ color: T.whiteTrue }}>{f.email}</strong> gesendet.
          </p>
        </div>

        <div style={{ background: T.navyLight, borderRadius: 20, padding: 32, border: `1px solid ${T.navyMid}`, display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={verifyCode}
            onChange={e => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            autoFocus
            style={{
              width: 200, textAlign: "center",
              background: T.navyMid, border: `1px solid ${seg.color}40`,
              borderRadius: 12, padding: "16px 20px",
              color: T.whiteTrue, fontSize: 28, fontWeight: 700,
              letterSpacing: 8, fontFamily: "monospace",
            }}
          />

          {err && <p style={{ color: T.red, fontSize: 13, textAlign: "center" }}>{err}</p>}

          <button
            onClick={handleVerifyCode}
            disabled={verifySending || verifyCode.length !== 6}
            style={{
              width: "100%",
              background: `linear-gradient(135deg, ${seg.color}, ${T.goldDark})`,
              color: T.navy, border: "none", padding: "14px 24px", borderRadius: 12,
              fontSize: 16, fontWeight: 700, cursor: "pointer",
              opacity: (verifySending || verifyCode.length !== 6) ? 0.6 : 1,
            }}
          >
            {verifySending ? "Wird geprüft..." : "Bestätigen & weiter"}
          </button>

          <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
            <button onClick={handleResend} disabled={verifySending} style={{ background: "transparent", border: "none", color: seg.color, cursor: "pointer", textDecoration: "underline", fontSize: 13 }}>
              Code erneut senden
            </button>
            <button onClick={() => { setVerifyStep(false); setVerifyCode(""); setErr(""); }} style={{ background: "transparent", border: "none", color: T.grayLight, cursor: "pointer", fontSize: 13 }}>
              E-Mail ändern
            </button>
          </div>
          {verifyResent && <p style={{ color: T.green, fontSize: 12 }}>Neuer Code gesendet!</p>}
        </div>
      </div>
    );
  }

  // ─── Registration Form ─────────────────────────────────────
  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "60px 24px" }}>
      <div className="fu" style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", margin: "0 auto 20px", background: `${seg.color}15`, border: `1px solid ${seg.color}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name={seg.icon} size={28} color={seg.color} />
        </div>
        <h2 style={{ fontFamily: font, fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
          {isInvite ? "Willkommen bei GuideTranslator" : `${seg.label} Kalkulator`}
        </h2>
        <p style={{ color: T.grayLight, fontSize: 15 }}>
          {isInvite
            ? "Bitte prüfen Sie Ihre Daten und vergeben Sie ein Passwort."
            : "Registrieren Sie sich kostenlos für Ihren individuellen Einsparungs-Kalkulator."}
        </p>
      </div>
      <form onSubmit={handleSubmit} className="fu1" style={{ background: T.navyLight, borderRadius: 20, padding: 32, border: `1px solid ${T.navyMid}`, display: "flex", flexDirection: "column", gap: 16 }}>
        <FormField label="Ihr Name" name="name" ph="Max Mustermann" req value={f.name} onChange={handleChange} />
        <FormField label="E-Mail" name="email" type="email" ph="m.mustermann@firma.de" req value={f.email} onChange={handleChange} />
        <FormField label="Unternehmen / Organisation" name="company" ph="z.B. Ihr Unternehmen" req value={f.company} onChange={handleChange} />
        <FormField label={rf.roleLabel} name="role" value={f.role} onChange={handleChange} opts={rf.roleOpts} />
        <FormField label={rf.sizeLabel} name="size" value={f.size} onChange={handleChange} opts={rf.sizeOpts} />
        <FormField label="Telefon (optional)" name="phone" type="tel" ph="+49 ..." value={f.phone} onChange={handleChange} />
        {isInvite && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, color: T.grayLight, fontWeight: 500 }}>Passwort vergeben <span style={{ color: seg.color }}>*</span></label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mindestens 6 Zeichen" style={{ width: "100%", background: T.navyMid, border: `1px solid ${T.navyMid}`, borderRadius: 10, padding: "12px 16px", color: T.whiteTrue, fontSize: 15 }} />
          </div>
        )}
        {err && <p style={{ color: T.red, fontSize: 13 }}>{err}</p>}
        <button type="submit" disabled={submitting || verifySending} style={{ background: `linear-gradient(135deg, ${seg.color}, ${T.goldDark})`, color: T.navy, border: "none", padding: "14px 24px", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer", marginTop: 8, opacity: (submitting || verifySending) ? 0.6 : 1 }}>
          {submitting ? "Wird gespeichert..." : verifySending ? "Code wird gesendet..." : isInvite ? "Registrierung abschließen" : "Kostenlos registrieren & berechnen"}
        </button>
        <p style={{ fontSize: 11, color: T.gray, textAlign: "center" }}>Keine Kreditkarte erforderlich. DSGVO-konform.</p>
      </form>
      {!isInvite && <button onClick={() => navigate(`/${segment}`)} style={{ background: "transparent", border: "none", color: T.grayLight, fontSize: 14, marginTop: 20, cursor: "pointer", display: "block", margin: "20px auto 0" }}>← Zurück</button>}
    </div>
  );
}
