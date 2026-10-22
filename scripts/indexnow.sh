#!/usr/bin/env bash
# ============================================================
# Altbieratlas — IndexNow-Submit (manuell)
# ============================================================
# Der Worker meldet geänderte Seiten nach jeder Admin-Änderung automatisch
# (src/seo.js → pingIndexNow). Dieses Script ist für die Fälle daneben:
#   • Erst-Anmeldung aller Seiten nach dem Aktivieren des Keys
#   • Nachmeldung nach Direkt-Änderungen in der D1-Console (dort läuft kein
#     Worker-Request, also auch kein automatischer Ping)
#   • gezielte Einzel-URLs
#
# Verwendung:
#   INDEXNOW_KEY=<key> bash scripts/indexnow.sh                 # alle Sitemap-URLs
#   INDEXNOW_KEY=<key> bash scripts/indexnow.sh --dry-run       # nur auflisten
#   INDEXNOW_KEY=<key> bash scripts/indexnow.sh /ort/<slug> /ranglisten
#   INDEXNOW_KEY=<key> bash scripts/indexnow.sh https://altbieratlas.de/
#
# Optionen:
#   --key <key>    Schlüssel (sonst $INDEXNOW_KEY)
#   --host <host>  Zielhost (Standard altbieratlas.de)
#   --dry-run      URLs nur ausgeben, nichts senden
#   --skip-verify  Prüfung der Schlüsseldatei überspringen
#
# api.indexnow.org verteilt die Meldung an alle teilnehmenden Suchmaschinen
# (Bing, Yandex, Seznam, Naver, Yep) — ein Request genügt, pro Engine ist
# keine eigene Anmeldung nötig. Google nimmt an IndexNow nicht teil.
# ============================================================
set -euo pipefail

KEY="${INDEXNOW_KEY:-}"
HOST="altbieratlas.de"
DRY=0
VERIFY=1
TARGETS=()

while [ $# -gt 0 ]; do
  case "$1" in
    --key)         KEY="${2:?--key braucht einen Wert}"; shift 2 ;;
    --host)        HOST="${2:?--host braucht einen Wert}"; shift 2 ;;
    --dry-run)     DRY=1; shift ;;
    --skip-verify) VERIFY=0; shift ;;
    -h|--help)     sed -n '2,29p' "$0"; exit 0 ;;
    -*)            echo "Unbekannte Option: $1" >&2; exit 1 ;;
    *)             TARGETS+=("$1"); shift ;;
  esac
done

: "${KEY:?INDEXNOW_KEY nicht gesetzt (oder --key <key> übergeben)}"
if ! printf '%s' "$KEY" | grep -Eq '^[A-Za-z0-9-]{8,128}$'; then
  echo "Ungültiger Schlüssel: erlaubt sind 8–128 Zeichen aus a-z A-Z 0-9 -" >&2
  exit 1
fi

BASE="https://${HOST}"
KEY_URL="${BASE}/${KEY}.txt"

# 1) Schlüsseldatei muss den Schlüssel im Klartext ausliefern, sonst lehnen
#    die Suchmaschinen die Meldung mit 403 ab.
if [ "$VERIFY" = 1 ]; then
  served="$(curl -fsS --max-time 15 "$KEY_URL" || true)"
  if [ "$served" != "$KEY" ]; then
    echo "Schlüsseldatei $KEY_URL liefert nicht den Schlüssel." >&2
    echo "Secret INDEXNOW_KEY im Cloudflare-Dashboard gesetzt und Worker deployed?" >&2
    exit 1
  fi
  echo "✓ Schlüsseldatei bestätigt: $KEY_URL"
fi

# 2) URL-Liste: entweder die übergebenen Ziele (Pfad oder volle URL) oder
#    alle <loc>-Einträge der Sitemap.
urls=()
if [ "${#TARGETS[@]}" -gt 0 ]; then
  for t in "${TARGETS[@]}"; do
    case "$t" in
      https://*|http://*) urls+=("$t") ;;
      /*)                 urls+=("${BASE}${t}") ;;
      *)                  urls+=("${BASE}/${t}") ;;
    esac
  done
else
  mapfile -t urls < <(
    curl -fsS --max-time 30 "${BASE}/sitemap.xml" |
      tr '>' '>\n' |
      sed -n 's/.*<loc>\([^<]*\)<\/loc.*/\1/p' |
      sed -e 's/&amp;/\&/g' -e 's/&apos;/'"'"'/g' -e 's/&quot;/"/g' |
      awk 'NF && !seen[$0]++'
  )
  [ "${#urls[@]}" -gt 0 ] || { echo "Sitemap lieferte keine URLs." >&2; exit 1; }
fi

echo "${#urls[@]} URL(s) für $HOST:"
printf '  %s\n' "${urls[@]}"
[ "$DRY" = 0 ] || { echo "(--dry-run — nichts gesendet)"; exit 0; }

# 3) In Blöcken senden. IndexNow erlaubt 10 000 URLs pro Request; 1 000
#    halten die Payload klein und die Fehlersuche übersichtlich.
BATCH=1000
total="${#urls[@]}"
i=0
while [ "$i" -lt "$total" ]; do
  chunk=("${urls[@]:i:BATCH}")
  list="$(printf '"%s",' "${chunk[@]}")"
  body="{\"host\":\"${HOST}\",\"key\":\"${KEY}\",\"keyLocation\":\"${KEY_URL}\",\"urlList\":[${list%,}]}"
  code="$(curl -sS -o /dev/stderr -w '%{http_code}' \
    -X POST "https://api.indexnow.org/indexnow" \
    -H 'Content-Type: application/json; charset=utf-8' \
    --data-raw "$body")"
  echo "Block $((i / BATCH + 1)): ${#chunk[@]} URL(s) → HTTP $code"
  case "$code" in
    200) : ;;
    202) echo "  202 = angenommen, Schlüssel wird noch geprüft (normal beim ersten Mal)" ;;
    400) echo "  400 = fehlerhaftes Format" >&2 ;;
    403) echo "  403 = Schlüssel nicht gültig (Schlüsseldatei prüfen)" >&2 ;;
    422) echo "  422 = URLs gehören nicht zu $HOST oder Schlüssel passt nicht" >&2 ;;
    429) echo "  429 = zu viele Anfragen, später erneut versuchen" >&2 ;;
    *)   echo "  unerwarteter Status" >&2 ;;
  esac
  i=$((i + BATCH))
done
