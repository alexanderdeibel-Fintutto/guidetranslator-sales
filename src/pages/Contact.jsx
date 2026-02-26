import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { T, font } from "../lib/tokens";
import { Icon } from "../components/Icon";
import { fmtEur } from "../lib/helpers";
import { getSegment } from "../config/segments";

export default function Contact({ lead, calcs, onSubmit }) {
  const { segment } = useParams();
  const navigate = useNavigate();
  const seg = getSegment(segment);

  const [msg, setMsg] = useState("");
  const [interest, setInterest] = useState("");
  const [timeline, setTimeline] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const best = calcs.length ? calcs.reduce((a, b) => (b.savings || 0) > (a.savings || 0) ? b : a, calcs[0]) : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit({ interest, timeline, message: msg });
    setSubmitting(false);
    navigate(`/${segment}/offer`);
  };

  const interestOpts = segment === "kreuzfahrt"
    ? ["Pilot (1 Schiff)", "Fleet-Lizenz", "Armada-Lizenz", "Custom Enterprise", "Nur Demo"]
    : ["Starter", "Pro", "Business", "Enterprise", "Nur Demo"];

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "40px 24px 80px" }}>
      <h2 className="fu" style={{ fontFamily: font, fontSize: "clamp(24px, 3vw, 36px)", marginBottom: 32 }}>Angebot <span style={{ color: seg.color }}>anfordern</span></h2>

      <div className="fu1" style={{ background: T.navyLight, borderRadius: 16, padding: 20, border: `1px solid ${T.navyMid}`, marginBottom: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 14 }}>
        <div><span style={{ color: T.grayLight }}>Name:</span> <strong>{lead?.name}</strong></div>
        <div><span style={{ color: T.grayLight }}>Unternehmen:</span> <strong style={{ color: seg.color }}>{lead?.company}</strong></div>
        <div><span style={{ color: T.grayLight }}>E-Mail:</span> {lead?.email}</div>
        <div><span style={{ color: T.grayLight }}>Position:</span> {lead?.role || "—"}</div>
      </div>

      {best && (
        <div className="fu2 gg" style={{ background: `${seg.color}08`, border: `1px solid ${seg.color}25`, borderRadius: 16, padding: 20, marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div><div style={{ fontSize: 12, color: seg.color, textTransform: "uppercase", letterSpacing: 1 }}>Beste Kalkulation</div><div style={{ fontFamily: font, fontSize: 28, fontWeight: 700, color: seg.color, marginTop: 4 }}>{best.savings > 0 ? `${fmtEur(best.savings)} Ersparnis` : `${fmtEur(best.totalFintuttoCost)}/Jahr`}</div></div>
          <div style={{ textAlign: "right", fontSize: 13, color: T.grayLight }}>{best.tierName}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="fu3" style={{ background: T.navyLight, borderRadius: 20, padding: 28, border: `1px solid ${T.navyMid}`, display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={{ fontSize: 13, color: T.grayLight, fontWeight: 500, marginBottom: 8, display: "block" }}>Interesse an</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {interestOpts.map(o => (
              <button key={o} type="button" onClick={() => setInterest(o)} style={{ padding: "8px 16px", borderRadius: 10, cursor: "pointer", background: interest === o ? `${seg.color}15` : T.navyMid, border: interest === o ? `1px solid ${seg.color}50` : `1px solid transparent`, color: interest === o ? seg.color : T.grayLight, fontSize: 13 }}>{o}</button>
            ))}
          </div>
        </div>
        <div>
          <label style={{ fontSize: 13, color: T.grayLight, fontWeight: 500, marginBottom: 8, display: "block" }}>Zeitrahmen</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["Sofort / ASAP", "Q2 2026", "Q3 2026", "2027", "Nur informativ"].map(o => (
              <button key={o} type="button" onClick={() => setTimeline(o)} style={{ padding: "8px 16px", borderRadius: 10, cursor: "pointer", background: timeline === o ? `${seg.color}15` : T.navyMid, border: timeline === o ? `1px solid ${seg.color}50` : `1px solid transparent`, color: timeline === o ? seg.color : T.grayLight, fontSize: 13 }}>{o}</button>
            ))}
          </div>
        </div>
        <div>
          <label style={{ fontSize: 13, color: T.grayLight, fontWeight: 500, marginBottom: 6, display: "block" }}>Nachricht</label>
          <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={4} placeholder="Beschreiben Sie Ihren Bedarf..." style={{ width: "100%", background: T.navyMid, border: `1px solid ${T.navyMid}`, borderRadius: 12, padding: "12px 16px", color: T.whiteTrue, fontSize: 14, resize: "vertical", lineHeight: 1.6 }} />
        </div>
        <button type="submit" disabled={submitting} style={{ background: `linear-gradient(135deg, ${seg.color}, ${T.goldDark})`, color: T.navy, border: "none", padding: "16px 32px", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, opacity: submitting ? 0.6 : 1 }}>
          <Icon name="mail" size={20} color={T.navy} /> {submitting ? "Wird gesendet..." : "Angebot anfordern"}
        </button>
      </form>
    </div>
  );
}
