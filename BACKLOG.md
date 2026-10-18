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

## Doku

- README, Abschnitt Moderations-Dashboard: „Preise — einsehen, löschen“ ist veraltet, Preise
  lassen sich inzwischen auch bearbeiten.
