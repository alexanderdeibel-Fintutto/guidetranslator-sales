// Vercel Serverless Function — serves the setup HTML page
// Access: GET /api/setup-page

export default function handler(req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(`<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GuideTranslator — Stripe Setup</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0a1628; color: #f0f2f5; font-family: 'Segoe UI', sans-serif; padding: 32px; }
    h1 { font-family: Georgia, serif; margin-bottom: 8px; }
    .sub { color: #6b7a8d; margin-bottom: 32px; }
    .card { background: #132038; border: 1px solid #1a2d4a; border-radius: 16px; padding: 28px; margin-bottom: 20px; }
    label { display: block; color: #c8d6e5; font-size: 14px; margin-bottom: 6px; }
    input { width: 100%; padding: 12px 16px; border-radius: 8px; border: 1px solid #1a2d4a; background: #0d1b30; color: #f0f2f5; font-size: 15px; }
    button { padding: 14px 32px; border-radius: 10px; border: none; font-weight: 700; font-size: 16px; cursor: pointer; margin-top: 16px; }
    .btn-gold { background: linear-gradient(135deg, #c8a84e, #a08030); color: #0a1628; }
    .btn-gold:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-copy { background: #1a2d4a; color: #c8a84e; font-size: 13px; padding: 8px 16px; margin-top: 8px; }
    .btn-seed { background: linear-gradient(135deg, #e74c3c, #c0392b); color: #fff; }
    pre { background: #0d1b30; border: 1px solid #1a2d4a; border-radius: 8px; padding: 16px; overflow-x: auto; font-size: 13px; line-height: 1.6; margin-top: 12px; white-space: pre-wrap; }
    .success { color: #2ecc71; }
    .error { color: #e74c3c; }
    .spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid #c8a84e; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; margin-right: 8px; vertical-align: middle; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .result-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #1a2d4a; font-size: 14px; }
    .result-item:last-child { border-bottom: none; }
    .price-id { color: #c8a84e; font-family: monospace; }
    .warn { background: #2c1810; border: 1px solid #e67e2240; border-radius: 8px; padding: 12px 16px; color: #e67e22; font-size: 13px; margin-bottom: 16px; }
    .section { margin-top: 40px; padding-top: 24px; border-top: 1px solid #1a2d4a; }
    .password-box { background: #1a0a0a; border: 2px solid #e74c3c; border-radius: 8px; padding: 16px; margin-top: 12px; }
    .password-box p { font-size: 14px; color: #f0f2f5; margin-bottom: 4px; }
    .password-box .pw { color: #e74c3c; font-family: monospace; font-size: 16px; font-weight: 700; }
  </style>
</head>
<body>
  <h1>Stripe &amp; Admin Setup</h1>
  <p class="sub">Einmalige Einrichtung — erstellt Stripe-Produkte und Admin-Accounts</p>

  <div class="warn">
    Diese Seite ist nur für die einmalige Einrichtung. Nach Nutzung bitte die Vercel-Umgebungsvariable SEED_SECRET entfernen.
  </div>

  <div class="card">
    <h2 style="margin-bottom: 16px;">1. Stripe-Produkte erstellen</h2>
    <p style="color: #c8d6e5; font-size: 14px; margin-bottom: 16px;">
      Erstellt alle 11 Produkte + Preise in Stripe (6 Abos + 5 Add-Ons). Die Price-IDs müssen in <code>pricing.js</code> eingetragen werden.
    </p>
    <label for="secret1">SEED_SECRET</label>
    <input type="password" id="secret1" placeholder="z.B. gt-seed-admin-einmalig" />
    <button class="btn-gold" id="btnStripe" onclick="runStripeSetup()">Stripe-Produkte erstellen</button>
    <div id="stripeResult"></div>
  </div>

  <div class="card section">
    <h2 style="margin-bottom: 16px;">2. Admin-Accounts anlegen</h2>
    <p style="color: #c8d6e5; font-size: 14px; margin-bottom: 16px;">
      Erstellt Alexander (super_admin) und Ulrich (admin). Passwörter werden <strong>nur einmal</strong> angezeigt!
    </p>
    <label for="secret2">SEED_SECRET</label>
    <input type="password" id="secret2" placeholder="z.B. gt-seed-admin-einmalig" />
    <button class="btn-seed" id="btnSeed" onclick="runSeedAdmin()">Admin-Accounts erstellen</button>
    <div id="seedResult"></div>
  </div>

  <script>
    function escHtml(s) {
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    async function runStripeSetup() {
      var secret = document.getElementById('secret1').value.trim();
      if (!secret) { alert('Bitte SEED_SECRET eingeben'); return; }
      var btn = document.getElementById('btnStripe');
      var result = document.getElementById('stripeResult');
      btn.disabled = true;
      result.innerHTML = '<p style="margin-top:16px"><span class="spinner"></span> Erstelle Produkte in Stripe... (10-20 Sekunden)</p>';
      try {
        var res = await fetch('/api/setup-stripe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret: secret })
        });
        var data = await res.json();
        if (!res.ok) {
          result.innerHTML = '<p class="error" style="margin-top:16px">Fehler: ' + escHtml(data.error || res.statusText) + '</p>';
          btn.disabled = false;
          return;
        }
        var html = '<h3 class="success" style="margin-top:16px">Erfolgreich erstellt!</h3><div style="margin-top:12px">';
        for (var id in data.results) {
          var info = data.results[id];
          if (info.error) {
            html += '<div class="result-item"><span>' + escHtml(id) + '</span><span class="error">' + escHtml(info.error) + '</span></div>';
          } else {
            html += '<div class="result-item"><span>' + escHtml(id) + ' (' + escHtml(info.amount) + ', ' + escHtml(info.type) + ')</span><span class="price-id">' + escHtml(info.priceId) + '</span></div>';
          }
        }
        html += '</div>';
        if (data.pricingJsSnippet) {
          html += '<h3 style="margin-top:24px">pricing.js Snippet:</h3>';
          html += '<pre id="snippet">' + escHtml(data.pricingJsSnippet) + '</pre>';
          html += '<button class="btn-copy" onclick="copyEl(\\'snippet\\')">Snippet kopieren</button>';
        }
        html += '<h3 style="margin-top:24px">Vollständige Antwort (JSON):</h3>';
        html += '<pre id="rawJson">' + escHtml(JSON.stringify(data, null, 2)) + '</pre>';
        html += '<button class="btn-copy" onclick="copyEl(\\'rawJson\\')">JSON kopieren</button>';
        result.innerHTML = html;
      } catch (err) {
        result.innerHTML = '<p class="error" style="margin-top:16px">Netzwerk-Fehler: ' + escHtml(err.message) + '</p>';
        btn.disabled = false;
      }
    }

    async function runSeedAdmin() {
      var secret = document.getElementById('secret2').value.trim();
      if (!secret) { alert('Bitte SEED_SECRET eingeben'); return; }
      var btn = document.getElementById('btnSeed');
      var result = document.getElementById('seedResult');
      btn.disabled = true;
      result.innerHTML = '<p style="margin-top:16px"><span class="spinner"></span> Erstelle Admin-Accounts...</p>';
      try {
        var res = await fetch('/api/seed-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret: secret })
        });
        var data = await res.json();
        if (!res.ok) {
          result.innerHTML = '<p class="error" style="margin-top:16px">Fehler: ' + escHtml(data.error || res.statusText) + '</p>';
          btn.disabled = false;
          return;
        }
        var html = '<h3 class="success" style="margin-top:16px">Admin-Accounts erstellt!</h3>';
        html += '<div class="warn" style="margin-top:12px">ACHTUNG: Passw\\u00f6rter werden nur EINMAL angezeigt. Jetzt sofort sicher abspeichern!</div>';
        var accounts = data.accounts || data.results || [];
        for (var i = 0; i < accounts.length; i++) {
          var acc = accounts[i];
          html += '<div class="password-box">';
          html += '<p><strong>' + escHtml(acc.email) + '</strong> — ' + escHtml(acc.role || '') + ' (' + escHtml(acc.status || '') + ')</p>';
          html += '<p>Passwort: <span class="pw">' + escHtml(acc.password || acc.tempPassword || '(siehe JSON)') + '</span></p>';
          html += '</div>';
        }
        html += '<h3 style="margin-top:24px">Vollständige Antwort:</h3>';
        html += '<pre>' + escHtml(JSON.stringify(data, null, 2)) + '</pre>';
        result.innerHTML = html;
      } catch (err) {
        result.innerHTML = '<p class="error" style="margin-top:16px">Netzwerk-Fehler: ' + escHtml(err.message) + '</p>';
        btn.disabled = false;
      }
    }

    function copyEl(id) {
      navigator.clipboard.writeText(document.getElementById(id).textContent);
    }
  </script>
</body>
</html>`);
}
