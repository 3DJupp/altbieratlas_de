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
#   bash scripts/deploy.sh          # nur Worker deployen (Standard)
#   bash scripts/deploy.sh --seed   # Schema + Seed-Daten + Deploy
#
# --seed: Spielt 0001_schema.sql + 0002_seed.sql ein.
#         Idempotent — kann mehrfach ausgeführt werden.
# ============================================================
set -euo pipefail

: "${database_id:?Bitte database_id als Build-Umgebungsvariable setzen}"
: "${database_name:?Bitte database_name als Build-Umgebungsvariable setzen}"

SEED=false

for arg in "$@"; do
  case "$arg" in
    --seed) SEED=true ;;
    *) echo "Unbekanntes Argument: $arg" >&2; exit 1 ;;
  esac
done

# D1-Platzhalter in wrangler.toml ersetzen
sed -i \
  -e "s/REPLACE_WITH_YOUR_D1_ID/${database_id}/g" \
  -e "s/REPLACE_WITH_YOUR_D1_NAME/${database_name}/g" \
  wrangler.toml

if [ "$SEED" = true ]; then
  echo "▶ Applying schema..."
  npx wrangler d1 execute "$database_name" --remote --yes --file=migrations/0001_schema.sql
  echo "▶ Seeding data (styles, glossary, breweries, prices, events)..."
  npx wrangler d1 execute "$database_name" --remote --yes --file=migrations/0002_seed.sql
  echo "▶ Applying upgrade (venue_types schema, breweries maps_url + FK)..."
  npx wrangler d1 execute "$database_name" --remote --yes --file=migrations/0003_upgrade.sql
  echo "▶ Applying upgrade (mehrtägige Events + Event-Biere)..."
  npx wrangler d1 execute "$database_name" --remote --yes --file=migrations/0004_multiday_events.sql
fi

echo "▶ Worker deployen..."
exec npx wrangler deploy
