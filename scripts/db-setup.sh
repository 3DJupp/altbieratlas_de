#!/usr/bin/env bash
# ============================================================
# Altbieratlas — Database setup
# ============================================================
# Applies schema + seed data.
#
# Usage:
#   bash scripts/db-setup.sh [--remote]
#
# Options:
#   --remote   Run against the remote D1 database (default: local)
#
# Environment:
#   D1_DATABASE_NAME   Name of the D1 database (default: altbieratlas)
#
# Examples:
#   bash scripts/db-setup.sh              # local
#   bash scripts/db-setup.sh --remote     # remote (production)
# ============================================================
set -euo pipefail

REMOTE_FLAG=""
DB="${D1_DATABASE_NAME:-altbieratlas}"

for arg in "$@"; do
  case "$arg" in
    --remote) REMOTE_FLAG="--remote" ;;
    *) echo "Unknown argument: $arg" >&2; exit 1 ;;
  esac
done

TARGET="${REMOTE_FLAG:+remote}"
TARGET="${TARGET:-local}"
echo "▶ Target: ${TARGET} · DB: ${DB}"
echo ""

run() {
  echo "  → $1"
  npx wrangler d1 execute "$DB" $REMOTE_FLAG --file="$1"
}

echo "[1/5] Schema (inkl. Events, Event-Biere)"
run migrations/0001_schema.sql

echo "[2/5] Seed data (styles, glossary, breweries, prices, events)"
run migrations/0002_seed.sql

echo "[3/5] Upgrade (venue_types schema, breweries maps_url + FK)"
run migrations/0003_upgrade.sql

echo "[4/5] Site settings table"
run migrations/0004_site_settings.sql

echo "[5/5] Prod cleanup (venue types v0.6.0, neue Brauereien, Events bereinigen)"
run migrations/0005_prod_cleanup.sql

echo ""
echo "✓ Done."
