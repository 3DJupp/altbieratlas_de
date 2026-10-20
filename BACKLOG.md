# Backlog

Offene Punkte, grob nach Wichtigkeit sortiert. Erledigtes wird gelöscht, nicht abgehakt.

## Daten

Stand 2026-10-20.

### Wichtig

- **Pins in der Altstadt nachjustieren.** Mehrere Koordinaten liegen sichtbar daneben:
  Kürzer (`kuerzer-altstadt`) mitten auf der Kurze Straße, Schlüssel (`schluessel`) zu weit
  in der Häuserzeile, Mississippi (`mississippi-d-alt`) und Smiley Club (`smiley-club`) schief,
  Fuchs Benrath (`fuchs-benrath`): Eingang liegt an der Straßen-/Gebäudeecke. Pin jeweils
  auf den Eingang setzen. Hilfe: Der Backfill-Bericht (`place-ids-backfill.json`) bzw. die
  Place-ID-Suche liefern Googles Koordinaten und die Entfernung zur DB, große Abstände
  zeigen weitere Kandidaten.
- **Top 20 Ausgehlokale und Restaurants in Düsseldorf ergänzen**, in denen es Altbier gibt
  (Kneipen, Gastronomie, Restaurants). Nur in die Live-D1, nicht in Seed/Mock, mit
  `status = 'pending'`, DE+EN-Beschreibung; vorher auf Dubletten prüfen.
- **Top 5 je Nachbarstadt ergänzen** (Neuss, Ratingen, Hilden, Krefeld, Mönchengladbach,
  Meerbusch, Erkrath …), gleiche Regeln wie oben.

## Admin-Panel

Abgleich DB-Schema / Admin-API / Admin-UI, Stand 2026-10-18.

### Wichtig

- **„Historisch“ im Ort-Dialog setzen.** `breweries.is_historical` lässt sich nur per D1-Konsole
  ändern; weder `adminUpdateBrewery` (Allow-Liste) noch der Dialog kennen das Feld. Gehört
  zusammen mit dem Nachfolger-Feld („Heute bei …“) in den Dialog.
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

### Sinnvoll

- **Korrektur-Beiträge.** „Freigeben“ markiert eine Korrektur nur als erledigt, ändert aber nichts.
  Hilfreich wäre ein Link zum betroffenen Ort und ein Sprung in dessen Bearbeiten-Dialog.
- **Untappd-Zuordnung korrigieren.** Die Untappd-Brauerei wird per Namenssuche gefunden und
  24 h gecacht; bei falschem Treffer gibt es keine manuelle Untappd-ID und keinen Cache-Reset.
  Optional auch Untappd-Links je Sorte (z. B. „Hannen Alt (2023+)“).
- **Sorten-Seite: Ausschankorte.** Welche Orte eine Sorte führen, lässt sich nur von der Ort-Seite
  aus pflegen. Eine Mehrfachauswahl im Sorten-Dialog spart Klicks, wenn eine Sorte neu an mehrere
  Orte kommt (wie zuletzt Hannen Alt (2023+) bei drei Bolten-Orten).
- **Übersetzungs-Übersicht.** Die Nachfrage beim Speichern verhindert neue Lücken; eine Liste aller
  Objekte mit fehlendem DE oder EN im Dashboard würde alte Lücken sichtbar machen.

### Später

- **Admin-Benutzer verwalten.** Anlegen und Passwort ändern geht nur per
  `scripts/create-admin.mjs`; im Panel gibt es nur den Passwort-Reset per Mail.
- **Rheinderby-Stimmen.** `rival_votes` hat keine Admin-Ansicht (Stand, Zurücksetzen).
- **Digest manuell auslösen.** Der Admin-Digest läuft nur per Cron; ein „Jetzt senden“-Knopf hilft
  beim Testen von Resend.

## Features

- **Bewertungen der Orte über Google Maps.** Untappd ist aktuell unzuverlässig; Google hat für fast
  jeden Ort Sterne und Anzahl der Bewertungen. Idee: Places API (New), Place Details mit den
  Feldern `rating`, `userRatingCount` und `googleMapsUri`, abgefragt über die gespeicherte
  Place-ID je Ort. Vorab zu klären:
  - **Place-ID je Ort:** Einmalig per Text Search aus Name + Adresse ermitteln, im Admin prüfen und
    korrigierbar machen (neue Spalte, z. B. `breweries.google_place_id`). Die vorhandenen
    `maps_url`-Kurzlinks enthalten die ID nicht direkt.
  - **Nutzungsbedingungen:** Google erlaubt das dauerhafte Speichern nur für die Place-ID, nicht
    für Bewertungen. Ob und wie lange der Worker Ratings zwischenspeichern darf (bisher 24 h in D1
    wie bei `untappd_cache`), vor der Umsetzung in den Maps-Platform-Bedingungen nachlesen.
    Anzeige nur mit Google-Attribution.
  - **Kosten:** `rating` gehört zu einem teureren Feld-SKU; Freikontingent und Preis pro Abruf
    prüfen, Abrufe über Cache/Edge-Cache klein halten.
  - **Schlüssel:** Eigenes Secret (z. B. `GOOGLE_PLACES_API_KEY`), serverseitig im Worker,
    auf die Places API beschränkt; nicht der vorhandene `MAP_TILE_API_KEY`.
  - **Anzeige:** Auf der Ortsseite neben bzw. statt Untappd, mit Link zu Google Maps; ohne Key
    oder Place-ID wird nichts angezeigt (wie heute bei Untappd).

- **Öffnungszeiten der Orte.** Laut Search Console wird zu den Altstadt-Brauhäusern oft nach
  „öffnungszeiten“ und „speisekarte“ gesucht (Füchschen, Uerige, Schumacher, Schlüssel), die
  Ortsseiten ranken dafür aber nur auf Position 20 bis 60, weil die Angaben fehlen. Idee:
  - **Schema:** Neue Spalte, z. B. `breweries.opening_hours` als JSON (je Wochentag Von/Bis,
    mehrere Zeitfenster möglich, Ruhetage), plus optionaler Freitext für Ausnahmen (DE und EN).
  - **Pflege:** Eingabe im Admin-Dialog „Bearbeiten“, außerdem als Korrektur-Beitrag über
    `beitragen.html`. Datum der letzten Prüfung mitspeichern, damit veraltete Zeiten auffallen.
  - **Anzeige:** Block auf der Ortsseite mit „Jetzt geöffnet“-Hinweis (Europe/Berlin), im SSR
    mit ausgegeben, damit Crawler die Zeiten sehen.
  - **Strukturierte Daten:** `openingHoursSpecification` im JSON-LD der Ortsseite, damit
    Google und Bing die Zeiten direkt verstehen.
  - **Quelle:** Die Google-Places-Anbindung (Punkt oben) liefert auch `regularOpeningHours`;
    beides zusammen planen, damit die Place-ID nur einmal ermittelt werden muss.

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
  („Fuechschen“); mit einer passenden Schrift entfällt `deUmlaut()`.
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

## Doku

- README, Abschnitt Moderations-Dashboard: „Preise — einsehen, löschen“ ist veraltet, Preise
  lassen sich inzwischen auch bearbeiten.
