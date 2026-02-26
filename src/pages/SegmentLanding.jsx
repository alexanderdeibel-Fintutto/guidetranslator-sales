import { useParams, useNavigate, Link } from "react-router-dom";
import { T, font, fontSans } from "../lib/tokens";
import { Icon } from "../components/Icon";
import { getSegment } from "../config/segments";

export default function SegmentLanding() {
  const { segment } = useParams();
  const navigate = useNavigate();
  const seg = getSegment(segment);
  const { hero, painPoints, comparison } = seg;

  const onStart = () => navigate(`/${segment}/register`);

  const S = ({ num, label, sub }) => (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: font, fontSize: 36, fontWeight: 700, color: seg.color }}>{num}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: T.whiteTrue, marginTop: 4 }}>{label}</div>
      <div style={{ fontSize: 11, color: T.gray, marginTop: 2 }}>{sub}</div>
    </div>
  );

  return (
    <div>
      {/* HERO */}
      <section style={{
        minHeight: "calc(100vh - 64px)", display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center", textAlign: "center", padding: "60px 24px",
        background: `radial-gradient(ellipse at 50% 20%, ${T.navyLight} 0%, ${T.navy} 70%)`,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: 80, left: "10%", width: 300, height: 300, borderRadius: "50%", background: `${seg.color}08`, filter: "blur(80px)" }} />
        <div style={{ position: "absolute", bottom: 100, right: "10%", width: 250, height: 250, borderRadius: "50%", background: `${T.gold}06`, filter: "blur(60px)" }} />

        <div className="fu" style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${seg.color}10`, border: `1px solid ${seg.color}25`, borderRadius: 30, padding: "6px 20px", marginBottom: 32 }}>
            <Icon name={seg.icon} size={16} color={seg.color} />
            <span style={{ fontSize: 13, color: seg.color, letterSpacing: 1, textTransform: "uppercase", fontWeight: 500 }}>{hero.badge}</span>
          </div>
        </div>

        <h1 className="fu1" style={{ fontFamily: font, fontSize: "clamp(32px, 5vw, 64px)", fontWeight: 700, lineHeight: 1.1, maxWidth: 900, position: "relative", zIndex: 1 }}>
          <span>{hero.headline[0]}</span><br />
          <span style={{ background: `linear-gradient(135deg, ${seg.color}, ${T.goldLight})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{hero.headline[1]}</span>
        </h1>

        <p className="fu2" style={{ fontSize: "clamp(16px, 2vw, 20px)", color: T.grayLight, maxWidth: 640, lineHeight: 1.6, marginTop: 24, position: "relative", zIndex: 1 }}>
          {hero.sub}
        </p>

        <div className="fu3" style={{ display: "flex", gap: 16, marginTop: 40, flexWrap: "wrap", justifyContent: "center", position: "relative", zIndex: 1 }}>
          <button onClick={onStart} style={{
            background: `linear-gradient(135deg, ${seg.color}, ${T.goldDark})`,
            color: T.navy, border: "none", padding: "16px 36px", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer",
            fontFamily: fontSans, display: "flex", alignItems: "center", gap: 10, boxShadow: `0 8px 32px ${seg.color}30`,
          }}>
            <Icon name="calc" size={20} color={T.navy} />
            Ersparnis berechnen
          </button>
          <Link to={`/${segment}/pricing`} style={{
            background: "transparent", color: seg.color,
            border: `1px solid ${seg.color}40`, padding: "16px 36px", borderRadius: 12,
            fontSize: 16, fontWeight: 600, textDecoration: "none",
            fontFamily: fontSans, display: "flex", alignItems: "center", gap: 10,
          }}>
            Preise ansehen
          </Link>
        </div>

        <div className="fu4" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 24, marginTop: 64, maxWidth: 700, width: "100%", position: "relative", zIndex: 1 }}>
          {hero.stats.map((s, i) => <S key={i} {...s} />)}
        </div>
      </section>

      {/* PAIN POINTS */}
      <section style={{ padding: "80px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <h2 style={{ fontFamily: font, fontSize: "clamp(24px, 3.5vw, 40px)", fontWeight: 700, textAlign: "center", marginBottom: 48 }}>
          Das Problem kostet Sie <span style={{ color: T.red }}>bares Geld</span>
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
          {painPoints.map((p, i) => (
            <div key={i} className="hl" style={{ background: T.navyLight, borderRadius: 16, padding: 28, border: `1px solid ${T.navyMid}` }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: `${seg.color}10`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Icon name={p.icon} size={24} color={seg.color} />
              </div>
              <h3 style={{ fontFamily: font, fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{p.title}</h3>
              <p style={{ fontSize: 14, color: T.grayLight, lineHeight: 1.6 }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* COMPARISON */}
      <section style={{ padding: "80px 24px", background: `linear-gradient(180deg, ${T.navyLight} 0%, ${T.navy} 100%)` }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{ fontFamily: font, fontSize: "clamp(24px, 3.5vw, 36px)", textAlign: "center", marginBottom: 48 }}>
            Traditionell vs. <span style={{ color: seg.color }}>GuideTranslator</span>
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={{ background: `${T.red}08`, border: `1px solid ${T.red}20`, borderRadius: 16, padding: 28 }}>
              <div style={{ fontSize: 14, color: T.red, fontWeight: 600, marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>Heute</div>
              {comparison.old.map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10, fontSize: 14, color: T.grayLight }}><span style={{ color: T.red }}>✗</span>{t}</div>
              ))}
            </div>
            <div className="gg" style={{ background: `${seg.color}08`, border: `1px solid ${seg.color}25`, borderRadius: 16, padding: 28 }}>
              <div style={{ fontSize: 14, color: seg.color, fontWeight: 600, marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>Mit GuideTranslator</div>
              {comparison.new.map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10, fontSize: 14, color: T.whiteTrue }}><Icon name="check" size={16} color={T.green} />{t}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "80px 24px", textAlign: "center", background: `linear-gradient(135deg, ${T.navyMid}, ${T.navyLight})`, borderTop: `1px solid ${seg.color}15` }}>
        <h2 style={{ fontFamily: font, fontSize: "clamp(24px, 3.5vw, 40px)", maxWidth: 600, margin: "0 auto 16px" }}>Berechnen Sie Ihre <span style={{ color: seg.color }}>Ersparnis</span></h2>
        <p style={{ color: T.grayLight, marginBottom: 32 }}>Individuell — in 2 Minuten</p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={onStart} style={{ background: `linear-gradient(135deg, ${seg.color}, ${T.goldDark})`, color: T.navy, border: "none", padding: "18px 48px", borderRadius: 12, fontSize: 18, fontWeight: 700, cursor: "pointer", boxShadow: `0 8px 32px ${seg.color}30` }}>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}><Icon name="arrow" size={20} color={T.navy} /> Kostenlos berechnen</span>
          </button>
          <Link to={`/${segment}/pricing`} style={{
            background: "transparent", color: seg.color,
            border: `1px solid ${seg.color}40`, padding: "18px 36px", borderRadius: 12,
            fontSize: 16, fontWeight: 600, textDecoration: "none",
          }}>Preise & Pläne</Link>
        </div>
      </section>

      <footer style={{ padding: "32px 24px", textAlign: "center", borderTop: `1px solid ${T.navyMid}` }}>
        <p style={{ fontSize: 12, color: T.gray }}>© 2026 FinTuttO GmbH — Powered by Google Cloud AI | <a href="https://fintutto.de" style={{ color: T.gold, textDecoration: "none" }}>fintutto.de</a></p>
      </footer>
    </div>
  );
}
