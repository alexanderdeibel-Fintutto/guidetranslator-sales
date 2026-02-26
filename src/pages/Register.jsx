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

  const handleChange = useCallback((name, value) => {
    setF(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!f.name || !f.email || !f.company) { setErr("Bitte Name, E-Mail und Unternehmen ausfüllen."); return; }
    if (isInvite && !password) { setErr("Bitte vergeben Sie ein Passwort."); return; }
    setSubmitting(true);
    await onRegister({ ...f, segment, ships: f.size, password: password || undefined });
    setSubmitting(false);
  };

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
        <button type="submit" disabled={submitting} style={{ background: `linear-gradient(135deg, ${seg.color}, ${T.goldDark})`, color: T.navy, border: "none", padding: "14px 24px", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer", marginTop: 8, opacity: submitting ? 0.6 : 1 }}>
          {submitting ? "Wird gespeichert..." : isInvite ? "Registrierung abschließen" : "Kostenlos registrieren & berechnen"}
        </button>
        <p style={{ fontSize: 11, color: T.gray, textAlign: "center" }}>Keine Kreditkarte erforderlich. DSGVO-konform.</p>
      </form>
      {!isInvite && <button onClick={() => navigate(`/${segment}`)} style={{ background: "transparent", border: "none", color: T.grayLight, fontSize: 14, marginTop: 20, cursor: "pointer", display: "block", margin: "20px auto 0" }}>← Zurück</button>}
    </div>
  );
}
