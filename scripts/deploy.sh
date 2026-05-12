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
#   bash scripts/deploy.sh --seed   # Ersteinrichtung: Schema + Seed + Deploy
#
# Migrations-Strategie:
#   Es gibt immer genau zwei kanonische SQL-Dateien:
#     0001_schema.sql  — vollständiges Schema (idempotent)
#     0002_seed.sql    — Seed-Daten (idempotent via INSERT OR IGNORE)
#   Für Neuinstallationen genügt --seed.
#   Für Upgrades bestehender Installationen: einzelne SQL-Anweisungen direkt
#   in der D1-Dashboard-Console ausführen (oder als temporäre Datei).
# ============================================================
set -euo pipefail

: "${database_id:?Bitte database_id als Build-Umgebungsvariable setzen}"
: "${database_name:?Bitte database_name als Build-Umgebungsvariable setzen}"

SEED=false

for arg in "$@"; do
  case "$arg" in
    --seed)    SEED=true ;;
    *) echo "Unbekanntes Argument: $arg" >&2; exit 1 ;;
  esac
done

# D1-Platzhalter in wrangler.toml ersetzen
sed -i \
  -e "s/REPLACE_WITH_YOUR_D1_ID/${database_id}/g" \
  -e "s/REPLACE_WITH_YOUR_D1_NAME/${database_name}/g" \
  wrangler.toml

if [ "$SEED" = true ]; then
  echo "▶ Schema einspielen..."
  npx wrangler d1 execute "$database_name" --remote --yes --file=migrations/0001_schema.sql
  echo "▶ Seed-Daten einspielen..."
  npx wrangler d1 execute "$database_name" --remote --yes --file=migrations/0002_seed.sql
fi

echo "▶ Worker deployen..."
exec npx wrangler deploy
