# Backlog

Offene Punkte, grob nach Wichtigkeit sortiert. Erledigtes wird gelöscht, nicht abgehakt.

## Vorschaubilder und Suchvorschauen

Ziel: Geteilte Links und Suchtreffer zeigen den echten, aktuellen Inhalt der Seite und sehen
nach Altbieratlas aus, nicht nach generischer Vorlage. Stand 2026-10-19.

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
- **Suchvorschauen (Title, Description, JSON-LD) aus aktuellen Daten.** Die Ortsseite setzt
  Title und Description schon dynamisch (inkl. Preis). Prüfen und angleichen: Startseite und
  einige statische Seiten haben feste Beschreibungen; Zahlen wie Anzahl der Orte, Ø-Preis oder
  „zuletzt aktualisiert“ könnten serverseitig einfließen. Bei Orten mit mehreren Sorten die
  Sorte in Description und `Offer` nennen (Grundlage seit `prices.style_id` vorhanden).
  Danach mit dem Rich-Results-Test und einer Link-Vorschau (z. B. WhatsApp, Signal) prüfen.
