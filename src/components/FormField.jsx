import { T } from "../lib/tokens";

export function FormField({ label, name, type = "text", ph, req, opts, value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, color: T.grayLight, fontWeight: 500 }}>{label} {req && <span style={{ color: T.gold }}>*</span>}</label>
      {opts ? (
        <select value={value} onChange={e => onChange(name, e.target.value)} style={{ width: "100%", background: T.navyMid, border: `1px solid ${T.navyMid}`, borderRadius: 10, padding: "12px 16px", color: T.whiteTrue, fontSize: 15 }}>
          <option value="">Bitte wählen...</option>
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={e => onChange(name, e.target.value)} placeholder={ph} style={{ width: "100%", background: T.navyMid, border: `1px solid ${T.navyMid}`, borderRadius: 10, padding: "12px 16px", color: T.whiteTrue, fontSize: 15 }} />
      )}
    </div>
  );
}
