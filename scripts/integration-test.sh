#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# Omniscience — Integration Smoke Test
#
# Checks that all components are properly wired and both
# frontend + backend can start without errors.
#
# Usage: ./scripts/integration-test.sh
# ═══════════════════════════════════════════════════════════

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "  ${GREEN}✓${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; FAILED=1; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }

FAILED=0

echo ""
echo "═══════════════════════════════════════════════"
echo " Omniscience Integration Smoke Test"
echo "═══════════════════════════════════════════════"
echo ""

# ── 1. Frontend checks ──────────────────────────────────

echo "▸ Frontend"

if [ -f "package.json" ]; then
  pass "package.json exists"
else
  fail "package.json not found — run from project root"
  exit 1
fi

if [ -d "node_modules" ]; then
  pass "node_modules installed"
else
  warn "node_modules missing — run: npm install"
fi

# TypeScript check
if command -v npx &>/dev/null && [ -d "node_modules" ]; then
  if npx tsc --noEmit 2>/dev/null; then
    pass "TypeScript compiles without errors"
  else
    fail "TypeScript compilation errors — run: npx tsc --noEmit"
  fi
else
  warn "Skipping TypeScript check (npx or node_modules not available)"
fi

# Key files exist
for f in \
  "app/page.tsx" \
  "app/layout.tsx" \
  "app/topics/changing-states/page.tsx" \
  "app/api/copilotkit/route.ts" \
  "framework/TopicRunner.tsx" \
  "components/simulations/ChangingStatesSimulation.tsx" \
  "components/companion/Companion.tsx" \
  "components/chat/ChatOverlay.tsx" \
  "components/spotlight/SpotlightCard.tsx" \
  "components/ErrorBoundary.tsx" \
  "lib/types/index.ts" \
  "lib/types/changing-states.ts" \
  "lib/topics/index.ts" \
  "lib/topics/changing-states/config.ts" \
  "lib/session.ts"; do
  if [ -f "$f" ]; then
    pass "$f"
  else
    fail "$f missing"
  fi
done

echo ""

# ── 2. Backend checks ───────────────────────────────────

echo "▸ Backend (agent/)"

for f in \
  "agent/main.py" \
  "agent/models.py" \
  "agent/config.py" \
  "agent/langgraph.json" \
  "agent/pyproject.toml" \
  "agent/graphs/observation.py" \
  "agent/graphs/chat.py" \
  "agent/topics/changing_states/config.py" \
  "agent/topics/changing_states/reactions.py" \
  "agent/tools/emit_reaction.py"; do
  if [ -f "$f" ]; then
    pass "$f"
  else
    fail "$f missing"
  fi
done

# Python import check
if command -v python3 &>/dev/null; then
  cd agent
  if python3 -c "from models import ReactionRegistry, ReactionPayload; print('OK')" 2>/dev/null; then
    pass "Python models import cleanly"
  else
    fail "Python models import failed"
  fi

  if python3 -c "from topics.changing_states.reactions import changing_states_reactions; print(len(changing_states_reactions.reactions), 'reactions')" 2>/dev/null; then
    pass "Reaction registry loads"
  else
    fail "Reaction registry import failed"
  fi

  if python3 -c "from topics.changing_states.config import changing_states_config; print('Topic:', changing_states_config.id)" 2>/dev/null; then
    pass "Topic config loads"
  else
    fail "Topic config import failed"
  fi
  cd ..
else
  warn "Python3 not found — skipping backend import checks"
fi

echo ""

# ── 3. Wiring checks ────────────────────────────────────

echo "▸ Wiring (name consistency)"

OBSERVATION_ID="observation-changing-states"
CHAT_ID="chat-changing-states"

check_contains() {
  local file=$1
  local pattern=$2
  local label=$3
  if grep -q "$pattern" "$file" 2>/dev/null; then
    pass "$label in $file"
  else
    fail "$label NOT found in $file"
  fi
}

check_contains "agent/langgraph.json" "$OBSERVATION_ID" "$OBSERVATION_ID"
check_contains "agent/langgraph.json" "$CHAT_ID" "$CHAT_ID"
check_contains "agent/main.py" "$OBSERVATION_ID" "$OBSERVATION_ID"
check_contains "agent/main.py" "$CHAT_ID" "$CHAT_ID"
check_contains "app/api/copilotkit/route.ts" "$OBSERVATION_ID" "$OBSERVATION_ID"
check_contains "app/api/copilotkit/route.ts" "$CHAT_ID" "$CHAT_ID"

echo ""

# ── 4. Environment ──────────────────────────────────────

echo "▸ Environment"

if [ -f ".env" ]; then
  pass ".env file exists"
  if grep -q "GOOGLE_API_KEY" ".env" 2>/dev/null; then
    pass "GOOGLE_API_KEY in .env"
  else
    warn "GOOGLE_API_KEY not set in .env — AI features won't work"
  fi
else
  warn ".env not found — copy .env.example to .env and add keys"
fi

if [ -f ".env.example" ]; then
  pass ".env.example exists"
else
  fail ".env.example missing"
fi

echo ""

# ── Summary ──────────────────────────────────────────────

echo "═══════════════════════════════════════════════"
if [ $FAILED -eq 0 ]; then
  echo -e " ${GREEN}All checks passed!${NC}"
  echo ""
  echo " To run end-to-end:"
  echo "   Terminal 1: npm run dev"
  echo "   Terminal 2: cd agent && langgraph dev"
  echo "   Browser:    http://localhost:3000"
else
  echo -e " ${RED}Some checks failed — see above.${NC}"
fi
echo "═══════════════════════════════════════════════"
echo ""

exit $FAILED
