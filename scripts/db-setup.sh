#!/usr/bin/env bash
# ============================================================
# Altbieratlas — Database setup
# ============================================================
# Applies schema + base data. With --demo also loads sample
# breweries, prices and events (dev/staging only).
#
# Usage:
#   bash scripts/db-setup.sh [--remote] [--demo]
#
# Options:
#   --remote   Run against the remote D1 database (default: local)
#   --demo     Also load demo data (breweries, prices, events)
#
# Environment:
#   D1_DATABASE_NAME   Name of the D1 database (default: altbieratlas)
#
# Examples:
#   bash scripts/db-setup.sh                    # local, base data only
#   bash scripts/db-setup.sh --demo             # local + demo data
#   bash scripts/db-setup.sh --remote           # remote, base data only (production)
#   bash scripts/db-setup.sh --remote --demo    # remote + demo data (staging)
# ============================================================
set -euo pipefail

REMOTE_FLAG=""
DEMO=false
DB="${D1_DATABASE_NAME:-altbieratlas}"

for arg in "$@"; do
  case "$arg" in
    --remote) REMOTE_FLAG="--remote" ;;
    --demo)   DEMO=true ;;
    *) echo "Unknown argument: $arg" >&2; exit 1 ;;
  esac
done

TARGET="${REMOTE_FLAG:+remote}"
TARGET="${TARGET:-local}"
echo "▶ Target: ${TARGET} · DB: ${DB}${DEMO:+ · incl. demo data}"
echo ""

run() {
  echo "  → $1"
  npx wrangler d1 execute "$DB" $REMOTE_FLAG --file="$1"
}

echo "[1/2] Schema"
run migrations/0001_schema.sql

echo "[2/2] Base data (styles, glossary)"
run migrations/0002_base.sql

if [ "$DEMO" = true ]; then
  echo "[+demo] Breweries, prices, events"
  run migrations/demo.sql
fi

echo ""
echo "✓ Done."
