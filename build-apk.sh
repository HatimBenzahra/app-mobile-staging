#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Build APK staging sur le serveur + deploy sur tablette USB
# Usage:
#   ./build-apk.sh                 Build + install + config
#   ./build-apk.sh --skip-build   Utilise le dernier APK local
#   ./build-apk.sh --skip-config  Build + install sans config
# ============================================================

LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Serveur ─────────────────────────────────────────────────
SERVER_HOST="finanssor-data-center-v1.tail446cc0.ts.net"
SERVER_USER="finanssor-data-center-v1"
SERVER_PASS="1522"
SERVER_PATH="~/Applications/pro-win/staging/app-mobile"
RSYNC_SSH="sshpass -p '${SERVER_PASS}' ssh -o StrictHostKeyChecking=no"

# ── Apps ────────────────────────────────────────────────────
PKG_PROSPECTION="com.aksilsadi.prospection.staging"
PKG_KIOSK="com.prowin.kiosk"

# ── Couleurs ────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()  { echo -e "${BLUE}[BUILD]${NC} $1"; }
ok()   { echo -e "${GREEN}[  OK ]${NC} $1"; }
warn() { echo -e "${YELLOW}[ WARN]${NC} $1"; }
fail() { echo -e "${RED}[FAIL ]${NC} $1"; exit 1; }

remote() {
    eval sshpass -p "'${SERVER_PASS}'" ssh -o StrictHostKeyChecking=no "${SERVER_USER}@${SERVER_HOST}" "'$1'" 2>&1
}

SKIP_BUILD=false
SKIP_CONFIG=false
for arg in "$@"; do
    case "$arg" in
        --skip-build) SKIP_BUILD=true ;;
        --skip-config) SKIP_CONFIG=true ;;
    esac
done

APK_NAME="ProWin-Staging-$(date +%Y-%m-%d-%H%M).apk"
APK_LOCAL="${LOCAL_DIR}/${APK_NAME}"

echo ""
echo -e "${BLUE}${BOLD}╔═══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}${BOLD}║       BUILD + DEPLOY TABLETTE (STAGING)    ║${NC}"
echo -e "${BLUE}${BOLD}╚═══════════════════════════════════════════╝${NC}"
echo ""

# ════════════════════════════════════════════════════════════
# ETAPE 1 : Build APK sur le serveur + download
# ════════════════════════════════════════════════════════════

if [[ "$SKIP_BUILD" == false ]]; then
    command -v sshpass &>/dev/null || fail "sshpass non installe. brew install sshpass"

    log "Sync code vers serveur staging..."
    rsync -avz --delete \
        --exclude='.git/' \
        --exclude='node_modules/' \
        --exclude='.env' \
        --exclude='eas.json' \
        --exclude='app.json' \
        --exclude='.expo/' \
        --exclude='android/' \
        --exclude='ios/' \
        --exclude='dist/' \
        --exclude='*.apk' \
        --exclude='.DS_Store' \
        --exclude='excalidraw.log' \
        -e "${RSYNC_SSH}" \
        "${LOCAL_DIR}/" \
        "${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/" \
        || fail "Sync echoue"
    ok "Code synced"

    log "Build APK sur le serveur..."
    remote "cd ${SERVER_PATH} && npx expo run:android --no-install" \
        || fail "Build APK echoue"
    ok "APK builde"

    log "Download APK..."
    latest_apk=$(remote "ls -t ${SERVER_PATH}/build-*.apk 2>/dev/null | head -1")
    if [[ -z "$latest_apk" ]]; then
        fail "Pas d'APK trouve sur le serveur"
    fi

    rsync -avz \
        -e "${RSYNC_SSH}" \
        "${SERVER_USER}@${SERVER_HOST}:${latest_apk}" \
        "${APK_LOCAL}" \
        || fail "Download echoue"
    ok "APK → ${APK_NAME}"
else
    APK_LOCAL=$(ls -t "${LOCAL_DIR}"/ProWin-Staging-*.apk 2>/dev/null | head -1 || true)
    if [[ -z "$APK_LOCAL" ]]; then
        fail "Pas d'APK local trouve. Lance sans --skip-build."
    fi
    APK_NAME=$(basename "$APK_LOCAL")
    ok "APK existant → ${APK_NAME}"
fi

# ════════════════════════════════════════════════════════════
# ETAPE 2 : Attendre la tablette USB
# ════════════════════════════════════════════════════════════

echo ""
command -v adb >/dev/null 2>&1 || fail "adb non trouve dans le PATH"

DEVICE_COUNT=$(adb devices | grep -cw "device" || true)
if [ "$DEVICE_COUNT" -lt 1 ]; then
    log "En attente d'une tablette USB... (branche-la)"
    while true; do
        DEVICE_COUNT=$(adb devices | grep -cw "device" || true)
        if [ "$DEVICE_COUNT" -ge 1 ]; then
            break
        fi
        sleep 2
    done
fi

DEVICE_MODEL=$(adb shell getprop ro.product.model 2>/dev/null || echo "inconnu")
DEVICE_MANUFACTURER=$(adb shell getprop ro.product.manufacturer 2>/dev/null || echo "inconnu")
ANDROID_VERSION=$(adb shell getprop ro.build.version.release 2>/dev/null || echo "inconnu")

