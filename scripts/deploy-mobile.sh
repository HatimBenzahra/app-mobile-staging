#!/usr/bin/env bash
set -euo pipefail

# ════════════════════════════════════════════════════════════════════════
#  deploy-mobile.sh <staging|prod>
#
#  Build l'APK avec le BON backend et le pousse sur le kiosk OTA correspondant.
#  Le backend est determine par la cible — PLUS JAMAIS edite a la main.
#
#  Usage :
#    npm run deploy:staging     (ou ./scripts/deploy-mobile.sh staging)
#    npm run deploy:prod        (ou ./scripts/deploy-mobile.sh prod)
#
#  Credentials kiosk : lus depuis .env.local (gitignore). Voir plus bas.
# ════════════════════════════════════════════════════════════════════════

ENV="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT}"

# ── Couleurs ─────────────────────────────────────────────────────────────
RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; YELLOW=$'\033[1;33m'; CYAN=$'\033[0;36m'; BOLD=$'\033[1m'; NC=$'\033[0m'
log()  { echo "${CYAN}[deploy]${NC} $1"; }
ok()   { echo "${GREEN}[  ok  ]${NC} $1"; }
fail() { echo "${RED}[error ]${NC} $1"; exit 1; }

# ── Cible → backend + kiosk ──────────────────────────────────────────────
case "${ENV}" in
  staging)
    API_URL="https://api-staging.pro-win.app"
    KIOSK_URL="https://kiosk-staging.pro-win.app"
    APP_NAME="ProWin Staging"
    ;;
  prod|production)
    ENV="prod"
    API_URL="https://api.pro-win.app"
    KIOSK_URL="https://kiosk-ota.winaity.com"
    APP_NAME="ProWin"
    ;;
  *)
    fail "Usage: $0 <staging|prod>"
    ;;
esac

# ── Credentials kiosk (hors git) ─────────────────────────────────────────
# Mettre dans .env.local (gitignore) :
#   KIOSK_USER=admin
#   KIOSK_PASS=...
[ -f .env.local ] && set -a && . ./.env.local && set +a
KIOSK_USER="${KIOSK_USER:-}"
KIOSK_PASS="${KIOSK_PASS:-}"
[ -n "${KIOSK_USER}" ] && [ -n "${KIOSK_PASS}" ] || \
  fail "KIOSK_USER/KIOSK_PASS absents. Ajoute-les dans ${ROOT}/.env.local"

# ── Confirmation PROD ────────────────────────────────────────────────────
echo ""
echo "${BOLD}Cible    :${NC} ${ENV}"
echo "${BOLD}Backend  :${NC} ${API_URL}"
echo "${BOLD}Kiosk    :${NC} ${KIOSK_URL}"
echo ""
if [ "${ENV}" = "prod" ]; then
  echo "${RED}${BOLD}  /!\\  DEPLOIEMENT PRODUCTION  /!\\${NC}"
  read -r -p "  Confirmer le deploiement en PROD ? [oui/non] > " confirm
  [ "${confirm}" = "oui" ] || fail "Annule (tape 'oui' en entier)"
fi

# ── Build APK (backend injecte, l'emporte sur .env via @expo/env) ────────
export EXPO_PUBLIC_API_URL="${API_URL}"
log "Build APK release (backend = ${API_URL})..."
rm -rf android/app/build/outputs
( cd android && ./gradlew :app:assembleRelease ) || fail "Build gradle echoue"

APK="$(find android/app/build/outputs -name '*.apk' -type f | head -1)"
[ -n "${APK}" ] || fail "Aucun APK trouve apres le build"
ok "APK builde : ${APK}"

# ── Push kiosk OTA ───────────────────────────────────────────────────────
log "Inspection de l'APK par le kiosk..."
META="$(curl -sf -u "${KIOSK_USER}:${KIOSK_PASS}" -X POST "${KIOSK_URL}/api/releases/inspect" -F apk=@"${APK}")" \
  || fail "Inspect kiosk echoue (verifie credentials/URL)"
PKG="$(echo "${META}"   | python3 -c "import sys,json; print(json.load(sys.stdin)['metadata']['packageName'])")"
VCODE="$(echo "${META}" | python3 -c "import sys,json; print(json.load(sys.stdin)['metadata']['versionCode'])")"
VNAME="$(echo "${META}" | python3 -c "import sys,json; print(json.load(sys.stdin)['metadata']['versionName'])")"
log "Package=${PKG}  version=${VNAME} (${VCODE})"

log "Upload de la release sur le kiosk..."
curl -sf -u "${KIOSK_USER}:${KIOSK_PASS}" -X POST "${KIOSK_URL}/api/releases" \
  -F apk=@"${APK}" \
  -F packageName="${PKG}" \
  -F versionCode="${VCODE}" \
  -F versionName="${VNAME}" \
  -F appName="${APP_NAME}" > /dev/null \
  || fail "Upload kiosk echoue (APK builde mais non publie)"

echo ""
echo "${GREEN}${BOLD}  ✓ Deploye sur ${ENV} → ${KIOSK_URL}${NC}"
echo "  App : ${APP_NAME}  |  ${PKG} v${VNAME} (${VCODE})"
echo "  Les tablettes seront notifiees automatiquement (OTA)."
echo ""
