import { T, font } from "../lib/tokens";
import { Icon } from "../components/Icon";

const steps = [
  { num: "01", icon: "globe", title: "Öffnen Sie die App", desc: "Gehen Sie zu app.guidetranslator.com oder scannen Sie den QR-Code. Keine Installation nötig." },
  { num: "02", icon: "mic", title: "Guide startet Übertragung", desc: "Der Guide (oder Sprecher) startet eine Session und beginnt zu sprechen." },
  { num: "03", icon: "users", title: "Hörer verbinden sich", desc: "Hörer scannen den QR-Code oder öffnen den Link. Sie wählen ihre Sprache — fertig." },
  { num: "04", icon: "globe", title: "KI übersetzt in Echtzeit", desc: "Die Sprache wird erkannt, übersetzt und als Audio in der gewählten Sprache wiedergegeben. Latenz: 2-4 Sekunden." },
];

const faqs = [
  { q: "Brauchen Hörer einen Account?", a: "Nein. Hörer öffnen einfach den Link oder scannen den QR-Code. Kein Login nötig." },
  { q: "Welche Sprachen sind verfügbar?", a: "Über 130 Sprachen — darunter alle europäischen Sprachen, Chinesisch, Japanisch, Koreanisch, Arabisch und viele mehr." },
  { q: "Welches Gerät brauche ich?", a: "Jedes Smartphone, Tablet oder Laptop mit Internetverbindung und Browser. Keine App-Installation nötig." },
  { q: "Wie ist die Audio-Qualität?", a: "Wir nutzen Google Cloud Text-to-Speech mit Neural2/WaveNet Stimmen — natürlich klingende, hochwertige Sprachausgabe." },
  { q: "Funktioniert es offline?", a: "Nein, eine Internetverbindung ist erforderlich für die Echtzeit-Übersetzung." },
];

export default function HowTo() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "60px 24px 80px" }}>
      <div className="fu" style={{ textAlign: "center", marginBottom: 48 }}>
        <h1 style={{ fontFamily: font, fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 700, marginBottom: 12 }}>
          So nutzen Sie <span style={{ color: T.gold }}>GuideTranslator</span>
        </h1>
        <p style={{ color: T.grayLight, fontSize: 16 }}>In 4 Schritten — keine Installation, kein Account für Hörer nötig.</p>
      </div>

      {steps.map((s, i) => (
        <div key={i} className={`fu${Math.min(i + 1, 4)}`} style={{ display: "flex", gap: 24, alignItems: "flex-start", background: T.navyLight, borderRadius: 16, padding: 28, border: `1px solid ${T.navyMid}`, marginBottom: 16 }}>
          <div style={{ minWidth: 56, height: 56, borderRadius: 14, background: `linear-gradient(135deg, ${T.gold}20, ${T.gold}05)`, border: `1px solid ${T.gold}30`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font, fontSize: 20, fontWeight: 700, color: T.gold }}>{s.num}</div>
          <div>
            <h3 style={{ fontFamily: font, fontSize: 20, fontWeight: 600, marginBottom: 6 }}>{s.title}</h3>
            <p style={{ fontSize: 14, color: T.grayLight, lineHeight: 1.6 }}>{s.desc}</p>
          </div>
        </div>
      ))}

      <div style={{ textAlign: "center", margin: "40px 0" }}>
        <a href="https://app.guidetranslator.com" target="_blank" rel="noopener noreferrer" style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          background: `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`, color: T.navy,
          padding: "16px 36px", borderRadius: 12, fontSize: 18, fontWeight: 700,
          textDecoration: "none", boxShadow: `0 8px 32px ${T.gold}30`,
        }}>
          <Icon name="play" size={22} color={T.navy} /> App öffnen
        </a>
      </div>

      {/* FAQ */}
      <div style={{ marginTop: 48 }}>
        <h2 style={{ fontFamily: font, fontSize: 28, fontWeight: 700, marginBottom: 24, textAlign: "center" }}>Häufige Fragen</h2>
        {faqs.map((f, i) => (
          <div key={i} style={{ background: T.navyLight, borderRadius: 12, padding: "16px 20px", border: `1px solid ${T.navyMid}`, marginBottom: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: T.gold }}>{f.q}</div>
            <div style={{ fontSize: 14, color: T.grayLight, lineHeight: 1.6 }}>{f.a}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
