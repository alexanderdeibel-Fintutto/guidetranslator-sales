import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { T, font, fontSans } from "../lib/tokens";
import { Icon } from "../components/Icon";
import { fmt, fmtEur, fmtPct } from "../lib/helpers";
import { getSegment } from "../config/segments";

// ─── CALCULATION ENGINE ─────────────────────────────────────
function calculate(segment, c) {
  const chars = (mins) => mins * 900;
  const transCost = 0.00002;
  const ttsCost = c.ttsQuality === "wavenet" ? 0.000004 : c.ttsQuality === "neural2" ? 0.000016 : 0.00003;
  const ttsId = c.ttsQuality || "neural2";

  if (segment === "kreuzfahrt") {
    const totalExc = c.ships * c.excursionDays * c.excursionsPerDay;
    const transChars = chars(c.guideMinsPerExcursion) * c.languages;
    const apiPerExc = transChars * (transCost + ttsCost);
    const totalApi = totalExc * apiPerExc * 0.92;
    let monthlyLic = 0, tier = "";
    if (c.ships <= 1) { monthlyLic = 2990; tier = "Starter"; }
    else if (c.ships <= 5) { monthlyLic = 9990; tier = "Fleet"; }
    else if (c.ships <= 10) { monthlyLic = 19990; tier = "Armada"; }
    else { monthlyLic = 19990 + (c.ships - 10) * 1500; tier = "Custom Enterprise"; }
    const annualLic = monthlyLic * 12;
    const totalFT = totalApi + annualLic;
    const paxPerExc = Math.round(c.paxPerShip * (c.paxParticipation / 100));
    const costPP = totalFT / (totalExc * paxPerExc);
    const tradPerExc = c.languages * c.costPerGuideDay;
    const totalTrad = totalExc * tradPerExc;
    return { totalExcursions: totalExc, totalTraditionalCost: totalTrad, totalFintuttoCost: totalFT, annualLicense: annualLic, totalApiCostEur: totalApi, savings: totalTrad - totalFT, savingsPct: ((totalTrad - totalFT) / totalTrad) * 100, costPerPaxPerExcursion: costPP, tierName: tier };
  }

  // Generic segments
  let totalMins, tradCost, label;
  const langs = c.languages || 1;

  if (segment === "stadtfuehrer") {
    totalMins = (c.toursPerMonth || 20) * (c.minutesPerTour || 90) * 12;
    tradCost = 0; // Stadtführer: kein traditioneller Vergleich, zeige stattdessen Preis/Tour
    label = `${c.toursPerMonth} Touren/Mo × ${c.minutesPerTour} Min`;
  } else if (segment === "agentur") {
    const totalTours = (c.guides || 5) * (c.toursPerGuideMonth || 15) * 12;
    totalMins = totalTours * (c.minutesPerTour || 90);
    tradCost = totalTours * langs * (c.costPerGuideDay || 300);
    label = `${c.guides} Guides × ${c.toursPerGuideMonth} Touren/Mo`;
  } else if (segment === "veranstalter") {
    const totalEvents = (c.eventsPerMonth || 4) * 12;
    totalMins = totalEvents * (c.hoursPerEvent || 3) * 60;
    tradCost = totalEvents * langs * (c.costPerInterpreterDay || 1000);
    label = `${c.eventsPerMonth} Events/Mo × ${c.hoursPerEvent}h`;
  } else if (segment === "enterprise") {
    const totalEvents = (c.venues || 3) * (c.eventsPerVenueMonth || 8) * 12;
    totalMins = totalEvents * (c.hoursPerEvent || 4) * 60;
    tradCost = totalEvents * langs * (c.costPerInterpreterDay || 1200);
    label = `${c.venues} Venues × ${c.eventsPerVenueMonth} Events/Mo`;
  } else {
    // fintutto / fallback
    totalMins = (c.minutesPerMonth || 20) * 12;
    tradCost = 0;
    label = `${c.minutesPerMonth || 20} Min/Monat`;
  }

  const totalChars = totalMins * 900 * langs;
  const totalApi = totalChars * (transCost + ttsCost) * 0.92;
  // Suggest tier based on usage
  let monthlyLic = 19, tier = "Starter";
  if (totalMins / 12 > 120) { monthlyLic = 49; tier = "Pro"; }
  if (totalMins / 12 > 500) { monthlyLic = 149; tier = "Business"; }
  if (totalMins / 12 > 2000) { monthlyLic = 499; tier = "Enterprise"; }
  const annualLic = monthlyLic * 12;
  const totalFT = totalApi + annualLic;
  const savings = tradCost > 0 ? tradCost - totalFT : 0;
  const savPct = tradCost > 0 ? (savings / tradCost) * 100 : 0;

  return { totalExcursions: totalMins, totalTraditionalCost: tradCost, totalFintuttoCost: totalFT, annualLicense: annualLic, totalApiCostEur: totalApi, savings, savingsPct: savPct, costPerPaxPerExcursion: totalFT / Math.max(totalMins, 1), tierName: tier, label };
}

