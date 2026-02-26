// ─── DESIGN TOKENS ───────────────────────────────────────────
export const T = {
  navy: "#0a1628", navyLight: "#132038", navyMid: "#1a2d4a",
  gold: "#c8a84e", goldLight: "#e8d48e", goldDark: "#a08030",
  sea: "#1a6b8a", seaLight: "#2a9bc0",
  white: "#f0f2f5", whiteTrue: "#ffffff",
  red: "#e74c3c", green: "#27ae60",
  gray: "#6b7a8d", grayLight: "#94a3b8",
};

export const font = `'Playfair Display', Georgia, serif`;
export const fontSans = `'DM Sans', 'Segoe UI', sans-serif`;

// ─── GLOBAL STYLES (inject once) ────────────────────────────
export const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  ::selection{background:${T.gold}40;color:${T.whiteTrue}}
  input,select,textarea{font-family:${fontSans}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
  .fu{animation:fadeUp .7s ease both}.fu1{animation:fadeUp .7s ease .1s both}.fu2{animation:fadeUp .7s ease .2s both}.fu3{animation:fadeUp .7s ease .3s both}.fu4{animation:fadeUp .7s ease .4s both}
  .hl{transition:transform .25s,box-shadow .25s}.hl:hover{transform:translateY(-4px);box-shadow:0 20px 60px rgba(0,0,0,.4)}
  .gg{box-shadow:0 0 40px ${T.gold}15,0 0 80px ${T.gold}08}
  input:focus,select:focus,textarea:focus{outline:none;border-color:${T.gold}!important;box-shadow:0 0 0 3px ${T.gold}20}
  input[type=range]{width:100%;height:6px;-webkit-appearance:none;background:${T.navyMid};border-radius:3px;outline:none;accent-color:${T.gold}}
`;
