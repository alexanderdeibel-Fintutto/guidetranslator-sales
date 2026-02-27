// Shared email footer with unsubscribe link (DSGVO/CAN-SPAM compliance)

export function emailFooterHtml(email) {
  const year = new Date().getFullYear();
  const appUrl = process.env.APP_URL || "https://sales.guidetranslator.com";
  const unsubscribeUrl = `${appUrl}/login`;
  const encodedEmail = encodeURIComponent(email || "");

  return `
        <tr><td style="text-align:center;padding:24px 0 8px;border-top:1px solid #1a2d4a;margin-top:16px">
          <div style="color:#6b7a8d;font-size:11px;line-height:1.8">
            GuideTranslator &mdash; KI-gest&uuml;tzte Echtzeit-&Uuml;bersetzung
            <br>&copy; ${year} GuideTranslator. Alle Rechte vorbehalten.
            <br>
            <a href="mailto:enterprise@guidetranslator.com" style="color:#6b7a8d;text-decoration:underline">Kontakt</a>
            &nbsp;&middot;&nbsp;
            <a href="${appUrl}/datenschutz" style="color:#6b7a8d;text-decoration:underline">Datenschutz</a>
            &nbsp;&middot;&nbsp;
            <a href="mailto:enterprise@guidetranslator.com?subject=Abmeldung&body=Bitte%20entfernen%20Sie%20mich%20von%20der%20Mailingliste:%20${encodedEmail}" style="color:#6b7a8d;text-decoration:underline">Abmelden</a>
          </div>
        </td></tr>`;
}

export function emailFooterText(email) {
  return `\n---\n© ${new Date().getFullYear()} GuideTranslator. Alle Rechte vorbehalten.\nAbmelden: Antworten Sie auf diese E-Mail mit "Abmelden" oder schreiben Sie an enterprise@guidetranslator.com`;
}
