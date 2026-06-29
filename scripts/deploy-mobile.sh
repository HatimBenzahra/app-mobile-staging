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
shift 2>/dev/null || true

# Options de versioning :
#   --version X.Y.Z   force le versionName (sinon bump auto)
#   --major|--minor|--patch   partie a bumper (defaut: patch)
#   --message "..."   message de release (defaut: dernier sujet de commit)
OVERRIDE_VERSION=""
MESSAGE=""
BUMP_PART="patch"
while [ $# -gt 0 ]; do
  case "$1" in
    --version) OVERRIDE_VERSION="${2:-}"; shift 2 ;;
    --message) MESSAGE="${2:-}"; shift 2 ;;
    --major)   BUMP_PART="major"; shift ;;
    --minor)   BUMP_PART="minor"; shift ;;
    --patch)   BUMP_PART="patch"; shift ;;
    *) shift ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT}"

# ── Couleurs ─────────────────────────────────────────────────────────────
RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; YELLOW=$'\033[1;33m'; CYAN=$'\033[0;36m'; BOLD=$'\033[1m'; NC=$'\033[0m'
log()  { echo "${CYAN}[deploy]${NC} $1"; }
ok()   { echo "${GREEN}[  ok  ]${NC} $1"; }
warn() { echo "${YELLOW}[ warn ]${NC} $1"; }
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

# ── Versioning (bump auto + tracabilite) ─────────────────────────────────
# Source de verite du build = android/app/build.gradle. On mirror dans app.json
# et on genere constants/version.ts (embarque dans le bundle + affiche dans l'UI).
GRADLE="android/app/build.gradle"
[ -f "${GRADLE}" ] || fail "build.gradle introuvable: ${GRADLE}"

# SHA du code AVANT modif (l'etat reellement deploye)
GIT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo nogit)"
{ git diff --quiet 2>/dev/null && git diff --cached --quiet 2>/dev/null; } || GIT_SHA="${GIT_SHA}-dirty"
[ -n "${MESSAGE}" ] || MESSAGE="$(git log -1 --format=%s 2>/dev/null || echo '')"
BUILD_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

CUR_CODE="$(grep -oE 'versionCode[[:space:]]+[0-9]+' "${GRADLE}" | grep -oE '[0-9]+' | head -1)"
CUR_NAME="$(grep -oE 'versionName[[:space:]]+"[^"]+"' "${GRADLE}" | sed -E 's/.*"([^"]+)".*/\1/' | head -1)"
[ -n "${CUR_CODE}" ] || fail "versionCode introuvable dans ${GRADLE}"
NEW_CODE=$(( CUR_CODE + 1 ))

if [ -n "${OVERRIDE_VERSION}" ]; then
  NEW_NAME="${OVERRIDE_VERSION}"
else
  IFS='.' read -r MA MI PA <<< "${CUR_NAME:-0.0.0}"
  MA="${MA:-0}"; MI="${MI:-0}"; PA="${PA:-0}"
  case "${BUMP_PART}" in
    major) MA=$((MA+1)); MI=0; PA=0 ;;
    minor) MI=$((MI+1)); PA=0 ;;
    *)     PA=$((PA+1)) ;;
  esac
  NEW_NAME="${MA}.${MI}.${PA}"
fi

log "Version: ${CUR_NAME} (${CUR_CODE}) -> ${NEW_NAME} (${NEW_CODE}) · ${GIT_SHA} · ${ENV}"

# 1) build.gradle (source du build)
sed -i '' -E "s/versionCode[[:space:]]+[0-9]+/versionCode ${NEW_CODE}/" "${GRADLE}"
sed -i '' -E "s/versionName[[:space:]]+\"[^\"]+\"/versionName \"${NEW_NAME}\"/" "${GRADLE}"

# 2) app.json (coherence + futur expo-updates)
node -e "const fs=require('fs');const p='app.json';const j=JSON.parse(fs.readFileSync(p,'utf8'));j.expo.version='${NEW_NAME}';j.expo.android=j.expo.android||{};j.expo.android.versionCode=${NEW_CODE};fs.writeFileSync(p, JSON.stringify(j,null,2)+'\n');"

# 3) constants/version.ts (embarque dans le bundle + affiche dans l'UI)
cat > constants/version.ts <<EOF
// AUTO-GÉNÉRÉ par scripts/deploy-mobile.sh — ne pas éditer à la main.
export const APP_VERSION = {
  versionName: "${NEW_NAME}",
  versionCode: ${NEW_CODE},
  gitSha: "${GIT_SHA}",
  channel: "${ENV}",
  buildDate: "${BUILD_DATE}",
} as const;

export const APP_VERSION_LABEL = "v" + APP_VERSION.versionName + " (" + APP_VERSION.versionCode + ")";
EOF
ok "Version bumpee + version.ts genere"

# ── Build APK (backend injecte, l'emporte sur .env via @expo/env) ────────
export EXPO_PUBLIC_API_URL="${API_URL}"
log "Build APK release (backend = ${API_URL})..."
log "Nettoyage caches Android sensibles aux chemins absolus..."
rm -rf android/.gradle android/build/generated/autolinking android/app/build

set_gradle_property() {
  local key="$1"
  local value="$2"
  local file="android/gradle.properties"
  local tmp
  tmp="$(mktemp)"
  awk -v key="${key}" -v value="${value}" '
    index($0, key "=") == 1 { print key "=" value; done = 1; next }
    { print }
    END { if (!done) print key "=" value }
  ' "${file}" > "${tmp}"
  mv "${tmp}" "${file}"
}

log "Configuration memoire Gradle pour le build release..."
set_gradle_property "org.gradle.jvmargs" "-Xmx4096m -XX:MaxMetaspaceSize=2048m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8"
set_gradle_property "kotlin.daemon.jvmargs" "-Xmx2048m -XX:MaxMetaspaceSize=1024m -Dfile.encoding=UTF-8"
set_gradle_property "org.gradle.workers.max" "2"

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
  -F appName="${APP_NAME}" \
  -F gitSha="${GIT_SHA}" \
  -F gitMessage="${MESSAGE}" \
  -F channel="${ENV}" > /dev/null \
  || fail "Upload kiosk echoue (APK builde mais non publie)"

# ── Commit + tag de version (tracabilite git) ────────────────────────────
log "Commit + tag de version..."
git add android/app/build.gradle app.json constants/version.ts 2>/dev/null || true
git commit -q -m "chore(mobile): release v${NEW_NAME}+${NEW_CODE} (${ENV}) [${GIT_SHA}]" 2>/dev/null || true
TAG="mobile-v${NEW_NAME}+${NEW_CODE}"
git tag -f "${TAG}" >/dev/null 2>&1 || true
if git push origin HEAD >/dev/null 2>&1 && git push -f origin "${TAG}" >/dev/null 2>&1; then
  ok "Commit + tag ${TAG} pousses sur origin"
else
  warn "Commit + tag ${TAG} crees en local (push manuel a faire si besoin)"
fi

echo ""
echo "${GREEN}${BOLD}  ✓ Deploye sur ${ENV} → ${KIOSK_URL}${NC}"
echo "  App : ${APP_NAME}  |  ${PKG} v${VNAME} (${VCODE})  |  ${GIT_SHA}"
echo "  Tag : ${TAG}"
echo "  Les tablettes seront notifiees automatiquement (OTA)."
echo ""