echo ""
echo "========================================="
echo " Tablette: $DEVICE_MANUFACTURER $DEVICE_MODEL"
echo " Android:  $ANDROID_VERSION"
echo "========================================="
echo ""

# ════════════════════════════════════════════════════════════
# ETAPE 3 : Installer l'APK
# ════════════════════════════════════════════════════════════

log "Installation de ${APK_NAME}..."
adb install -r "$APK_LOCAL" && ok "APK installe" || fail "Echec installation"

# ════════════════════════════════════════════════════════════
# ETAPE 4 : Configurer la tablette
# ════════════════════════════════════════════════════════════

if [[ "$SKIP_CONFIG" == false ]]; then
    echo ""
    echo "--- Configuration systeme ---"

    ALWAYS_FINISH=$(adb shell settings get global always_finish_activities 2>/dev/null || echo "null")
    if [ "$ALWAYS_FINISH" != "0" ]; then
        adb shell settings put global always_finish_activities 0
        ok "always_finish_activities = 0 (etait: $ALWAYS_FINISH)"
    else
        ok "always_finish_activities deja OK"
    fi

    adb shell settings put global app_standby_enabled 0 2>/dev/null
    ok "App Standby desactive"

    adb shell settings put global adaptive_battery_management_enabled 0 2>/dev/null
    ok "Adaptive Battery desactivee"

    adb shell settings put global cached_apps_freezer disabled 2>/dev/null
    ok "Cached app freezer desactive"

    adb shell settings put global activity_manager_constants max_cached_processes=64 2>/dev/null
    ok "Max cached processes = 64"

    adb shell settings put global device_idle_constants \
        inactive_to=2592000000,motion_inactive_to=2592000000,idle_after_inactive_to=2592000000,idle_pending_to=2592000000,max_idle_pending_to=2592000000,idle_to=2592000000,max_idle_to=2592000000 \
        2>/dev/null
    ok "Doze timeouts allonges"

    echo ""
    echo "--- Configuration par app ---"

    for PKG in "$PKG_PROSPECTION" "$PKG_KIOSK"; do
        if ! adb shell pm path "$PKG" 2>/dev/null | grep -q "package:"; then
            warn "$PKG non installe - skip"
            continue
        fi

        echo ""
        echo ">> $PKG"

        adb shell dumpsys deviceidle whitelist +"$PKG" >/dev/null 2>&1
        ok "  Whitelist batterie"

        adb shell cmd deviceidle except-idle-whitelist +"$PKG" >/dev/null 2>&1
        ok "  Exception Doze"

        adb shell cmd appops set "$PKG" RUN_IN_BACKGROUND allow 2>/dev/null
        adb shell cmd appops set "$PKG" RUN_ANY_IN_BACKGROUND allow 2>/dev/null
        ok "  RUN_IN_BACKGROUND = allow"

        adb shell cmd appops set "$PKG" START_FOREGROUND allow 2>/dev/null
        ok "  START_FOREGROUND = allow"

        adb shell cmd appops set "$PKG" SYSTEM_ALERT_WINDOW allow 2>/dev/null
        ok "  SYSTEM_ALERT_WINDOW = allow"

        adb shell appops set "$PKG" GET_USAGE_STATS allow 2>/dev/null
        ok "  GET_USAGE_STATS = allow"

        adb shell am set-standby-bucket "$PKG" active 2>/dev/null
        ok "  Standby bucket = active"

        adb shell cmd activity set-inactive "$PKG" false 2>/dev/null
        ok "  Marque comme actif"
    done

    echo ""
    echo "--- Bouton flottant ---"

    if adb shell pm path "$PKG_KIOSK" 2>/dev/null | grep -q "package:"; then
        adb shell settings put secure enabled_accessibility_services "$PKG_KIOSK/.FloatingButtonService" 2>/dev/null
        adb shell settings put secure accessibility_enabled 1 2>/dev/null
        ok "AccessibilityService active"
    else
        warn "$PKG_KIOSK non installe - bouton flottant non configure"
    fi

    echo ""
    echo "--- Nettoyage OEM ---"

    if adb shell pm path "com.sprd.powersavemodelauncher" 2>/dev/null | grep -q "package:"; then
        adb shell pm clear "com.sprd.powersavemodelauncher" >/dev/null 2>&1 && \
            ok "Power saver OEM nettoye" || warn "Impossible de clear power saver OEM"
    fi
fi

# ════════════════════════════════════════════════════════════
# TERMINE
# ════════════════════════════════════════════════════════════

echo ""
echo -e "${GREEN}${BOLD}╔═══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║       DEPLOY TABLETTE TERMINE              ║${NC}"
echo -e "${GREEN}${BOLD}╚═══════════════════════════════════════════╝${NC}"
echo ""
echo -e "  APK     : ${CYAN}${APK_NAME}${NC}"
echo -e "  Tablette: ${CYAN}${DEVICE_MANUFACTURER} ${DEVICE_MODEL}${NC}"
echo ""
