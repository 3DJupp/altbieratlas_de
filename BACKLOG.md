# Backlog

Offene Punkte, grob nach Wichtigkeit sortiert. Erledigtes wird gelöscht, nicht abgehakt.

## Design überarbeiten (vor den Vorschaubildern)

Ziel: Die Seite soll eigenständig und nach Altbierkultur aussehen, nicht nach generierter
Vorlage. Kein Relaunch: Seiten, Struktur und Funktionen bleiben. Leitbild sind Getränkekarte,
Bierdeckel und Schänke, umgesetzt modern und zurückhaltend, nicht nostalgisch. Stand 2026-11-06.
Erledigt: Kicker-Labels (Mono, Sperrschrift, Versalien) über Überschriften entfernt. Schrift
ersetzt durch Bitter (Überschriften) und Public Sans (Grundschrift), Mono entfällt, Zahlen
mit Tabellenziffern. Kursive Akzentwörter in den Heros entfernt, 404 und `/rivalen` ohne
Kicker, Footer kurzer Seiten am Fensterrand, Tabs auf `/beitragen` im Raster, Event-Seite
ohne doppelte Angaben und leere Tabellenspalten. Preise einheitlich über `formatEuro()`.
Der Footer-Satz bleibt.

### Vorgehen

1. **Startseite und Ortsseite zuerst.** Vorher/Nachher-Screenshots (Desktop 1280 px,
   Mobil 390 px, hell und dunkel) mit Playwright erzeugen und abstimmen, bevor weitere
   Seiten folgen. Erst wenn diese zwei sitzen, die übrigen Seiten nachziehen.
2. **Pro Schritt ein PR.** Lieber fünf kleine PRs (Farben, Preislisten, Icons, Hero,
   Breiten) als ein großer; jeder mit Screenshots im PR-Text.
3. **Abnahme je Seite:** keine horizontale Scrollleiste bei 360 px, Kontrast Fließtext
   mindestens 4,5 : 1 (WCAG AA) in beiden Themes, keine neuen Konsolenfehler,
   Lighthouse-Performance nicht schlechter als vorher.

### Punkte

- **Weniger Kästen.** Ranglisten und Preislisten wie eine Getränkekarte setzen: Name links,
  Punktlinie (`border-bottom: dotted` oder `leader`-Spanne mit `flex: 1`), Preis rechts in
  Tabellenziffern, Zeilen nur durch Haarlinien (`--rule`) getrennt statt eigener Karte mit
  Rahmen und Schatten. Betroffen: Ranglisten (`/ranglisten`, Teaser auf `/`), Preistabelle
  der Ortsseite (Client und SSR in `serveBrewery()`), Stadtseiten, Event-Biertabelle.
  Pill-Badges („0,25 L“) werden zu einfachem Text in `--ink-muted` hinter dem Namen,
  Positionsnummern „01 02 03“ entfallen oder werden schlichte Ziffern ohne Hintergrund.
  Die Kennzahl-Kacheln oben auf `/ranglisten` (Ø-Preise, Orte, Preismeldungen) bleiben,
  aber ohne Rahmen als Zahlenleiste mit Trennstrichen.
- **Hero der Startseite.** Kein schwebender Glas-Kasten über der Karte. Ein konkreter Satz
  mit echten Zahlen, z. B. „N Orte, M Preise, 0,25 l im Schnitt X €“, serverseitig in
  `SEO.serveIndex()` befüllt (die Zahlen werden dort heute schon für `#avg-price`,
  `#data-points`, `#brewery-count` ersetzt), damit er ohne JavaScript und für Crawler
  stimmt. Mobil: Karte zuerst (mindestens 60 % der Viewporthöhe), Hero kompakt darunter,
  Suchfeld bleibt über der Karte erreichbar.
- **Icons.** Emojis durch eine kleine, einheitliche Inline-SVG-Reihe ersetzen (Strichstärke
  1,5 px, `currentColor`, 16 und 20 px, als `<symbol>` einmal in `shell.js` und per
  `<use href="#i-…">` genutzt, damit kein Extra-Request entsteht). Heute in Gebrauch:
  Kalender, Pin, Link (Startseite), Sterne (Startseite, Ortsseite, Ranglisten, Admin),
  Stift, Haken, Kreuz, Pin (Admin), Sonne und Mond (Theme-Schalter in `shell.js`),
  Haken (`/beitragen`). Bewertungssterne als SVG mit halbem Stern statt Zeichen.
  Platzhalter für Orte ohne Logo (heute zwei Buchstaben auf Kupfer) und Sorten ohne Logo
  (heute leeres Quadrat bzw. `images/logo-fallback.svg`) neu gestalten, z. B.
  Bierdeckel-Kreis mit Initialen, für Sorten ein stilisiertes Altbierglas (Becher ohne
  Henkel, 0,25 l).
