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
# --seed:  Schema (0001), base data / styles / glossary (0002_base),
#          Untappd cache table (0003). Idempotent — safe to re-run.
#          0001 already includes all columns (time, location, url).
#          0004/0005 are legacy upgrade migrations for pre-existing DBs.
# --demo:  Additionally seed example breweries, prices and events (demo.sql).
#          Only useful for staging / development.
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

# Apply DB migrations (--yes skips the interactive confirmation prompt).
# 0004/0005 are intentionally excluded: 0001 already defines all columns.
if [ "$SEED" = true ]; then
  echo "▶ Applying schema..."
  npx wrangler d1 execute "$database_name" --remote --yes --file=migrations/0001_schema.sql
  echo "▶ Seeding base data (styles, glossary)..."
  npx wrangler d1 execute "$database_name" --remote --yes --file=migrations/0002_base.sql
  echo "▶ Applying Untappd cache table..."
  npx wrangler d1 execute "$database_name" --remote --yes --file=migrations/0003_untappd_cache.sql
fi

if [ "$DEMO" = true ]; then
  echo "▶ Seeding demo data (breweries, prices, events)..."
  npx wrangler d1 execute "$database_name" --remote --yes --file=migrations/demo.sql
fi

echo "▶ Worker deployen..."
exec npx wrangler deploy
