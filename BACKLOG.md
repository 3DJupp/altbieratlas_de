# Backlog

Offene Punkte, grob nach Wichtigkeit sortiert. Erledigtes wird gelöscht, nicht abgehakt.

## Design überarbeiten (vor den Vorschaubildern)

Ziel: Die Seite soll eigenständig und nach Altbierkultur aussehen, nicht nach generierter
Vorlage. Kein Relaunch: Seiten, Struktur und Funktionen bleiben. Leitbild sind Getränkekarte,
Bierdeckel und Schänke, umgesetzt modern und zurückhaltend, nicht nostalgisch. Stand 2026-10-30.
Erledigt: Kicker-Labels (Mono, Sperrschrift, Versalien) über Überschriften entfernt. Schrift
ersetzt durch Bitter (Überschriften) und Public Sans (Grundschrift), Mono entfällt, Zahlen
mit Tabellenziffern. Kursive Akzentwörter in den Heros entfernt, 404 und `/rivalen` ohne
Kicker, Footer kurzer Seiten am Fensterrand, Tabs auf `/beitragen` im Raster, Event-Seite
ohne doppelte Angaben und leere Tabellenspalten. Der Footer-Satz bleibt.

Vorgehen: zuerst Startseite und Ortsseite umbauen, Vorher/Nachher-Screenshots abstimmen,
dann die übrigen Seiten nachziehen.

- **Weniger Kästen.** Ranglisten und Preislisten wie eine Getränkekarte: Name, Punktlinie,
  Preis, Trennlinien statt gleichförmiger Karten mit Rahmen. Pill-Badges („0,25 L“) und
  Positionsnummern „01 02 03“ ersetzen.
- **Hero der Startseite.** Kein schwebender Glas-Kasten über der Karte. Konkreter Satz mit echten Zahlen (Orte, Preise, Ø-Preis 0,25 l), serverseitig
  befüllbar. Mobil: Karte zuerst, Hero kompakt darunter.
- **Icons.** Emojis (Kalender, Pin, Link; Startseite, Admin) durch eine kleine, einheitliche SVG-Icon-Reihe
  ersetzen. Platzhalter für Orte und Sorten ohne Logo gestalten (heute Kürzel bzw. leeres
  Quadrat).
- **Farben.** Warme Palette behalten, mehr Kontrast, weniger Beige auf Beige. Header und
  Footer z. B. in dunklem Holzton. Dark Mode mitziehen.
- **Fotos.** Echte Fotos (Glas, Schänke) statt Grafik, sofern Rechte vorhanden; Ablage in R2
  oder `public/images`.
- **Event-Seite (`/event`).** Biertabelle als Getränkekarte setzen; Abschnittslabel („Biere
  auf dem Event“) noch in Versalien mit Sperrschrift.
- **Unterseiten angleichen.** Breiten uneinheitlich: `/beitragen` und Impressum in schmaler
  Mittelspalte, `/kooperation`, `/staedte`, `/stadt/<slug>` linksbündig über die volle Breite
  mit leerer rechter Hälfte. Eine gemeinsame Inhaltsbreite festlegen.
  Kleine Labels in Versalien mit Sperrschrift (früher Mono) gibt es noch auf vielen Seiten,
  z. B. Feldlabels auf `/beitragen`, Untertitel der Vergleichstabelle auf `/rivalen`,
  Links zu anderen Städten als Pills und Typ-Labels der Karten auf den Stadtseiten.
- **Aufräumen.** Ungenutzte CSS-Regeln und i18n-Schlüssel nach dem Umbau entfernen,
  `PAGE_DATES` aller Seiten aktualisieren.

## Euro-Zeichen vor oder nach dem Preis

Die Position des Euro-Zeichens soll konfigurierbar sein („€ 2,90“ oder „2,90 €“). Heute ist sie
uneinheitlich: Das Frontend setzt „€ “ von Hand vor `formatPrice()` (Startseite, Ortsseite,
Stadtseite, Ranglisten, Beitragen, Event, Admin), Server-Texte (`src/seo.js`, Mails in
`src/utils.js`, SSR in `src/routes.js`) schreiben „ €“ dahinter.

- Ein Helfer für Betrag mit Zeichen, z. B. `window.formatEuro()` in `i18n.js` und ein
  Gegenstück im Worker; alle handgeschriebenen „€ “ darauf umstellen.
- Einstellung in `SITE_CONFIG` (z. B. `currencyPosition: "before" | "after"`), per
  `/api/config` ans Frontend. Klären, ob sie je Sprache gelten soll (DE üblich „2,90 €“,
  EN „€2.90“).
- Geschütztes Leerzeichen zwischen Betrag und Zeichen, damit es nicht umbricht.
- Gilt auch für `llms.txt` und später die OG-Bilder. Strukturierte Daten (JSON-LD) bleiben
  davon unberührt.

## Vorschaubilder und Suchvorschauen

Ziel: Geteilte Links und Suchtreffer zeigen den echten, aktuellen Inhalt der Seite und sehen
nach Altbieratlas aus, nicht nach generischer Vorlage. Die Bildpunkte folgen dem neuen Design
(Schrift, Farben) und kommen deshalb nach der Überarbeitung. Stand 2026-10-26.

- **Allgemeines `og-image.png` überarbeiten.** Das statische Bild (dunkler Grund, Pixel-Glas,
  Pixelschrift „Press Start 2P“) passt nicht zum heutigen Auftritt der Seite (heller
  Papierton, Newsreader und Inter) und wirkt dünn. Neu gestalten im Stil der Seite, mit echtem
  Bezug zum Inhalt, z. B. Kartenausschnitt mit Pins, Zahl der Orte und Preise oder ein
  Altbierglas als Foto statt Pixelgrafik. Bewusst ohne KI-typische Stilmittel (Verläufe,
  Glow, generische Icons).
- **Dynamisches OG-Bild der Ortsseite (`src/og.js`) im neuen Stil.** Gleiche Schrift und Farben
  wie die Seite (Bitter und Public Sans als statische TTF unter `src/assets`, laden in Satori
  mit Umlauten). Die Pixelschrift kann keine Umlaute, deshalb werden Namen heute umschrieben
  („ue“ statt „ü“); mit einer passenden Schrift entfällt `deUmlaut()`.
- **Logos ins OG-Bild.** Hat der Ort ein Logo (`breweries.logo_key`, R2), erscheint es im Bild;
  sonst das Logo der wichtigsten Sorte (`styles.logo_key`), sonst ein neutraler Platzhalter.
  Dazu die Sorten des Orts und der aktuelle Preis je Sorte (`prices.style_id`). Klären: Logos
  aus R2 im Worker laden und für Satori einbetten (PNG/SVG, Größe begrenzen), Cache-Key muss
  sich bei Logo- oder Preisänderung ändern.
- **Dynamische OG-Bilder für weitere Seiten.** Heute nutzen alle Seiten außer `/ort/<slug>` das
  statische Bild. Sinnvoll: Stadtseiten (`/stadt/<slug>`: Zahl der Orte, Ø-Preis 0,25 l),
  Termine (`/event`: Titel, Datum, Ort), Sorten (Logo, Brauerei), Ranglisten (günstigstes
  Alt aktuell).
- **Englische Vorschau.** Mit `?lang=en` bleiben Bildtexte deutsch; Bild-URL um die Sprache
  ergänzen.
