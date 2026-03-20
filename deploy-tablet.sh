#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Deploy & configure tablette pour Pro-Win
# Usage: ./deploy-tablet.sh [--install path/to/apk]
# ============================================================

PKG_PROSPECTION="com.aksilsadi.prospection"
PKG_KIOSK="com.prowin.kiosk"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; exit 1; }

# --- Pre-checks ---
command -v adb >/dev/null 2>&1 || fail "adb non trouve dans le PATH"

DEVICE_COUNT=$(adb devices | grep -cw "device" || true)
if [ "$DEVICE_COUNT" -lt 1 ]; then
    fail "Aucune tablette connectee. Verifie la connexion USB et le debogage USB."
fi

DEVICE_MODEL=$(adb shell getprop ro.product.model 2>/dev/null || echo "inconnu")
DEVICE_MANUFACTURER=$(adb shell getprop ro.product.manufacturer 2>/dev/null || echo "inconnu")
ANDROID_VERSION=$(adb shell getprop ro.build.version.release 2>/dev/null || echo "inconnu")
ANDROID_SDK=$(adb shell getprop ro.build.version.sdk 2>/dev/null || echo "inconnu")

echo ""
echo "========================================="
echo " Tablette: $DEVICE_MANUFACTURER $DEVICE_MODEL"
echo " Android:  $ANDROID_VERSION (SDK $ANDROID_SDK)"
echo "========================================="
echo ""

# --- APK Install (optional) ---
if [ "${1:-}" = "--install" ] && [ -n "${2:-}" ]; then
    APK_PATH="$2"
    if [ ! -f "$APK_PATH" ]; then
        fail "APK non trouve: $APK_PATH"
    fi
    echo "Installation de $APK_PATH ..."
    adb install -r "$APK_PATH" && log "APK installe" || fail "Echec installation APK"
    echo ""
fi

# ============================================================
# 1. FIX CRITIQUE: Desactiver "Ne pas conserver les activites"
#    C'est le setting qui detruit les activities en background.
# ============================================================
echo "--- Configuration systeme ---"

ALWAYS_FINISH=$(adb shell settings get global always_finish_activities 2>/dev/null || echo "null")
if [ "$ALWAYS_FINISH" != "0" ]; then
    adb shell settings put global always_finish_activities 0
    log "always_finish_activities force a 0 (etait: $ALWAYS_FINISH)"
else
    log "always_finish_activities deja OK"
fi

# ============================================================
# 2. Desactiver App Standby & Adaptive Battery
# ============================================================
adb shell settings put global app_standby_enabled 0 2>/dev/null
log "App Standby desactive"

adb shell settings put global adaptive_battery_management_enabled 0 2>/dev/null
log "Adaptive Battery desactivee"

# ============================================================
# 3. Desactiver le cached app freezer
# ============================================================
adb shell settings put global cached_apps_freezer disabled 2>/dev/null
log "Cached app freezer desactive"

# ============================================================
# 4. Augmenter les limites de process caches
# ============================================================
adb shell settings put global activity_manager_constants max_cached_processes=64 2>/dev/null
log "Max cached processes = 64"

# ============================================================
# 5. Allonger les timeouts Doze (30 jours)
# ============================================================
adb shell settings put global device_idle_constants \
    inactive_to=2592000000,motion_inactive_to=2592000000,idle_after_inactive_to=2592000000,idle_pending_to=2592000000,max_idle_pending_to=2592000000,idle_to=2592000000,max_idle_to=2592000000 \
    2>/dev/null
log "Doze timeouts allonges (30 jours)"

# ============================================================
# 6. Configurer les deux apps
# ============================================================
echo ""
echo "--- Configuration par app ---"

