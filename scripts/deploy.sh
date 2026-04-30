#!/usr/bin/env bash
# ============================================================
# Altbieratlas — Deploy-Script für Cloudflare Workers CI
# ============================================================
# Erwartet folgende Build-Umgebungsvariablen im CF-Dashboard
# (Workers → <worker-name> → Settings → Build → Variables and secrets):
#
#   database_id    — UUID der D1-Datenbank
#   database_name  — Name der D1-Datenbank
#
# Verwendung:
#   bash scripts/deploy.sh              # nur Worker deployen (Standard)
#   bash scripts/deploy.sh --seed       # Schema + Basisdaten + Deploy
#   bash scripts/deploy.sh --seed --demo # Schema + Basis + Demo-Daten + Deploy
#
# --seed:  Schema (0001), Basisdaten/Stile/Glossar (0002_base),
#          Untappd-Cache-Tabelle (0003), Event-Uhrzeit (0004),
#          Event-Ort/-URL (0005) einspielen — idempotent, sicher
# --demo:  Zusätzlich Beispiel-Brauereien, Preise und Events (demo.sql)
#          — nur für Staging/Dev sinnvoll
# ============================================================
set -euo pipefail

: "${database_id:?Bitte database_id als Build-Umgebungsvariable setzen}"
: "${database_name:?Bitte database_name als Build-Umgebungsvariable setzen}"

SEED=false
DEMO=false

for arg in "$@"; do
  case "$arg" in
    --seed) SEED=true ;;
    --demo) DEMO=true ;;
    *) echo "Unbekanntes Argument: $arg" >&2; exit 1 ;;
  esac
done

# D1-Platzhalter in wrangler.toml ersetzen
sed -i \
  -e "s/REPLACE_WITH_YOUR_D1_ID/${database_id}/g" \
  -e "s/REPLACE_WITH_YOUR_D1_NAME/${database_name}/g" \
  wrangler.toml

# Optional: DB-Migrations einspielen (--yes überspringt interaktive Bestätigung)
if [ "$SEED" = true ]; then
  echo "▶ Schema einspielen..."
  npx wrangler d1 execute "$database_name" --remote --yes --file=migrations/0001_schema.sql
  echo "▶ Basisdaten einspielen (Stile, Glossar)..."
  npx wrangler d1 execute "$database_name" --remote --yes --file=migrations/0002_base.sql
  echo "▶ Untappd-Cache-Tabelle einspielen..."
  npx wrangler d1 execute "$database_name" --remote --yes --file=migrations/0003_untappd_cache.sql
  echo "▶ Event-Uhrzeit-Spalte hinzufügen..."
  npx wrangler d1 execute "$database_name" --remote --yes --file=migrations/0004_event_time.sql
  echo "▶ Event-Ort und URL hinzufügen..."
  npx wrangler d1 execute "$database_name" --remote --yes --file=migrations/0005_event_location_url.sql
fi

if [ "$DEMO" = true ]; then
  echo "▶ Demo-Daten einspielen (Brauereien, Preise, Events)..."
  npx wrangler d1 execute "$database_name" --remote --yes --file=migrations/demo.sql
fi

echo "▶ Worker deployen..."
exec npx wrangler deploy
