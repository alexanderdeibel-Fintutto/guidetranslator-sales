export const fmt = (n) => new Intl.NumberFormat("de-DE").format(Math.round(n));
export const fmtEur = (n) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
export const fmtPct = (n) => `${n.toFixed(1)}%`;
