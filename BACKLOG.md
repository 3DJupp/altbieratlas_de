# Backlog

Offene Punkte, grob nach Wichtigkeit sortiert. Erledigtes wird gelöscht, nicht abgehakt.

## Daten-Werkzeuge

Inhalte (Orte, Preise, Koordinaten) pflegen die Mitwirkenden über Beiträge und Admin-Panel;
hier stehen nur technische Lücken.

- **Pins prüfen.** Der Place-ID-Probelauf im Admin-Panel zeigt den Abstand zwischen Googles
  Koordinaten und der DB, aber nur für Orte ohne Place ID. Für Orte mit Place ID fehlt eine
  Liste mit großem Abstand, die schiefe Pins ohne Skript sichtbar macht.
- **Mehrere Orte unter einer Google-Adresse.** Teilen sich zwei Einträge einen Google-Ort
  (z. B. zwei Ausschänke unter einem Dach), zeigen beide dieselbe Bewertung. Heute bleibt
  einer bewusst ohne Place ID; eine Kennzeichnung im Admin fehlt.
- **Sorten von `pending`-Produzenten sind öffentlich.** `styles` hat keinen Status; eine neue
  Sorte erscheint auf /sorten, bevor ihr Ort freigegeben ist.

## Admin-Panel

Abgleich DB-Schema / Admin-API / Admin-UI, Stand 2026-10-18.

### Wichtig

- **„Historisch“ im Ort-Dialog setzen.** `breweries.is_historical` lässt sich nur per D1-Konsole
  ändern; weder `adminUpdateBrewery` (Allow-Liste) noch der Dialog kennen das Feld. Gehört
  neben das vorhandene Nachfolger-Feld („Heute bei …“).
- **Nachfolger und Historisch beim Anlegen.** Das Formular „Neuer Ort“ hat weder `successor_id`
  noch `is_historical`; beides geht erst nachträglich über „Bearbeiten“.
- **Schema-Drift `breweries.highlighted`.** Die Spalte existiert in der Live-D1, aber nicht in
  `0001_schema.sql`. `brewRow()` gibt sie nicht aus, die Hervorhebung in `index.html`
  (`b.highlighted`) greift deshalb nie. Entscheiden: ins Schema + API + Admin-Checkbox
  aufnehmen oder in der D1 entfernen.
- **Event-Biere bearbeiten.** API und `api-client.js` haben `updateEventBeer`, das Admin-UI kann
  Biere aber nur anlegen und löschen. Tippfehler oder Preisänderung heißt: löschen und neu anlegen.
- **„Produzent“ bei Typen.** `venue_types.is_producer` steuert u. a. Seed/Mock-Regeln und
  Kopfzeilen, die API nimmt das Feld an, das Admin-UI zeigt und setzt es aber nicht.

### Später

- **Admin-Benutzer verwalten.** Anlegen und Passwort ändern geht nur per
  `scripts/create-admin.mjs`; im Panel gibt es nur den Passwort-Reset per Mail.
- **Rheinderby-Stimmen.** `rival_votes` hat keine Admin-Ansicht (Stand, Zurücksetzen).
- **Digest manuell auslösen.** Der Admin-Digest läuft nur per Cron; ein „Jetzt senden“-Knopf hilft
  beim Testen von Resend.

## Features

- **Öffnungszeiten der Orte.** Laut Search Console wird zu Brauhäusern oft nach
  „öffnungszeiten“ und „speisekarte“ gesucht, die Ortsseiten ranken dafür aber nur auf
  Position 20 bis 60, weil die Angaben fehlen. Idee:
  - **Schema:** Neue Spalte, z. B. `breweries.opening_hours` als JSON (je Wochentag Von/Bis,
    mehrere Zeitfenster möglich, Ruhetage), plus optionaler Freitext für Ausnahmen (DE und EN).
  - **Pflege:** Eingabe im Admin-Dialog „Bearbeiten“, außerdem als Korrektur-Beitrag über
    `beitragen.html`. Datum der letzten Prüfung mitspeichern, damit veraltete Zeiten auffallen.
  - **Anzeige:** Block auf der Ortsseite mit „Jetzt geöffnet“-Hinweis (Europe/Berlin), im SSR
    mit ausgegeben, damit Crawler die Zeiten sehen.
  - **Strukturierte Daten:** `openingHoursSpecification` im JSON-LD der Ortsseite, damit
    Google und Bing die Zeiten direkt verstehen.
  - **Quelle:** Die vorhandene Google-Places-Anbindung (`src/googlePlaces.js`, Place ID je Ort)
    liefert auch `regularOpeningHours`.

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
