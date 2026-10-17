#!/usr/bin/env bash
set -euo pipefail

# ════════════════════════════════════════════════════════════════════════
#  verify.sh — barrière de qualité app-mobile
#
#  Source unique de ce qui est « vert » : lancée par deploy-mobile.sh avant
#  le bump de version et le build, ET par la CI GitHub. Un échec bloque.
#
#  Usage :
#    npm run verify
# ════════════════════════════════════════════════════════════════════════

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; CYAN=$'\033[0;36m'; BOLD=$'\033[1m'; NC=$'\033[0m'

FAILED=()

# Lance une étape et la consigne en échec sans interrompre les suivantes :
# on veut le tableau complet de ce qui casse, pas seulement la première erreur.
step() {
    local label="$1"; shift
    echo ""
    echo "${CYAN}${BOLD}▶ ${label}${NC}"
    if "$@"; then
        echo "${GREEN}✓ ${label}${NC}"
    else
        echo "${RED}✗ ${label}${NC}"
        FAILED+=("$label")
    fi
}

step "mobile · typecheck"       npx tsc --noEmit
step "mobile · lint (erreurs)"  npx eslint . --quiet
step "mobile · tests"           npx jest --ci

echo ""
if [[ ${#FAILED[@]} -gt 0 ]]; then
    echo "${RED}${BOLD}✗ Barrière app-mobile : ${#FAILED[@]} étape(s) en échec${NC}"
    for label in "${FAILED[@]}"; do echo "  ${RED}- ${label}${NC}"; done
    exit 1
fi
echo "${GREEN}${BOLD}✓ Barrière app-mobile : tout est vert${NC}"
