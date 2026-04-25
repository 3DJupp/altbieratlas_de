#!/usr/bin/env bash
# ============================================================
# Altbieratlas — Datenbank-Setup
# ============================================================
# Spielt Schema + Basisdaten ein. Mit --demo zusätzlich
# Beispiel-Brauereien, Preise und Events (nur für Dev/Staging).
#
# Verwendung:
#   bash scripts/db-setup.sh [--remote] [--demo]
#
# Optionen:
#   --remote   Gegen die Remote-D1-Datenbank ausführen (Standard: lokal)
#   --demo     Zusätzlich Demo-Daten einspielen (Brauereien, Preise, Events)
#
# Umgebungsvariable:
#   D1_DATABASE_NAME   Name der D1-Datenbank (Standard: altbieratlas)
#
# Beispiele:
#   bash scripts/db-setup.sh                    # lokal, nur Basisdaten
#   bash scripts/db-setup.sh --demo             # lokal + Demo-Daten
#   bash scripts/db-setup.sh --remote           # remote, nur Basisdaten (Produktion)
#   bash scripts/db-setup.sh --remote --demo    # remote + Demo-Daten (Staging)
# ============================================================
set -euo pipefail

REMOTE_FLAG=""
DEMO=false
DB="${D1_DATABASE_NAME:-altbieratlas}"

for arg in "$@"; do
  case "$arg" in
    --remote) REMOTE_FLAG="--remote" ;;
    --demo)   DEMO=true ;;
    *) echo "Unbekanntes Argument: $arg" >&2; exit 1 ;;
  esac
done

TARGET="${REMOTE_FLAG:+remote}"
TARGET="${TARGET:-lokal}"
echo "▶ Ziel: ${TARGET} · DB: ${DB}${DEMO:+ · inkl. Demo-Daten}"
echo ""

run() {
  echo "  → $1"
  npx wrangler d1 execute "$DB" $REMOTE_FLAG --file="$1"
}

echo "[1/3] Schema"
run migrations/0001_schema.sql

echo "[2/3] Basisdaten (Stile, Glossar)"
run migrations/0002_base.sql

echo "[3/3] Untappd-Cache-Tabelle"
run migrations/0003_untappd_cache.sql

if [ "$DEMO" = true ]; then
  echo "[+Demo] Brauereien, Preise, Events"
  run migrations/demo.sql
fi

echo ""
echo "✓ Fertig."