export default function Calculator({ onSave, lead }) {
  const { segment } = useParams();
  const navigate = useNavigate();
  const seg = getSegment(segment);
  const ref = useRef(null);

  // Build initial state from segment defaults
  const initState = {};
  seg.calcParams.forEach(p => { initState[p.name] = p.default; });
  if (segment === "kreuzfahrt") initState.ttsQuality = "neural2";

  const [c, setC] = useState(initState);
  const [showResult, setShowResult] = useState(false);
  const [saved, setSaved] = useState(false);

  const result = calculate(segment, c);
  const hasTradComparison = result.totalTraditionalCost > 0;

  const doCalc = () => { setShowResult(true); setSaved(false); setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth" }), 100); };
  const doSave = async () => {
    await onSave({
      name: `${lead?.company || seg.label} — ${result.label || result.tierName}`,
      inputs: { ...c, segment }, ...result,
    });
    setSaved(true);
  };

  const Sl = ({ label, name, min, max, step = 1, unit = "", format: fm }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: T.grayLight, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: seg.color, fontFamily: font }}>
          {fm === "eur" ? fmtEur(c[name]) : `${fmt(c[name])}${unit}`}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={c[name]} onChange={e => { setC({ ...c, [name]: Number(e.target.value) }); setShowResult(false); }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.gray, marginTop: 4 }}>
        <span>{fm === "eur" ? fmtEur(min) : `${fmt(min)}${unit}`}</span>
        <span>{fm === "eur" ? fmtEur(max) : `${fmt(max)}${unit}`}</span>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px 80px" }}>
      <div className="fu" style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: font, fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 700 }}><span style={{ color: seg.color }}>{seg.label}</span> Kalkulator</h2>
        <p style={{ color: T.grayLight, marginTop: 8 }}>Passen Sie die Parameter an Ihre Situation an.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 24 }}>
        {seg.calcGroups.map((group, gi) => (
          <div key={gi} className={`fu${gi + 1}`} style={{ background: T.navyLight, borderRadius: 20, padding: 28, border: `1px solid ${T.navyMid}` }}>
            <h3 style={{ fontFamily: font, fontSize: 18, marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
              <Icon name={group.icon} size={20} color={seg.color} /> {group.title}
            </h3>
            {group.params.map(pName => {
              const p = seg.calcParams.find(cp => cp.name === pName);
              if (!p) return null;
              return <Sl key={p.name} label={p.label} name={p.name} min={p.min} max={p.max} step={p.step || 1} unit={p.unit || ""} format={p.format} />;
            })}
          </div>
        ))}
      </div>

      {/* TTS Quality selector for Kreuzfahrt */}
      {segment === "kreuzfahrt" && (
        <div style={{ marginTop: 16, maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
          <span style={{ fontSize: 13, color: T.grayLight, fontWeight: 500, marginBottom: 8, display: "block" }}>Sprachqualität</span>
          <div style={{ display: "flex", gap: 8 }}>
            {[{ id: "wavenet", l: "WaveNet", s: "Gut" }, { id: "neural2", l: "Neural2", s: "Sehr gut" }, { id: "chirp3", l: "Chirp 3 HD", s: "Premium" }].map(q => (
              <button key={q.id} onClick={() => { setC({ ...c, ttsQuality: q.id }); setShowResult(false); }} style={{
                flex: 1, padding: "10px 8px", borderRadius: 10, cursor: "pointer", textAlign: "center",
                background: c.ttsQuality === q.id ? `${seg.color}15` : T.navyMid,
                border: c.ttsQuality === q.id ? `1px solid ${seg.color}50` : `1px solid transparent`,
                color: c.ttsQuality === q.id ? seg.color : T.grayLight,
              }}><div style={{ fontSize: 13, fontWeight: 600 }}>{q.l}</div><div style={{ fontSize: 10, marginTop: 2 }}>{q.s}</div></button>
            ))}
          </div>
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <button onClick={doCalc} style={{ background: `linear-gradient(135deg, ${seg.color}, ${T.goldDark})`, color: T.navy, border: "none", padding: "16px 48px", borderRadius: 12, fontSize: 18, fontWeight: 700, cursor: "pointer", boxShadow: `0 8px 32px ${seg.color}30`, display: "inline-flex", alignItems: "center", gap: 10 }}>
          <Icon name="chart" size={22} color={T.navy} /> Berechnen
        </button>
      </div>

      {showResult && (
        <div ref={ref} className="fu" style={{ marginTop: 40 }}>
          {/* Savings or Cost Display */}
          <div className="gg" style={{ background: `linear-gradient(135deg, ${seg.color}12, ${seg.color}04)`, border: `1px solid ${seg.color}30`, borderRadius: 24, padding: "40px 32px", textAlign: "center", marginBottom: 24 }}>
            {hasTradComparison ? (
              <>
                <div style={{ fontSize: 14, color: seg.color, textTransform: "uppercase", letterSpacing: 2, fontWeight: 600, marginBottom: 8 }}>Ihre jährliche Ersparnis</div>
                <div style={{ fontFamily: font, fontSize: "clamp(40px, 6vw, 72px)", fontWeight: 800, color: seg.color, lineHeight: 1 }}>{fmtEur(result.savings)}</div>
                <div style={{ fontSize: 18, color: T.green, fontWeight: 600, marginTop: 8 }}>{fmtPct(result.savingsPct)} weniger</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 14, color: seg.color, textTransform: "uppercase", letterSpacing: 2, fontWeight: 600, marginBottom: 8 }}>Ihre Gesamtkosten pro Jahr</div>
                <div style={{ fontFamily: font, fontSize: "clamp(40px, 6vw, 72px)", fontWeight: 800, color: seg.color, lineHeight: 1 }}>{fmtEur(result.totalFintuttoCost)}</div>
                <div style={{ fontSize: 18, color: T.green, fontWeight: 600, marginTop: 8 }}>Empfohlenes Paket: {result.tierName}</div>
              </>
            )}
            <div style={{ fontSize: 14, color: T.grayLight, marginTop: 4 }}>Lizenz {fmtEur(result.annualLicense)} + API {fmtEur(result.totalApiCostEur)}</div>
          </div>

          {hasTradComparison && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
              {[
                { l: "Traditionelle Kosten", v: fmtEur(result.totalTraditionalCost), cl: T.red },
                { l: "GuideTranslator Kosten", v: fmtEur(result.totalFintuttoCost), cl: T.seaLight },
                { l: "Paket", v: result.tierName, cl: seg.color },
              ].map((d, i) => (
                <div key={i} style={{ background: T.navyLight, borderRadius: 16, padding: 24, border: `1px solid ${T.navyMid}`, textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: T.grayLight, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{d.l}</div>
                  <div style={{ fontFamily: font, fontSize: 28, fontWeight: 700, color: d.cl }}>{d.v}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={doSave} disabled={saved} style={{
              background: saved ? T.green : T.navyMid, color: saved ? T.whiteTrue : seg.color,
              border: saved ? "none" : `1px solid ${seg.color}40`, padding: "14px 28px", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: saved ? "default" : "pointer",
              display: "flex", alignItems: "center", gap: 8,
            }}><Icon name={saved ? "check" : "save"} size={18} color={saved ? T.whiteTrue : seg.color} />{saved ? "Gespeichert!" : "Kalkulation speichern"}</button>
            <button onClick={() => navigate(`/${segment}/contact`)} style={{
              background: `linear-gradient(135deg, ${seg.color}, ${T.goldDark})`, color: T.navy, border: "none", padding: "14px 28px", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8,
            }}><Icon name="mail" size={18} color={T.navy} /> Angebot anfordern</button>
          </div>
        </div>
      )}
    </div>
  );
}