for PKG in "$PKG_PROSPECTION" "$PKG_KIOSK"; do
    if ! adb shell pm path "$PKG" 2>/dev/null | grep -q "package:"; then
        warn "$PKG non installe - skip"
        continue
    fi

    echo ""
    echo ">> $PKG"

    # Battery optimization whitelist
    adb shell dumpsys deviceidle whitelist +"$PKG" >/dev/null 2>&1
    log "  Ajoute au whitelist batterie"

    # Doze exception whitelist
    adb shell cmd deviceidle except-idle-whitelist +"$PKG" >/dev/null 2>&1
    log "  Ajoute aux exceptions Doze"

    # Autoriser background
    adb shell cmd appops set "$PKG" RUN_IN_BACKGROUND allow 2>/dev/null
    adb shell cmd appops set "$PKG" RUN_ANY_IN_BACKGROUND allow 2>/dev/null
    log "  RUN_IN_BACKGROUND = allow"

    # Autoriser foreground service
    adb shell cmd appops set "$PKG" START_FOREGROUND allow 2>/dev/null
    log "  START_FOREGROUND = allow"

    # Autoriser overlay (pour le bouton flottant du kiosk)
    adb shell cmd appops set "$PKG" SYSTEM_ALERT_WINDOW allow 2>/dev/null
    log "  SYSTEM_ALERT_WINDOW = allow"

    # Autoriser usage stats (requis pour detecter l'app au premier plan -> bouton flottant)
    adb shell appops set "$PKG" GET_USAGE_STATS allow 2>/dev/null
    log "  GET_USAGE_STATS = allow"

    # Standby bucket -> active
    adb shell am set-standby-bucket "$PKG" active 2>/dev/null
    log "  Standby bucket = active"

    # Marquer comme non-inactif
    adb shell cmd activity set-inactive "$PKG" false 2>/dev/null
    log "  Marque comme actif"
done

# ============================================================
# 7. Desactiver le power saver OEM (Spreadtrum/DOOGEE)
# ============================================================
echo ""
echo "--- Nettoyage power saver OEM ---"

OEM_POWER_PKGS="com.sprd.powersavemodelauncher"
for OEM_PKG in $OEM_POWER_PKGS; do
    if adb shell pm path "$OEM_PKG" 2>/dev/null | grep -q "package:"; then
        adb shell pm clear "$OEM_PKG" >/dev/null 2>&1 && \
            log "Power saver OEM ($OEM_PKG) donnees effacees" || \
            warn "Impossible de clear $OEM_PKG"
    fi
done

# ============================================================
# 8. Activer le service d'accessibilite (bouton flottant persistant)
#    Survit au reboot car stocke dans settings_secure.xml (pas appops.xml)
# ============================================================
echo ""
echo "--- Activation bouton flottant (AccessibilityService) ---"

if adb shell pm path "$PKG_KIOSK" 2>/dev/null | grep -q "package:"; then
    adb shell settings put secure enabled_accessibility_services "$PKG_KIOSK/.FloatingButtonService" 2>/dev/null
    adb shell settings put secure accessibility_enabled 1 2>/dev/null
    log "AccessibilityService active pour le bouton flottant"

    VERIFY_A11Y=$(adb shell settings get secure enabled_accessibility_services 2>/dev/null)
    if echo "$VERIFY_A11Y" | grep -q "FloatingButtonService"; then
        log "Verifie: $VERIFY_A11Y"
    else
        warn "AccessibilityService non verifie: $VERIFY_A11Y"
    fi
else
    warn "$PKG_KIOSK non installe - bouton flottant non configure"
fi

# ============================================================
# 9. Verification finale
# ============================================================
echo ""
echo "--- Verification ---"

VERIFY_FINISH=$(adb shell settings get global always_finish_activities 2>/dev/null)
VERIFY_STANDBY=$(adb shell settings get global app_standby_enabled 2>/dev/null)
VERIFY_ADAPTIVE=$(adb shell settings get global adaptive_battery_management_enabled 2>/dev/null)
VERIFY_FREEZER=$(adb shell settings get global cached_apps_freezer 2>/dev/null)

echo ""
echo "  always_finish_activities  = $VERIFY_FINISH (attendu: 0)"
echo "  app_standby_enabled       = $VERIFY_STANDBY (attendu: 0)"
echo "  adaptive_battery          = $VERIFY_ADAPTIVE (attendu: 0)"
echo "  cached_apps_freezer       = $VERIFY_FREEZER (attendu: disabled)"

for PKG in "$PKG_PROSPECTION" "$PKG_KIOSK"; do
    if adb shell pm path "$PKG" 2>/dev/null | grep -q "package:"; then
        BUCKET=$(adb shell am get-standby-bucket "$PKG" 2>/dev/null || echo "?")
        WL=$(adb shell dumpsys deviceidle whitelist 2>/dev/null | grep "$PKG" | head -1 || echo "non")
        echo "  $PKG: bucket=$BUCKET whitelist=$WL"
    else
        echo "  $PKG: non installe"
    fi
done

echo ""
echo "========================================="
echo " Configuration tablette terminee"
echo "========================================="
echo ""
