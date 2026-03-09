// ─── Eigenes Analytics Tracking ─────────────────────────────
// Sendet Events direkt an die Supabase Edge Function.
// Kein Vercel Drain nötig – funktioniert mit jeder Hosting-Plattform.

const INGEST_URL = import.meta.env.VITE_ANALYTICS_URL
  || 'https://aaefocdqgdgexkcrjhks.supabase.co/functions/v1/analytics-ingest';
const GROUP = import.meta.env.VITE_ANALYTICS_GROUP || 'fintutto';

let lastPath = null;

function getDeviceType() {
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

function getBrowserInfo() {
  const ua = navigator.userAgent;
  let browser = 'other';
  if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Safari/')) browser = 'Safari';

  let os = 'other';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('Linux')) os = 'Linux';

  return { browser, os };
}

function send(payload) {
  const url = `${INGEST_URL}?group=${GROUP}`;
  const body = JSON.stringify(payload);
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
  } else {
    fetch(url, { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {});
  }
}

function baseEvent() {
  const { browser, os } = getBrowserInfo();
  return {
    hostname: window.location.hostname,
    path: window.location.pathname,
    referrer: document.referrer || null,
    deviceType: getDeviceType(),
    os,
    browser,
    timestamp: new Date().toISOString(),
  };
}

// ─── Public API ─────────────────────────────────────────────

export function trackPageview(path) {
  const p = path || window.location.pathname;
  if (p === lastPath) return; // deduplicate
  lastPath = p;
  send({ ...baseEvent(), path: p, type: 'pageview' });
}

export function trackEvent(name, data) {
  send({ ...baseEvent(), type: name, data });
}

export function initTracker() {
  // Nicht tracken in localhost / dev
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return;

  // Initial pageview
  trackPageview();

  // SPA-Navigation via popstate
  window.addEventListener('popstate', () => trackPageview());

  // Patch pushState/replaceState für SPA-Navigation
  const origPush = history.pushState;
  const origReplace = history.replaceState;
  history.pushState = function (...args) {
    origPush.apply(this, args);
    trackPageview();
  };
  history.replaceState = function (...args) {
    origReplace.apply(this, args);
    trackPageview();
  };
}