- **Farben.** Warme Palette behalten, mehr Kontrast, weniger Beige auf Beige. Heute liegen
  `--bg` `#f3ead8`, `--bg-elev` `#ece0c5` und `--bg-card` `#fbf6ea` sehr nah beieinander
  (Karten heben sich kaum ab), `--ink-muted` `#8a7560` auf `--bg` erreicht nur 3,7 : 1 und
  verfehlt damit AA für normalen Text. Vorschlag: Header und Footer in dunklem Holzton
  (Richtung `#2a1a0c`, Text `--head`), Inhaltsfläche heller, `--ink-muted` dunkler.
  Dark Mode (`html[data-theme="dark"]` in `styles.css`) mitziehen, dort ist `--ink-muted`
  identisch mit Hell und liegt auf `#171310` bei 4,2 : 1, ebenfalls knapp unter AA. Statusfarben der Tags (`.tag.verified` usw.)
  gleich mit prüfen. Kartenpins und der goldene Partner-Pin müssen auf beiden
  Kartenhintergründen (CARTO dunkel, OSM-Fallback gedimmt) unterscheidbar bleiben.
- **Fotos.** Echte Fotos (Glas, Schänke) statt Grafik, nur mit geklärten Rechten (eigene
  Aufnahmen oder schriftliche Freigabe, Urheber im Impressum bzw. als Bildunterschrift).
  Ablage in R2 (`LOGOS`-Bucket, `orte/fotos/`, ausgeliefert über `/photos/…`) oder
  `public/images`. Als WebP/AVIF in zwei Breiten (`srcset`), mit `width`/`height` gegen
  Layoutsprünge, `loading="lazy"` außer im sichtbaren Bereich.
- **Event-Seite (`/event`).** Biertabelle als Getränkekarte setzen (siehe oben);
  Abschnittslabel („Biere auf dem Event“) noch in Versalien mit Sperrschrift.
- **Unterseiten angleichen.** Breiten uneinheitlich: `/beitragen` und Impressum in schmaler
  Mittelspalte (`.container-narrow`, 900 px), `/kooperation`, `/staedte`, `/stadt/<slug>`
  linksbündig über die volle Breite (`.container`, 1400 px) mit leerer rechter Hälfte.
  Festlegen: Textseiten 760 px Lesebreite, Listen- und Kartenseiten 1200 px, eine Variable
  pro Breite in `:root` statt verstreuter `max-width`-Werte.
  Kleine Labels in Versalien mit Sperrschrift (früher Mono) gibt es noch auf vielen Seiten,
  z. B. Feldlabels auf `/beitragen`, Untertitel der Vergleichstabelle auf `/rivalen`,
  Links zu anderen Städten als Pills und Typ-Labels der Karten auf den Stadtseiten.
- **Inline-Styles.** Viele Abstände und Farben stehen als `style="…"` im HTML (Admin rund
  500, Startseite und Ortsseite je gut 20). Für die öffentlichen Seiten beim Umbau in
  Klassen überführen, sonst greifen neue Farben im Dark Mode nicht. Admin nur dort, wo
  es für den Dark Mode nötig ist.
- **Aufräumen.** Ungenutzte CSS-Regeln und i18n-Schlüssel nach dem Umbau entfernen
  (Abgleich per `grep` der Klassen und Schlüssel über `public/`), `PAGE_DATES` aller
  betroffenen Seiten aktualisieren.

## Vorschaubilder und Suchvorschauen

Ziel: Geteilte Links und Suchtreffer zeigen den echten, aktuellen Inhalt der Seite und sehen
nach Altbieratlas aus, nicht nach generischer Vorlage. Die Bildpunkte folgen dem neuen Design
(Schrift, Farben) und kommen deshalb nach der Überarbeitung. Stand 2026-11-06.

Technischer Stand: `src/og.js` rendert mit Satori und resvg (WASM) ein 1200×630-PNG für
`/api/og/ort?id=<slug>`, Schrift ist die Pixelschrift `PressStart2P.ttf`, Cache-Header eine
Stunde (`stale-while-revalidate` einen Tag). Schlägt das Rendern fehl, leitet der Worker per
302 auf das statische `og-image.png` um. Alle anderen Seiten verweisen fest auf
`og-image.png`.

