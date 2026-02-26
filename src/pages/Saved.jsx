import { useParams, useNavigate } from "react-router-dom";
import { T, font } from "../lib/tokens";
import { Icon } from "../components/Icon";
import { fmtEur, fmtPct } from "../lib/helpers";
import { getSegment } from "../config/segments";

export default function Saved({ calcs, onDelete }) {
  const { segment } = useParams();
  const navigate = useNavigate();
  const seg = getSegment(segment);

  if (!calcs.length) return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
      <Icon name="save" size={48} color={T.gray} />
      <h2 style={{ fontFamily: font, fontSize: 24, marginTop: 16, color: T.grayLight }}>Keine gespeicherten Kalkulationen</h2>
      <button onClick={() => navigate(`/${segment}/calculator`)} style={{ background: T.navyMid, color: seg.color, border: `1px solid ${seg.color}40`, padding: "12px 24px", borderRadius: 10, fontSize: 14, cursor: "pointer", marginTop: 24 }}>Zum Kalkulator</button>
    </div>
  );

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 80px" }}>
      <h2 style={{ fontFamily: font, fontSize: "clamp(24px, 3vw, 32px)", marginBottom: 32 }}>Gespeicherte <span style={{ color: seg.color }}>Kalkulationen</span></h2>
      {calcs.map(calc => (
        <div key={calc.id} className="hl" style={{ background: T.navyLight, borderRadius: 16, padding: 24, border: `1px solid ${T.navyMid}`, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: font, fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{calc.name}</div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13 }}>
              {calc.savings > 0 && <span style={{ color: T.grayLight }}><strong style={{ color: seg.color }}>{fmtEur(calc.savings)}</strong> Ersparnis</span>}
              {calc.savingsPct > 0 && <span style={{ color: T.grayLight }}><strong style={{ color: T.green }}>{fmtPct(calc.savingsPct)}</strong></span>}
              <span style={{ color: T.grayLight }}>Paket: <strong>{calc.tierName}</strong></span>
              <span style={{ color: T.gray }}>{new Date(calc.date).toLocaleDateString("de-DE")}</span>
            </div>
          </div>
          <button onClick={() => onDelete(calc.id)} style={{ background: `${T.red}15`, border: `1px solid ${T.red}30`, color: T.red, padding: "8px 14px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>Löschen</button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
        <button onClick={() => navigate(`/${segment}/calculator`)} style={{ background: T.navyMid, color: seg.color, border: `1px solid ${seg.color}40`, padding: "12px 24px", borderRadius: 10, fontSize: 14, cursor: "pointer" }}>Neue Kalkulation</button>
        <button onClick={() => navigate(`/${segment}/contact`)} style={{ background: `linear-gradient(135deg, ${seg.color}, ${T.goldDark})`, color: T.navy, border: "none", padding: "12px 24px", borderRadius: 10, fontSize: 14, cursor: "pointer", fontWeight: 700 }}>Angebot anfordern</button>
      </div>
    </div>
  );
}
