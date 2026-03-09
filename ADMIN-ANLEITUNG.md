# GuideTranslator Admin-Dashboard — Anleitung

## Zugang

**URL:** `https://app.guidetranslator.com/admin`
**Passwort:** `guidetranslator2026`

> Der Admin-Bereich ist nicht auf der Hauptseite verlinkt. Nur wer die URL kennt, kann ihn aufrufen.

---

## Dashboard-Ubersicht

Nach dem Login siehst du:

1. **Stats-Leiste** — Kontakte gesamt, aktive Pipeline, Demo/Angebot, Gewonnen, Kalkulationen
2. **Uberffallige Wiedervorlagen** — Rotes Banner mit Leads, die eine fallige Wiedervorlage haben (klickbar)
3. **Zwei Tabs:** "Kontakte" und "Aktivitat"

---

## Neuen Kontakt anlegen

1. Klicke auf **"+ Kontakt anlegen"**
2. Fulle Name, E-Mail, Unternehmen, Position, Flottengrosse und Telefon aus
3. **"Einladungslink automatisch generieren"** ist standardmassig aktiviert — der Lead bekommt sofort einen personlichen Link
4. Klicke **"Kontakt anlegen"**
5. Der Einladungslink wird angezeigt — kopiere ihn fur deine E-Mail

---

## Lead einladen (E-Mail versenden)

1. In der Kontaktliste: Klicke das **Briefumschlag-Symbol** neben dem Lead
2. Wahle eine **E-Mail-Vorlage** (Ersteinladung, Follow-up, Demo-Einladung)
3. Die Platzhalter `{{name}}`, `{{company}}`, `{{link}}` werden automatisch ersetzt
4. Klicke **"In E-Mail-Client offnen"** oder kopiere Betreff und Text einzeln

### Eigene E-Mail-Vorlagen erstellen:
- Klicke **"+ Neue Vorlage"** im E-Mail-Dialog
- Bearbeite Name, Betreff und Text
- Verwende `{{name}}`, `{{company}}`, `{{link}}` als Platzhalter
- Du kannst Vorlagen auch **duplizieren**, **bearbeiten** oder **loschen**

---

## Pipeline-Management

Jeder Lead durchlauft diese Stufen:

| Stufe | Bedeutung |
|-------|-----------|
| **Neu** | Lead angelegt, noch nicht kontaktiert |
| **Eingeladen** | Einladungslink wurde erstellt/versendet |
| **Registriert** | Lead hat sich uber den Link registriert |
| **Kalkulation** | Lead hat mindestens eine Kalkulation erstellt |
| **Demo geplant** | Demo-Termin vereinbart |
| **Angebot** | Lead hat Angebot angefordert oder du hast eines erstellt |
| **Verhandlung** | In aktiver Verhandlung |
| **Gewonnen** | Deal abgeschlossen |
| **Verloren** | Lead hat abgesagt |

### Stufe andern:
1. Klicke auf einen Lead in der Liste
2. Im Detail-Bereich siehst du die **Pipeline-Stufe** als klickbare Buttons
3. Klicke auf die neue Stufe — wird sofort gespeichert

### Bulk-Anderung:
1. Aktiviere die **Checkboxen** links in der Tabelle
2. Oben erscheint ein goldenes Banner mit **"X ausgewahlt"**
3. Wahle aus dem Dropdown die neue Pipeline-Stufe
4. Alle ausgewahlten Leads werden aktualisiert

---

## Notizen zu einem Lead

1. Offne den Lead (Klick auf die Zeile)
2. Scrolle zu **"Notizen"**
3. Wahle den **Typ**: Notiz, Anruf, E-Mail oder Meeting
4. Schreibe deinen Text und klicke **"Notiz speichern"**
5. Alle Notizen erscheinen chronologisch als Timeline

> Tipp: Halte nach jedem Telefonat oder Meeting eine kurze Notiz fest — so vergisst du nichts.

---

## Wiedervorlagen (Follow-ups)

1. Offne den Lead
2. Scrolle zu **"Wiedervorlage"**
3. Wahle einen Quick-Button: **Morgen**, **In 3 Tagen**, **Nachste Woche**, **In 2 Wochen**
4. Oder entferne eine bestehende Wiedervorlage mit **"Entfernen"**

### Uberffallige Wiedervorlagen:
- Erscheinen als **rotes Banner** oben im Dashboard
- Klicke auf einen Lead im Banner um direkt zu ihm zu springen
- In der Kontaktliste siehst du ein rotes **"uberffallig"** oder goldenes **"anstehend"** unter der letzten Aktivitat

---

## Tags

Tags helfen dir, Leads zu kategorisieren und schnell zu filtern.

### Tags vergeben:
1. Offne den Lead
2. Im Abschnitt **"Tags"** siehst du bestehende Tags und ein **"+Tag"**-Dropdown
3. Wahle einen vordefinierten Tag (VIP, Pilot-Kandidat, AIDA, TUI, MSC, etc.)
4. Tags werden sofort gespeichert

### Tags entfernen:
- Klicke das **"x"** neben dem Tag

---

## Filtern und Suchen

Uber der Kontaktliste findest du:

1. **Suchfeld** — Sucht in Name, E-Mail und Unternehmen
2. **Pipeline-Stufe** — Dropdown zum Filtern nach Stufe
3. **Tag** — Dropdown zum Filtern nach Tag
4. **Wiedervorlagen** — "Uberffallig" oder "Anstehend" filtern
5. **"Filter zurucksetzen"** — Setzt alle Filter auf Standardwerte zuruck

---

## Aktivitats-Ubersicht (Tab "Aktivitat")

Zeigt:
- **Pipeline Funnel** — Balkendiagramm mit der Verteilung aller Leads uber die Pipeline-Stufen
- **Letzte Aktivitaten** — Chronologische Liste der zuletzt aktiven Leads

---

## Typischer Workflow

1. **Neuen Lead anlegen** mit automatischem Einladungslink
2. **E-Mail versenden** uber die Vorlage "Ersteinladung"
3. **Wiedervorlage setzen** auf "In 3 Tagen"
4. **Pipeline-Stufe** auf "Eingeladen" setzen
5. Nach 3 Tagen: Wiedervorlage wird im Banner angezeigt
6. **Follow-up E-Mail** senden uber die Vorlage "Nachfass"
7. Lead registriert sich → Stufe wechselt automatisch zu "Registriert"
8. Lead erstellt Kalkulation → In der Detail-Ansicht sichtbar
9. **Notiz** nach Telefonat hinterlegen
10. Lead fordert Angebot an → Stufe wechselt automatisch zu "Angebot"
11. **Verhandlung** fuhren, Notizen festhalten
12. Deal abschliessen → Stufe auf **"Gewonnen"** setzen

---

## Hinweise

- **Automatische Stufen-Wechsel:** Wenn ein Lead sich registriert oder ein Angebot anfordert, wird die Pipeline-Stufe automatisch aktualisiert.
- **Einladungslinks:** Jeder Link ist einmalig. Du kannst jederzeit einen neuen generieren ("Neuer Link" im Detail-Bereich).
- **Daten sind sicher:** Alle Daten liegen in Supabase (gehostete PostgreSQL-Datenbank). Nichts wird lokal gespeichert.
- **Passwort andern:** Muss uber eine Umgebungsvariable (`VITE_ADMIN_PASSWORD`) in Vercel gesetzt werden.
