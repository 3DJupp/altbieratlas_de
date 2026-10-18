# Backlog

Offene Punkte, grob nach Wichtigkeit sortiert. Erledigtes wird gelöscht, nicht abgehakt.

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

## Doku

- README, Abschnitt Moderations-Dashboard: „Preise — einsehen, löschen“ ist veraltet, Preise
  lassen sich inzwischen auch bearbeiten.
