import { useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { T, font } from "../lib/tokens";
import { Icon } from "../components/Icon";
import { fmtEur } from "../lib/helpers";
import { getSegment } from "../config/segments";

function generateICS(lead) {
  const start = new Date();
  start.setDate(start.getDate() + 2);
  start.setHours(10, 0, 0, 0);
  const end = new Date(start);
  end.setMinutes(30);
  const fmt = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//GuideTranslator//Sales//DE
BEGIN:VEVENT
DTSTART:${fmt(start)}
DTEND:${fmt(end)}
SUMMARY:GuideTranslator testen
DESCRIPTION:Testen Sie GuideTranslator: https://app.guidetranslator.com\\n\\nIhr persönlicher Zugang wartet.
URL:https://app.guidetranslator.com
BEGIN:VALARM
TRIGGER:-PT1H
ACTION:DISPLAY
DESCRIPTION:GuideTranslator Test in 1 Stunde
END:VALARM
END:VEVENT
END:VCALENDAR`;
}

export default function PostOffer({ lead, calcs, onTrackTest }) {
  const { segment } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const checkoutSuccess = searchParams.get("checkout") === "success";
  const seg = getSegment(segment);
  const best = calcs?.length ? calcs.reduce((a, b) => (b.savings || 0) > (a.savings || 0) ? b : a, calcs[0]) : null;

  const handleTestNow = () => {
    if (onTrackTest) onTrackTest("tested");
    window.open("https://app.guidetranslator.com", "_blank");
  };

  const handleTestLater = () => {
    if (onTrackTest) onTrackTest("later");
    const blob = new Blob([generateICS(lead)], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "guidetranslator-test.ics";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
      {checkoutSuccess && (
        <div style={{
          background: `${T.green}12`, border: `1px solid ${T.green}40`,
          borderRadius: 12, padding: "16px 24px", marginBottom: 32,
          color: T.green, fontSize: 15, fontWeight: 600,
        }}>
          Zahlung erfolgreich! Ihr Abonnement wird in Kürze aktiviert.
        </div>
      )}

      <div className="fu" style={{ width: 80, height: 80, borderRadius: "50%", margin: "0 auto 24px", background: `${T.green}15`, border: `2px solid ${T.green}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name="check" size={40} color={T.green} />
      </div>
      <h2 className="fu1" style={{ fontFamily: font, fontSize: 32, fontWeight: 700, marginBottom: 12 }}>
        {checkoutSuccess ? "Abonnement aktiviert!" : "Anfrage erhalten!"}
      </h2>
      <p className="fu2" style={{ color: T.grayLight, fontSize: 16, lineHeight: 1.7, marginBottom: 32 }}>
        {checkoutSuccess ? (
          <>Vielen Dank, <strong style={{ color: T.whiteTrue }}>{lead?.name}</strong>. Ihr Plan für <strong style={{ color: seg.color }}>{lead?.company}</strong> ist aktiv. Sie können jetzt direkt loslegen.</>
        ) : (
          <>Vielen Dank, <strong style={{ color: T.whiteTrue }}>{lead?.name}</strong>. Unser Team meldet sich innerhalb von 24 Stunden mit einem individuellen Angebot für <strong style={{ color: seg.color }}>{lead?.company}</strong>.</>
        )}
      </p>

      {best && (
        <div className="fu3 gg" style={{ background: `${seg.color}08`, border: `1px solid ${seg.color}25`, borderRadius: 16, padding: 24, marginBottom: 32 }}>
          <div style={{ fontSize: 13, color: seg.color, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Ihre Kalkulation</div>
          <div style={{ fontFamily: font, fontSize: 36, fontWeight: 700, color: seg.color }}>
            {best.savings > 0 ? `${fmtEur(best.savings)} Ersparnis/Jahr` : `${fmtEur(best.totalFintuttoCost)}/Jahr`}
          </div>
        </div>
      )}

      {/* Test Options */}
      <div className="fu4" style={{ background: T.navyLight, borderRadius: 20, padding: 28, border: `1px solid ${T.navyMid}`, marginBottom: 24 }}>
        <h3 style={{ fontFamily: font, fontSize: 20, marginBottom: 16 }}>Möchten Sie <span style={{ color: seg.color }}>direkt testen</span>?</h3>
        <p style={{ color: T.grayLight, fontSize: 14, marginBottom: 24 }}>Erleben Sie GuideTranslator live — Echtzeit-Übersetzung in Aktion.</p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={handleTestNow} style={{
            background: `linear-gradient(135deg, ${seg.color}, ${T.goldDark})`, color: T.navy, border: "none",
            padding: "14px 28px", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <Icon name="play" size={18} color={T.navy} /> Jetzt testen
          </button>
          <button onClick={handleTestLater} style={{
            background: T.navyMid, color: T.grayLight, border: `1px solid ${T.navyMid}`,
            padding: "14px 28px", borderRadius: 12, fontSize: 15, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <Icon name="calendar" size={18} color={T.grayLight} /> Später testen (Kalender-Eintrag)
          </button>
        </div>

        <button onClick={() => navigate(`/howto`)} style={{ background: "transparent", border: "none", color: seg.color, fontSize: 13, cursor: "pointer", marginTop: 16, textDecoration: "underline" }}>
          Wie funktioniert die App?
        </button>
      </div>

      <p style={{ fontSize: 14, color: T.gray }}>Ihr Ansprechpartner: <strong style={{ color: T.whiteTrue }}>Ulrich — GuideTranslator Enterprise</strong><br />enterprise@guidetranslator.com</p>
      <button onClick={() => navigate(`/${segment}/calculator`)} style={{ background: T.navyMid, color: seg.color, border: `1px solid ${seg.color}40`, padding: "12px 24px", borderRadius: 10, fontSize: 14, cursor: "pointer", marginTop: 32 }}>Weitere Kalkulationen</button>
    </div>
  );
}
