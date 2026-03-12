#!/bin/bash
# ============================================================
# Vercel Analytics Drain Setup Script
#
# Erstellt Analytics Drains für alle Fintutto/Translator Apps
# und zeigt sie auf einen zentralen Ingest-Endpoint.
#
# Voraussetzungen:
#   1. Vercel API Token: https://vercel.com/account/tokens
#   2. Analytics muss pro Projekt aktiviert sein (Dashboard → Analytics → Enable)
#   3. Der Ingest-Endpoint muss erreichbar sein
#
# Usage:
#   export VERCEL_TOKEN="dein-token"
#   export VERCEL_TEAM_ID="team_xxx"  # Fintutto Team ID
#   bash scripts/setup-analytics-drains.sh
# ============================================================

set -euo pipefail

VERCEL_TOKEN="${VERCEL_TOKEN:?Bitte VERCEL_TOKEN setzen: export VERCEL_TOKEN=xxx}"
VERCEL_TEAM_ID="${VERCEL_TEAM_ID:?Bitte VERCEL_TEAM_ID setzen: export VERCEL_TEAM_ID=team_xxx}"

# --- Zentrale Endpoints (anpassen!) ---
TRANSLATOR_ENDPOINT="https://admin.fintutto.cloud/api/analytics/translator"
FINTUTTO_ENDPOINT="https://admin.fintutto.cloud/api/analytics/fintutto"

# --- Translator Projekte ---
TRANSLATOR_PROJECTS=(
  "translator"
  "guidetranslator-sales"
)

# --- Fintutto Projekte ---
FINTUTTO_PROJECTS=(
  "cloud"
  "fintutto-command-center"
  "hausmeisterPro"
  "luggageX"
  "Personaltrainer"
  "portal"
  "vermietify_final"
  "zimmerpflanze"
  "fintutto-your-financial-compass"
  "ablesung"
  "admin"
  "bescheidboxer"
  "mieter"
)

# Farben
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "============================================"
echo " Vercel Analytics Drain Setup"
echo "============================================"
echo ""

# --- Schritt 1: Analytics pro Projekt aktivieren ---
enable_analytics() {
  local project="$1"
  echo -n "  Aktiviere Analytics für ${project}... "

  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X PATCH \
    "https://api.vercel.com/v1/projects/${project}?teamId=${VERCEL_TEAM_ID}" \
    -H "Authorization: Bearer ${VERCEL_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"analytics": {"id": "", "enabledAt": true}}' \
    2>/dev/null || echo "000")

  if [ "$RESPONSE" = "200" ]; then
    echo -e "${GREEN}OK${NC}"
  else
    echo -e "${YELLOW}Status ${RESPONSE} (evtl. schon aktiviert)${NC}"
  fi
}

# --- Schritt 2: Drain erstellen ---
create_drain() {
  local project="$1"
  local endpoint="$2"
  local label="$3"

  echo -n "  Erstelle Drain für ${project} → ${label}... "

  RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST \
    "https://api.vercel.com/v1/projects/${project}/analytics/drains?teamId=${VERCEL_TEAM_ID}" \
    -H "Authorization: Bearer ${VERCEL_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
      \"type\": \"web\",
      \"url\": \"${endpoint}\",
      \"encoding\": \"json\"
    }" 2>/dev/null || echo -e "\n000")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | head -n -1)

  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo -e "${GREEN}OK${NC}"
  elif [ "$HTTP_CODE" = "409" ]; then
    echo -e "${YELLOW}Existiert bereits${NC}"
  else
    echo -e "${RED}Fehler (${HTTP_CODE})${NC}"
    echo "    ${BODY}" | head -1
  fi
}

# --- Translator Apps ---
echo -e "${YELLOW}▶ Translator Apps${NC} → ${TRANSLATOR_ENDPOINT}"
echo ""
for project in "${TRANSLATOR_PROJECTS[@]}"; do
  enable_analytics "$project"
  create_drain "$project" "$TRANSLATOR_ENDPOINT" "translator"
done

echo ""

# --- Fintutto Apps ---
echo -e "${YELLOW}▶ Fintutto Apps${NC} → ${FINTUTTO_ENDPOINT}"
echo ""
for project in "${FINTUTTO_PROJECTS[@]}"; do
  enable_analytics "$project"
  create_drain "$project" "$FINTUTTO_ENDPOINT" "fintutto"
done

echo ""
echo "============================================"
echo -e "${GREEN}Fertig!${NC}"
echo ""
echo "Nächste Schritte:"
echo "  1. Ingest-Endpoints in der Admin-App bauen"
echo "     - POST ${TRANSLATOR_ENDPOINT}"
echo "     - POST ${FINTUTTO_ENDPOINT}"
echo "  2. Daten in Supabase/DB speichern"
echo "  3. Admin-Dashboard zur Visualisierung bauen"
echo "============================================"
