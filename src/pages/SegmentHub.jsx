import { Link } from "react-router-dom";
import { T, font, fontSans } from "../lib/tokens";
import { Icon } from "../components/Icon";
import { SEGMENTS } from "../config/segments";

export default function SegmentHub() {
  const segments = Object.values(SEGMENTS);
  return (
    <div>
      {/* HERO */}
      <section style={{
        minHeight: "calc(100vh - 64px)", display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center", textAlign: "center", padding: "60px 24px",
        background: `radial-gradient(ellipse at 50% 20%, ${T.navyLight} 0%, ${T.navy} 70%)`,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: 80, left: "10%", width: 300, height: 300, borderRadius: "50%", background: `${T.sea}08`, filter: "blur(80px)" }} />
        <div style={{ position: "absolute", bottom: 100, right: "10%", width: 250, height: 250, borderRadius: "50%", background: `${T.gold}06`, filter: "blur(60px)" }} />

        <div className="fu" style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${T.gold}10`, border: `1px solid ${T.gold}25`, borderRadius: 30, padding: "6px 20px", marginBottom: 32 }}>
            <Icon name="globe" size={16} />
            <span style={{ fontSize: 13, color: T.gold, letterSpacing: 1, textTransform: "uppercase", fontWeight: 500 }}>KI-Echtzeit-Übersetzung</span>
          </div>
        </div>

        <h1 className="fu1" style={{ fontFamily: font, fontSize: "clamp(32px, 5vw, 64px)", fontWeight: 700, lineHeight: 1.1, maxWidth: 900, position: "relative", zIndex: 1 }}>
          <span>Eine Sprache rein.</span><br />
          <span style={{ background: `linear-gradient(135deg, ${T.gold}, ${T.goldLight})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>130+ Sprachen raus.</span>
        </h1>

        <p className="fu2" style={{ fontSize: "clamp(16px, 2vw, 20px)", color: T.grayLight, maxWidth: 640, lineHeight: 1.6, marginTop: 24, position: "relative", zIndex: 1 }}>
          GuideTranslator — KI-gestützte Echtzeit-Übersetzung für jeden Einsatz.
          Wählen Sie Ihren Bereich:
        </p>
      </section>

      {/* SEGMENT CARDS */}
      <section style={{ padding: "80px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
          {segments.map((seg, i) => (
            <Link key={seg.id} to={`/${seg.id}`} className={`hl fu${Math.min(i, 4)}`} style={{
              background: T.navyLight, borderRadius: 16, padding: 28, border: `1px solid ${T.navyMid}`,
              textDecoration: "none", color: T.whiteTrue, display: "block",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `${seg.color}15`, border: `1px solid ${seg.color}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name={seg.icon} size={24} color={seg.color} />
                </div>
                <div>
                  <h3 style={{ fontFamily: font, fontSize: 20, fontWeight: 600 }}>{seg.label}</h3>
                  <p style={{ fontSize: 12, color: T.gray }}>{seg.sublabel}</p>
                </div>
              </div>
              <p style={{ fontSize: 14, color: T.grayLight, lineHeight: 1.6 }}>
                {seg.hero.sub.slice(0, 120)}...
              </p>
              <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 6, color: seg.color, fontSize: 13, fontWeight: 600 }}>
                Berechnen Sie Ihre Ersparnis <Icon name="arrow" size={14} color={seg.color} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <footer style={{ padding: "32px 24px", textAlign: "center", borderTop: `1px solid ${T.navyMid}` }}>
        <p style={{ fontSize: 12, color: T.gray }}>© 2026 FinTuttO GmbH — Powered by Google Cloud AI | <a href="https://fintutto.de" style={{ color: T.gold, textDecoration: "none" }}>fintutto.de</a></p>
      </footer>
    </div>
  );
}
