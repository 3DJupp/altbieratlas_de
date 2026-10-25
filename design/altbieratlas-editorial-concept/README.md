# Altbieratlas — Designentwurf 01

Statischer Konzeptentwurf für Startseite und reduziertes Atlas-Signet. Er setzt die Leitlinien aus BACKLOG.md um: moderne regionale Identität, warme kontrastreiche Palette, zurückhaltende Typografie, weniger Kästen und echte regionale Fotografie. Keine API- oder Cloudflare-Anbindung.

## Konzeptentscheidungen
- Wortmarke plus Karten-Signet als eigenständige SVG.
- Editorial statt „Bier-Brandboard“: Serifenschrift für Headlines, sachliche Sans für UI, keine dekorativen Mono-Kicker.
- Echte regionale Bildmotive mit sichtbarer Attribution statt generierter Bildwelten.
- Keine Schatten, Glows oder Verläufe im Logo.
- Desktop und mobile Anordnung; Mobilgeräte führen Foto und Inhalt untereinander.
- Beispielzahlen sind Platzhalter aus einem früheren Read-only-Snapshot; produktiv dynamisch aus aktuellen Daten beziehen.

## Bildquellen und Lizenz
1. „Gaststätte und Brauerei Zum Uerige …“ — Foto: giggel, Wikimedia Commons, CC BY 3.0. [Dateiseite/Lizenz](https://commons.wikimedia.org/wiki/File:Gaststaette_und_Brauerei_%22Zum_Uerige%22_in_der_D%C3%BCsseldorfer_Altstadt,_Berger_Stra%C3%9Fe_1_-_panoramio.jpg)
2. „Brauerei Schumacher Oststraße Düsseldorf Germany April 2013 …“ — Foto: calflier001, Wikimedia Commons, CC BY-SA 2.0. [Dateiseite/Lizenz](https://commons.wikimedia.org/wiki/File:Brauerei_Schumacher_Oststra%C3%9Fe_D%C3%BCsseldorf_Germany_April_2013_%288715137352%29.jpg)
3. „Brauerei zum Schlüssel, Altbier“ — Foto: © 1971markus, Wikimedia Commons, CC BY-SA 4.0. [Dateiseite/Lizenz](https://commons.wikimedia.org/wiki/File:Brauerei_zum_Schl%C3%BCssel,_Altbier.jpg)

Bilder werden extern von Wikimedia Commons geladen. Vor Produktion Lizenzbedingungen, Attribution, technische Optimierung und Verfügbarkeit nochmals prüfen. Keine Bilder wurden in Repo oder R2 hochgeladen.

## Unverändert
- Produktionsseiten und BACKLOG.md
- migrations/0002_seed.sql
- Cloudflare Worker, D1 und R2
