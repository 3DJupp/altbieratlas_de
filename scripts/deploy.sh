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
#   bash scripts/deploy.sh --seed       # Ersteinrichtung: Schema + Seed + Upgrade + Deploy
#   bash scripts/deploy.sh --migrate    # bestehende Installation upgraden (0003 + 0004) + Deploy
#
# --seed:    Spielt 0001 (Schema inkl. Events/Event-Biere), 0002 (Seed), 0003 (Upgrade),
#            0004 (site_settings) ein. Für Erstinstallationen oder vollständige Neueinrichtung.
# --migrate: Spielt 0003 (venue_types + maps_url) und 0004 (site_settings) ein (idempotent).
#            Für bestehende Installationen ohne Seed-Daten zu verändern.
# ============================================================
set -euo pipefail

: "${database_id:?Bitte database_id als Build-Umgebungsvariable setzen}"
: "${database_name:?Bitte database_name als Build-Umgebungsvariable setzen}"

SEED=false
MIGRATE=false

for arg in "$@"; do
  case "$arg" in
    --seed)    SEED=true ;;
    --migrate) MIGRATE=true ;;
    *) echo "Unbekanntes Argument: $arg" >&2; exit 1 ;;
  esac
done

# D1-Platzhalter in wrangler.toml ersetzen
sed -i \
  -e "s/REPLACE_WITH_YOUR_D1_ID/${database_id}/g" \
  -e "s/REPLACE_WITH_YOUR_D1_NAME/${database_name}/g" \
  wrangler.toml

if [ "$SEED" = true ]; then
  echo "▶ Applying schema (inkl. Events, Event-Biere)..."
  npx wrangler d1 execute "$database_name" --remote --yes --file=migrations/0001_schema.sql
  echo "▶ Seeding data (styles, glossary, breweries, prices, events)..."
  npx wrangler d1 execute "$database_name" --remote --yes --file=migrations/0002_seed.sql
  echo "▶ Applying upgrade 0003 (venue_types schema, breweries maps_url + FK)..."
  npx wrangler d1 execute "$database_name" --remote --yes --file=migrations/0003_upgrade.sql
  echo "▶ Applying 0004 (site_settings table)..."
  npx wrangler d1 execute "$database_name" --remote --yes --file=migrations/0004_site_settings.sql
fi

if [ "$MIGRATE" = true ]; then
  echo "▶ Applying upgrade 0003 (venue_types schema, breweries maps_url + FK)..."
  npx wrangler d1 execute "$database_name" --remote --yes --file=migrations/0003_upgrade.sql
  echo "▶ Applying 0004 (site_settings table)..."
  npx wrangler d1 execute "$database_name" --remote --yes --file=migrations/0004_site_settings.sql
fi

echo "▶ Worker deployen..."
exec npx wrangler deploy
