#!/bin/bash
# ============================================================
# Vercel Analytics Drain Setup Script
#
# Erstellt Analytics Drains für alle Fintutto/Translator Apps
# und zeigt sie auf die Supabase Edge Function.
#
# Voraussetzungen:
#   1. Vercel API Token: https://vercel.com/account/tokens
#   2. Supabase Edge Functions deployed (supabase functions deploy)
#   3. Analytics muss pro Projekt aktiviert sein
#
# Usage:
#   export VERCEL_TOKEN="dein-token"
#   export VERCEL_TEAM_ID="team_BWJ5UWVCsjATty1unzcfH96u"
#   bash supabase/functions/setup-analytics-drains.sh
# ============================================================

set -euo pipefail

VERCEL_TOKEN="${VERCEL_TOKEN:?Bitte VERCEL_TOKEN setzen: export VERCEL_TOKEN=xxx}"
VERCEL_TEAM_ID="${VERCEL_TEAM_ID:?Bitte VERCEL_TEAM_ID setzen: export VERCEL_TEAM_ID=team_xxx}"

# --- Supabase Edge Function Endpoints ---
# Deine Supabase Project Ref: aaefocdqgdgexkcrjhks
SUPABASE_FUNCTIONS_URL="https://aaefocdqgdgexkcrjhks.supabase.co/functions/v1"

TRANSLATOR_ENDPOINT="${SUPABASE_FUNCTIONS_URL}/analytics-ingest?group=translator"
FINTUTTO_ENDPOINT="${SUPABASE_FUNCTIONS_URL}/analytics-ingest?group=fintutto"

# --- Translator Projekte ---
TRANSLATOR_PROJECTS=(
  "guidetranslator"
  "gt_salesmaschine"
  "translator.enterprice"
  "translator.consumer"
  "translator.landing"
  "guidetranslator.listener"
)

# --- Fintutto Projekte ---
FINTUTTO_PROJECTS=(
  "cloud"
  "command-center"
  "hausmeister-pro"
  "luggagex"
  "personaltrainer"
  "portal"
  "vermietify"
  "zimmerpflanze"
  "fintutto"
  "finance-coach"
  "finance-mentor"
  "ablesung"
  "admin"
  "bescheidboxer"
  "mieter"
  "secondbrain"
  "biz"
  "ai-guide"
  "lern-app"
  "fintutto-portal"
)

# Farben
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "============================================"
echo " Vercel Analytics Drain Setup"
echo " → Supabase Edge Functions"
echo "============================================"
echo ""
echo "Translator Endpoint: ${TRANSLATOR_ENDPOINT}"
echo "Fintutto Endpoint:   ${FINTUTTO_ENDPOINT}"
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
  BODY=$(echo "$RESPONSE" | sed '$d')

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
echo -e "${YELLOW}▶ Translator Apps${NC}"
echo ""
for project in "${TRANSLATOR_PROJECTS[@]}"; do
  enable_analytics "$project"
  create_drain "$project" "$TRANSLATOR_ENDPOINT" "translator"
done

echo ""

# --- Fintutto Apps ---
echo -e "${YELLOW}▶ Fintutto Apps${NC}"
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
echo "  1. SQL Schema in Supabase ausfuehren (falls nicht schon geschehen)"
echo "  2. Edge Functions deployen: supabase functions deploy"
echo "  3. Dashboard in der Admin-App einbauen"
echo "============================================"
