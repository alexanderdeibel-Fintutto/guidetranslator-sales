import { T } from "../lib/tokens";

export function Icon({ name, size = 20, color = T.gold }) {
  const p = {
    ship: <path d="M3 17h1l1-5h14l1 5h1a1 1 0 010 2H2a1 1 0 010-2zm3-8h12v3H6V9zm2-4h8v3H8V5z"/>,
    globe: <><circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeWidth="1.5"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z" fill="none" stroke={color} strokeWidth="1.5"/></>,
    money: <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"/>,
    chart: <path d="M3 3v18h18M7 16l4-4 4 4 5-6" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>,
    users: <><circle cx="9" cy="7" r="4" fill="none" stroke={color} strokeWidth="1.5"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" fill="none" stroke={color} strokeWidth="1.5"/><circle cx="19" cy="7" r="3" fill="none" stroke={color} strokeWidth="1.5"/><path d="M21 21v-2a3 3 0 00-2-3" fill="none" stroke={color} strokeWidth="1.5"/></>,
    check: <path d="M5 13l4 4L19 7" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>,
    arrow: <path d="M5 12h14M12 5l7 7-7 7" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>,
    save: <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zM17 21v-8H7v8M7 3v5h8" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>,
    calc: <><rect x="4" y="2" width="16" height="20" rx="2" fill="none" stroke={color} strokeWidth="1.5"/><path d="M8 6h8M8 10h2M14 10h2M8 14h2M14 14h2M8 18h8" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></>,
    mail: <><rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke={color} strokeWidth="1.5"/><path d="M22 4l-10 8L2 4" fill="none" stroke={color} strokeWidth="1.5"/></>,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2" fill="none" stroke={color} strokeWidth="1.5"/><path d="M7 11V7a5 5 0 0110 0v4" fill="none" stroke={color} strokeWidth="1.5"/></>,
    mic: <><rect x="9" y="1" width="6" height="12" rx="3" fill="none" stroke={color} strokeWidth="1.5"/><path d="M5 10a7 7 0 0014 0M12 17v4M8 21h8" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2" fill="none" stroke={color} strokeWidth="1.5"/><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></>,
    play: <path d="M5 3l14 9-14 9V3z" fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>,
    home: <><path d="M3 12l9-9 9 9" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 10v10a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1V10" fill="none" stroke={color} strokeWidth="1.5"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none">{p[name]}</svg>;
}