- **Allgemeines `og-image.png` überarbeiten.** Das statische Bild (dunkler Grund,
  Pixel-Glas, Pixelschrift) passt nicht zum heutigen Auftritt (heller Papierton, Bitter und
  Public Sans) und wirkt dünn. Neu gestalten im Stil der Seite, mit echtem Bezug zum
  Inhalt, z. B. Kartenausschnitt mit Pins, Zahl der Orte und Preise oder ein Altbierglas
  als Foto. Bewusst ohne KI-typische Stilmittel (Verläufe, Glow, generische Icons).
  Wichtiger Inhalt innerhalb der mittleren 1200×600 px, weil einige Netzwerke beschneiden;
  Dateigröße unter 300 KB.
- **Dynamisches OG-Bild der Ortsseite im neuen Stil.** Gleiche Schrift und Farben wie die
  Seite: Bitter und Public Sans als statische TTF unter `src/assets` (Satori braucht TTF
  oder OTF, kein WOFF2; nur die nötigen Schnitte, etwa Bitter 600 und Public Sans 400/600,
  damit das Worker-Bundle klein bleibt). Die Pixelschrift kann keine Umlaute, deshalb
  werden Namen heute umschrieben („ue“ statt „ü“); mit der neuen Schrift entfällt
  `deUmlaut()`. Preise im Bild über `formatEuro()` (heute ohne geschütztes Leerzeichen,
  weil die Pixelschrift keins hat; mit neuer Schrift `nbsp` wieder an).
- **Preise im OG-Bild wie auf der Seite.** Heute zeigt das Bild den Durchschnitt aller
  Meldungen je Größe (`AVG(price)`), die Ortsseite aber die jüngste Meldung. Auf dieselbe
  Regel umstellen (jüngste Meldung je Größe und Sorte, Hauptpreis 0,25 l, sonst kleinste
  Größe), sonst widersprechen sich Bild und Seite.
- **Logos ins OG-Bild.** Hat der Ort ein Logo (`breweries.logo_key`, R2), erscheint es im
  Bild; sonst das Logo der wichtigsten Sorte (`styles.logo_key`), sonst der neue
  Platzhalter aus dem Design. Dazu die Sorten des Orts und der aktuelle Preis je Sorte
  (`prices.style_id`). Logos aus R2 im Worker laden und als Data-URL an Satori geben
  (PNG oder JPEG; SVG vorher prüfen, Satori kann nicht jedes SVG), Größe begrenzen
  (z. B. maximal 256 KB, sonst Platzhalter).
- **Cache und Aktualität.** Die Bild-URL bekommt eine Version, z. B.
  `/api/og/ort?id=<slug>&v=<kurzer Hash aus updated_at, letzter Preis-ID und logo_key>`.
  So holen Netzwerke, die Vorschaubilder lange zwischenspeichern, nach einer Preis- oder
  Logoänderung ein neues Bild, und der Worker kann das Bild selbst lange cachen
  (`max-age` eine Woche, Edge-Cache über `src/cache.js`). Rendern ist teuer (WASM, CPU):
  ein Bild pro Version, nie pro Aufruf.
- **Dynamische OG-Bilder für weitere Seiten.** Ein gemeinsames Layout mit Varianten statt
  je Seite eigener Code: Stadtseiten (`/stadt/<slug>`: Zahl der Orte, Ø-Preis 0,25 l),
  Termine (`/event`: Titel, Datum, Ort), Sorten (Logo, Brauerei), Ranglisten (günstigstes
  Alt aktuell), Startseite (Zahl der Orte und Preise). Endpunkt etwa
  `/api/og/<art>?id=…`, in README (API-Tabelle) und den jeweiligen SSR-Handlern
  eintragen; `og:image:width`/`height` und `twitter:image` mitsetzen.
- **Englische Vorschau.** Mit `?lang=en` bleiben Bildtexte deutsch; Bild-URL um die Sprache
  ergänzen (`&lang=en`), Texte aus denselben Quellen wie `i18n.js`.
- **Suchvorschau prüfen.** Nach dem Umbau `title` und `meta description` aller SSR-Seiten
  gegen die Längen der Suchtreffer prüfen (Titel bis etwa 60, Beschreibung bis etwa 155
  Zeichen) und mit dem Rich-Results-Test die JSON-LD-Ausgabe von Orts-, Event- und
  Stadtseiten testen.
- **Abnahme:** Vorschau mit den Debuggern der großen Netzwerke (Facebook Sharing Debugger,
  LinkedIn Post Inspector) und in einem Messenger prüfen, je für eine Ortsseite mit und
  ohne Logo, eine Stadtseite und ein Event.
