#!/usr/bin/env bash
# ============================================================
# Altbieratlas — Deploy-Script für Cloudflare Workers CI
# ============================================================
# Erwartet folgende Build-Umgebungsvariablen im CF-Dashboard
# (Workers → <worker-name> → Settings → Build → Variables and secrets):
#
#   database_id    — UUID der D1-Datenbank
#   database_name  — Name der D1-Datenbank
#   PRODUCTION_BRANCH (optional) — Branch, der live geht. Standard: main
#   INDEXNOW_KEY   (optional) — derselbe Schlüssel wie das Worker-Secret.
#                  Dann meldet das Script nach jedem Production-Deploy alle
#                  Sitemap-URLs an api.indexnow.org. Fehlt er, nur Warnung.
#   INDEXNOW_HOST  (optional) — Host für die Meldung. Standard: altbieratlas.de
#
# Verwendung:
#   bash scripts/deploy.sh          # nur Worker deployen (Standard)
#   bash scripts/deploy.sh --seed   # Ersteinrichtung: Schema + Seed + Deploy
#
# Schutz vor Branch-Deploys:
#   Workers Builds setzt WORKERS_CI_BRANCH. Ist das nicht der Production-
#   Branch, lädt das Script nur eine Version hoch (wrangler versions upload)
#   und schaltet nichts live, auch kein Seed. So kann ein Build eines
#   Feature-Branches die Produktion nicht mehr überschreiben, selbst wenn
#   das Dashboard das Script als Version command für Branch-Builds nutzt.
#   Lokal (ohne WORKERS_CI_BRANCH) wird wie bisher deployt.
#
# IndexNow nach dem Deploy:
#   Erst wenn https://<host>/<key>.txt im Header x-worker-version die ID der
#   gerade deployten Version liefert (also die neue Version live ausliefert),
#   meldet scripts/indexnow.sh alle Sitemap-URLs. Jeder Fehler dabei ist nur
#   eine Warnung, der Deploy selbst gilt dann trotzdem als erfolgreich.
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

PRODUCTION_BRANCH="${PRODUCTION_BRANCH:-main}"
if [ -n "${WORKERS_CI_BRANCH:-}" ] && [ "$WORKERS_CI_BRANCH" != "$PRODUCTION_BRANCH" ]; then
  echo "▶ Branch '${WORKERS_CI_BRANCH}' ist nicht '${PRODUCTION_BRANCH}': nur Version hochladen, nicht live schalten"
  exec npx wrangler versions upload
fi

if [ "$SEED" = true ]; then
  echo "▶ Schema einspielen..."
  npx wrangler d1 execute "$database_name" --remote --yes --file=migrations/0001_schema.sql
  echo "▶ Seed-Daten einspielen..."
  npx wrangler d1 execute "$database_name" --remote --yes --file=migrations/0002_seed.sql
fi

echo "▶ Worker deployen..."
DEPLOY_LOG="$(mktemp)"
trap 'rm -f "$DEPLOY_LOG"' EXIT
npx wrangler deploy 2>&1 | tee "$DEPLOY_LOG"

# ── IndexNow: alle Sitemap-URLs melden, sobald die neue Version live ist ──
indexnow_after_deploy() {
  local host="${INDEXNOW_HOST:-altbieratlas.de}"
  if [ -z "${INDEXNOW_KEY:-}" ]; then
    echo "⚠ INDEXNOW_KEY ist keine Build-Variable: Sitemap wird nicht an IndexNow gemeldet" >&2
    return 0
  fi
  local version
  version="$(grep -oE 'Current Version ID: [0-9a-f-]+' "$DEPLOY_LOG" | tail -1 | awk '{print $4}')" || true
  if [ -z "$version" ]; then
    echo "⚠ Versions-ID nicht in der wrangler-Ausgabe gefunden: IndexNow-Meldung übersprungen" >&2
    return 0
  fi
  echo "▶ Warte, bis Version $version auf $host live ist..."
  local served="" i
  for i in $(seq 1 36); do  # max. ~3 min
    served="$(curl -fsS -o /dev/null -D - --max-time 10 \
      "https://${host}/${INDEXNOW_KEY}.txt" 2>/dev/null |
      tr -d '\r' | awk -F': *' 'tolower($1) == "x-worker-version" {print $2}')" || true
    [ "$served" = "$version" ] && break
    sleep 5
  done
  if [ "$served" != "$version" ]; then
    echo "⚠ Version $version nach 3 min nicht live (ausgeliefert: ${served:-nichts}): IndexNow-Meldung übersprungen." >&2
    echo "  Nachholen: INDEXNOW_KEY=<key> npm run seo:indexnow" >&2
    return 0
  fi
  echo "▶ Version live, melde Sitemap an IndexNow..."
  bash scripts/indexnow.sh --host "$host" ||
    echo "⚠ IndexNow-Meldung fehlgeschlagen (Deploy ist trotzdem live)" >&2
}
indexnow_after_deploy
