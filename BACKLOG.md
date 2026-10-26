# Backlog

Offene Punkte, grob nach Wichtigkeit sortiert. Erledigtes wird gelöscht, nicht abgehakt.

## Design überarbeiten (vor den Vorschaubildern)

Ziel: Die Seite soll eigenständig und nach Altbierkultur aussehen, nicht nach generierter
Vorlage. Kein Relaunch: Seiten, Struktur und Funktionen bleiben. Leitbild sind Getränkekarte,
Bierdeckel und Schänke, umgesetzt modern und zurückhaltend, nicht nostalgisch. Stand 2026-10-26.
Erledigt: Kicker-Labels (Mono, Sperrschrift, Versalien) über Überschriften entfernt.

Vorgehen: zuerst Startseite und Ortsseite umbauen, Vorher/Nachher-Screenshots abstimmen,
dann die übrigen Seiten nachziehen.

- **Schrift.** Newsreader, Inter und JetBrains Mono ersetzen. Eine zeitgemäße Serifenschrift
  nur für Überschriften (nicht verschnörkelt, nicht nach altem Buchdruck), dazu eine ruhige
  Grundschrift. Mono entfällt; Zahlen über Tabellenziffern (`font-variant-numeric:
  tabular-nums`). Muss Umlaute können und sich für Satori in `src/og.js` laden lassen.
- **Weniger Kästen.** Ranglisten und Preislisten wie eine Getränkekarte: Name, Punktlinie,
  Preis, Trennlinien statt gleichförmiger Karten mit Rahmen. Pill-Badges („0,25 L“) und
  Positionsnummern „01 02 03“ ersetzen.
- **Hero der Startseite.** Kein kursives Effektwort, kein schwebender Glas-Kasten über der
  Karte. Konkreter Satz mit echten Zahlen (Orte, Preise, Ø-Preis 0,25 l), serverseitig
  befüllbar. Mobil: Karte zuerst, Hero kompakt darunter.
- **Icons.** Emojis (Kalender, Pin, Link) durch eine kleine, einheitliche SVG-Icon-Reihe
  ersetzen. Platzhalter für Orte und Sorten ohne Logo gestalten (heute Kürzel bzw. leeres
  Quadrat).
- **Farben.** Warme Palette behalten, mehr Kontrast, weniger Beige auf Beige. Header und
  Footer z. B. in dunklem Holzton. Dark Mode mitziehen.
- **Texte.** Footer-Satz („Mit Liebe …“) neu formulieren; Hero-Überschriften der
  Inhaltsseiten ohne kursive Akzentwörter.
- **Fotos.** Echte Fotos (Glas, Schänke) statt Grafik, sofern Rechte vorhanden; Ablage in R2
  oder `public/images`.
- **Event-Seite (`/event`).** Wirkt leer und doppelt: Datum und Ort stehen im Kopf und im
  Details-Kasten noch einmal, darunter viel Leerraum. Biertabelle zeigt leere Spalten
  (Preis „—“, Hinweis leer); nur Spalten mit Inhalt zeigen oder als Getränkekarte setzen.
  Mobil hängt der Trennpunkt „•“ allein am Zeilenende. Emojis (Kalender, Pin) und
  Mono-Labels („Details“, „Biere auf dem Event“) wie überall ersetzen.
- **Unterseiten angleichen.** Breiten uneinheitlich: `/beitragen` und Impressum in schmaler
  Mittelspalte, `/kooperation`, `/staedte`, `/stadt/<slug>` linksbündig über die volle Breite
  mit leerer rechter Hälfte. Eine gemeinsame Inhaltsbreite festlegen.
  `/rivalen` hat noch Kicker („DUS — CGN · 47 km“), kursives Akzentwort im Hero, eine
  Vergleichstabelle komplett in Mono und Emojis bei Fußball/Eishockey. 404 hat noch den
  Kicker „Fehler 404“ und der Footer endet über dem Fensterrand. `/beitragen`: die Tabs
  brechen auf zwei Zeilen um (ein Tab allein in Zeile zwei), Feldlabels in Mono-Versalien.
  Stadtseiten: Links zu anderen Städten als Mono-Pills, Typ-Labels der Karten in Mono.
- **Aufräumen.** Ungenutzte CSS-Regeln und i18n-Schlüssel nach dem Umbau entfernen,
  `PAGE_DATES` aller Seiten aktualisieren.

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
  wie die Seite. Die Pixelschrift kann keine Umlaute, deshalb werden Namen heute umschrieben
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
