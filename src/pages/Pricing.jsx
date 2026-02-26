import { useParams, Link } from "react-router-dom";
import { T, font, fontSans } from "../lib/tokens";
import { getSegment } from "../config/segments";
import { getTiersForSegment, formatPrice, ADDONS } from "../config/pricing";

export default function Pricing() {
  const { segment } = useParams();
  const seg = getSegment(segment);
  const tiers = getTiersForSegment(segment);
  const accent = seg?.color || T.gold;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 80px" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <span style={{
          display: "inline-block", fontSize: 11, letterSpacing: 2,
          textTransform: "uppercase", color: accent,
          background: `${accent}12`, padding: "6px 16px",
          borderRadius: 20, border: `1px solid ${accent}30`,
          marginBottom: 16,
        }}>Preise für {seg.label}</span>
        <h1 style={{ fontFamily: font, fontSize: 36, fontWeight: 700, marginBottom: 12 }}>
          Wählen Sie Ihren <span style={{ color: accent }}>Plan</span>
        </h1>
        <p style={{ fontSize: 16, color: T.grayLight, maxWidth: 600, margin: "0 auto", lineHeight: 1.6 }}>
          Transparent und fair — wachsen Sie mit Ihrem Bedarf. Alle Pläne monatlich kündbar.
        </p>
      </div>

      {/* Tier Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${Math.min(tiers.length, 3)}, 1fr)`,
        gap: 20,
        marginBottom: 48,
      }}>
        {tiers.map((tier, i) => {
          const isPopular = tier.badge === "Beliebt" || tier.badge === "Empfohlen";
          return (
            <div key={tier.id} style={{
              background: T.navyLight,
              borderRadius: 20,
              border: isPopular ? `2px solid ${accent}` : `1px solid ${T.navyMid}`,
              padding: "32px 28px",
              position: "relative",
              display: "flex", flexDirection: "column",
              transform: isPopular ? "scale(1.02)" : "none",
            }}>
              {/* Badge */}
              {tier.badge && (
                <div style={{
                  position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                  background: isPopular ? `linear-gradient(135deg, ${accent}, ${T.goldDark})` : T.navyMid,
                  color: isPopular ? T.navy : T.grayLight,
                  padding: "4px 16px", borderRadius: 20,
                  fontSize: 11, fontWeight: 700, letterSpacing: 1,
                  textTransform: "uppercase", whiteSpace: "nowrap",
                }}>{tier.badge}</div>
              )}

              {/* Tier Name */}
              <h3 style={{
                fontFamily: font, fontSize: 22, fontWeight: 700,
                marginBottom: 4, marginTop: tier.badge ? 8 : 0,
              }}>{tier.name}</h3>

              {/* Price */}
              <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: `1px solid ${T.navyMid}` }}>
                {tier.price !== null ? (
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span style={{ fontFamily: font, fontSize: 42, fontWeight: 700, color: accent }}>
                      {formatPrice(tier.price)}
                    </span>
                    {tier.price > 0 && (
                      <span style={{ fontSize: 14, color: T.grayLight }}>/ Monat</span>
                    )}
                  </div>
                ) : (
                  <div style={{ fontFamily: font, fontSize: 28, fontWeight: 700, color: accent }}>
                    Auf Anfrage
                  </div>
                )}
              </div>

              {/* Features */}
              <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1 }}>
                {tier.features.map((f, fi) => (
                  <li key={fi} style={{
                    display: "flex", gap: 10, alignItems: "flex-start",
                    fontSize: 14, color: T.grayLight, marginBottom: 10, lineHeight: 1.4,
                  }}>
                    <span style={{ color: accent, fontWeight: 700, fontSize: 14, flexShrink: 0, marginTop: 1 }}>✓</span>
                    {f}
                  </li>
                ))}
                {tier.restrictions.map((r, ri) => (
                  <li key={`r${ri}`} style={{
                    display: "flex", gap: 10, alignItems: "flex-start",
                    fontSize: 13, color: T.gray, marginBottom: 8, lineHeight: 1.4,
                  }}>
                    <span style={{ color: T.gray, fontSize: 13, flexShrink: 0 }}>—</span>
                    {r}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div style={{ marginTop: 24 }}>
                {tier.price === null ? (
                  <Link to={`/${segment}/contact`} style={{
                    display: "block", textAlign: "center", textDecoration: "none",
                    background: T.navyMid, color: accent,
                    border: `1px solid ${accent}40`,
                    padding: "14px 24px", borderRadius: 12,
                    fontSize: 15, fontWeight: 700,
                  }}>Kontakt aufnehmen</Link>
                ) : tier.price === 0 ? (
                  <a href="https://app.guidetranslator.com" target="_blank" rel="noopener noreferrer" style={{
                    display: "block", textAlign: "center", textDecoration: "none",
                    background: T.navyMid, color: T.grayLight,
                    border: `1px solid ${T.navyMid}`,
                    padding: "14px 24px", borderRadius: 12,
                    fontSize: 15, fontWeight: 700,
                  }}>Kostenlos starten</a>
                ) : tier.stripePriceId ? (
                  <button onClick={() => handleCheckout(tier)} style={{
                    width: "100%",
                    background: isPopular ? `linear-gradient(135deg, ${accent}, ${T.goldDark})` : T.navyMid,
                    color: isPopular ? T.navy : accent,
                    border: isPopular ? "none" : `1px solid ${accent}40`,
                    padding: "14px 24px", borderRadius: 12,
                    fontSize: 15, fontWeight: 700, cursor: "pointer",
                  }}>Jetzt starten</button>
                ) : (
                  <Link to={`/${segment}/contact`} style={{
                    display: "block", textAlign: "center", textDecoration: "none",
                    background: isPopular ? `linear-gradient(135deg, ${accent}, ${T.goldDark})` : T.navyMid,
                    color: isPopular ? T.navy : accent,
                    border: isPopular ? "none" : `1px solid ${accent}40`,
                    padding: "14px 24px", borderRadius: 12,
                    fontSize: 15, fontWeight: 700,
                  }}>Plan anfragen</Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add-Ons */}
      <div style={{
        background: T.navyLight, borderRadius: 20,
        border: `1px solid ${T.navyMid}`, padding: "32px 28px",
        marginBottom: 48,
      }}>
        <h2 style={{ fontFamily: font, fontSize: 22, fontWeight: 700, marginBottom: 20 }}>
          Zusatzkontingente <span style={{ color: accent }}>/ Add-Ons</span>
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          {Object.values(ADDONS).map(addon => (
            <div key={addon.id} style={{
              background: T.navyMid, borderRadius: 12, padding: "14px 18px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontSize: 14, color: T.grayLight }}>{addon.name}</span>
              <span style={{ fontFamily: font, fontSize: 16, fontWeight: 700, color: accent }}>{formatPrice(addon.price)}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, color: T.gray, marginTop: 12 }}>
          Add-Ons sind jederzeit buchbar und gelten für den laufenden Monat.
        </p>
      </div>

      {/* FAQ */}
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <h2 style={{ fontFamily: font, fontSize: 22, fontWeight: 700, textAlign: "center", marginBottom: 24 }}>
          Häufige Fragen
        </h2>
        {[
          { q: "Kann ich monatlich kündigen?", a: "Ja, alle Pläne sind monatlich kündbar. Es gibt keine Mindestlaufzeit." },
          { q: "Was passiert, wenn mein Kontingent aufgebraucht ist?", a: "Sie können jederzeit Add-Ons buchen oder in den nächsten Plan upgraden. Bestehende Sitzungen werden nicht unterbrochen." },
          { q: "Gibt es Jahresrabatte?", a: "Ja, bei jährlicher Zahlung sparen Sie 20%. Kontaktieren Sie uns für ein individuelles Angebot." },
          { q: "Kann ich zwischen Plänen wechseln?", a: "Jederzeit. Upgrades werden sofort aktiv, Downgrades zum nächsten Abrechnungszeitraum." },
          { q: "Wie werden Minuten gezählt?", a: "Es werden nur die tatsächlich genutzten Übersetzungsminuten gezählt. Pausierte Sitzungen verbrauchen kein Kontingent." },
        ].map((faq, i) => (
          <div key={i} style={{
            background: T.navyLight, borderRadius: 12,
            border: `1px solid ${T.navyMid}`, padding: "16px 20px",
            marginBottom: 8,
          }}>
            <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{faq.q}</h4>
            <p style={{ fontSize: 14, color: T.grayLight, lineHeight: 1.6 }}>{faq.a}</p>
          </div>
        ))}
      </div>

      {/* CTA Bottom */}
      <div style={{ textAlign: "center", marginTop: 48 }}>
        <p style={{ color: T.grayLight, fontSize: 14, marginBottom: 16 }}>
          Noch unsicher? Berechnen Sie Ihre individuelle Ersparnis.
        </p>
        <Link to={`/${segment}/calculator`} style={{
          display: "inline-block", textDecoration: "none",
          background: `linear-gradient(135deg, ${accent}, ${T.goldDark})`,
          color: T.navy, padding: "14px 32px", borderRadius: 12,
          fontSize: 16, fontWeight: 700,
        }}>Zum Kalkulator</Link>
      </div>
    </div>
  );
}

async function handleCheckout(tier) {
  if (!tier.stripePriceId) return;
  try {
    const res = await fetch("/api/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId: tier.stripePriceId }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    }
  } catch (err) {
    console.error("Checkout error:", err);
  }
}
