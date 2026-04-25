#!/usr/bin/env bash
# ============================================================
# Altbieratlas — Deploy-Script für Cloudflare Workers CI
# ============================================================
# Erwartet folgende Build-Umgebungsvariablen im CF-Dashboard
# (Workers → <worker-name> → Settings → Build → Environment):
#
#   D1_DATABASE_ID    — UUID der D1-Datenbank
#   D1_DATABASE_NAME  — Name der D1-Datenbank
#
# Deploy-Command im Cloudflare-Dashboard:
#   bash scripts/deploy.sh
# ============================================================
set -euo pipefail

: "${D1_DATABASE_ID:?Bitte D1_DATABASE_ID als Build-Umgebungsvariable im CF-Dashboard setzen}"
: "${D1_DATABASE_NAME:?Bitte D1_DATABASE_NAME als Build-Umgebungsvariable im CF-Dashboard setzen}"

sed -i \
  -e "s/REPLACE_WITH_YOUR_D1_ID/${D1_DATABASE_ID}/g" \
  -e "s/REPLACE_WITH_YOUR_D1_NAME/${D1_DATABASE_NAME}/g" \
  wrangler.toml

exec npx wrangler versions upload
