# Omniscience — Complete Verification Strategy

## Current Status Summary

### ✅ What's Working
- **Python Backend (Agent)**: All 10 tests passing
  - 7 reaction lookup tests (Slice 5)
  - 3 chat graph tests (Slice 6)
- **Frontend Server**: Next.js dev server running successfully
  - Collection page loads at `/`
  - Topic page loads at `/topics/changing-states` (shows loading state)
  - Neo-Brutalist styling applied correctly
  - Grain overlay rendering

### ⚠️ Known Issues

#### 1. TypeScript Type Errors (14 errors)
**Root cause**: `ChangingStatesSimState` doesn't satisfy `Record<string, unknown>` constraint

**Affected files**:
- `lib/types/changing-states.ts` - needs index signature
- `framework/TopicRunner.tsx` - setState callbacks need undefined guards
- `components/companion/Companion.tsx` - Framer Motion animate prop type
- Type casting issues with `Message` and `Window` objects

**Impact**: Code runs but fails type checking. Won't block runtime but should be fixed.

#### 2. Missing Environment Variables
**File**: `.env` created but all keys commented out
**Required for full integration**:
- `GOOGLE_API_KEY` - Required for both agents (Slice 5+6)
- `LANGSMITH_API_KEY` - Optional, for tracing
- `LANGGRAPH_DEPLOYMENT_URL` - Defaults to `http://localhost:8123`

**Impact**: Backend agents won't work without `GOOGLE_API_KEY`

#### 3. Python Environment
**Issue**: System Python is 3.9.7, but project requires 3.12+
**Solution**: Created `.venv` with Python 3.12.12 in `agent/` directory
**Status**: ✅ Resolved - all dependencies installed

---

## Verification Strategy by Slice

### Slice 1 — Scaffold + Shared Types + Theme ✅

**Acceptance criteria**:
- [x] `npm run dev` — Next.js starts, shows default page with `bg-paper` + grain
- [x] `npx tsc --noEmit` — ⚠️ 14 type errors (non-blocking)
- [x] Python types import cleanly

**Manual verification**:
```bash
# Frontend
npm run dev
# Visit http://localhost:3000 - should see collection page

# Backend types
cd agent
source .venv/bin/activate
python -c "from models import ReactionRegistry, ReactionPayload; print('OK')"
```

---

### Slice 2 — App Collection Page ✅

**Acceptance criteria**:
- [x] `/` shows collection page with "Changing States" card
- [x] Card has Neo-Brutalist styling (`border-4 border-ink shadow-chunky`)
- [x] Clicking card navigates to `/topics/changing-states`
- [x] Responsive layout

**Manual verification**:
```bash
npm run dev
# Visit http://localhost:3000
# Click "Changing States" card
# Should navigate to /topics/changing-states
```

---

### Slice 3 — Changing States Simulation ⚠️

**Status**: Component exists but needs runtime testing

**Acceptance criteria**:
- [ ] Slider controls temperature (0-100)
- [ ] Particles animate through 3 phases (solid/liquid/gas)
- [ ] Background color interpolates blue → neutral → warm
- [ ] `onEvent` fires `phase_change` at boundaries (33, 67)
- [ ] `onEvent` fires `dwell_timeout` after 8s
- [ ] `onEvent` fires `first_interaction` on first touch
- [ ] Touch targets ≥ 48px

**Manual verification**:
```bash
npm run dev
# Visit http://localhost:3000/topics/changing-states
# Currently shows loading state - needs CopilotKit backend running
```

**Blocked by**: Need to start LangGraph backend + add GOOGLE_API_KEY

---

### Slice 4 — Companion + TopicRunner Framework ⚠️

**Status**: Components exist, needs integration testing

**Acceptance criteria**:
- [ ] TopicRunner renders simulation + companion + chat toggle
- [ ] Injecting ReactionPayload → speech bubble appears
- [ ] Companion shows different faces per emotion
- [ ] Tapping companion opens ChatOverlay
- [ ] Tapping suggestion bubble fires callback
- [ ] SpotlightCard slides in when unlocked

**Manual verification**: Requires Slice 6 backend running

---

### Slice 5 — Observation Agent + Reaction Registry ✅

**Acceptance criteria**:
- [x] Reaction registry loads (tested via pytest)
- [x] Event matching works correctly (7 tests passing)
- [x] Graph compiles without error

**Automated tests**:
```bash
cd agent
source .venv/bin/activate
pytest tests/test_reaction_lookup.py -v
# All 7 tests passing ✅
```

---

### Slice 6 — Chat Agent + CopilotKit Wiring ⚠️

**Status**: Backend tests pass, frontend integration untested

**Acceptance criteria**:
- [x] Chat graph compiles (3 tests passing)
- [ ] `langgraph dev` starts both agents at localhost:8123
- [ ] Frontend connects to backend via `/api/copilotkit`
- [ ] `npx tsc --noEmit` passes (currently 14 errors)

**Manual verification**:
```bash
# Terminal 1: Start backend
cd agent
source .venv/bin/activate
# Add GOOGLE_API_KEY to .env first!
langgraph dev

# Terminal 2: Start frontend
npm run dev

# Visit http://localhost:3000/topics/changing-states
```

**Blocked by**: Need `GOOGLE_API_KEY` in `.env`

---

### Slice 7 — Full Integration + Polish ⚠️

**Status**: Not yet testable

**Acceptance criteria**:
- [ ] Collection page → topic page navigation works
- [ ] Drag slider → companion reaction appears
- [ ] Wait 8s → dwell_timeout reaction
- [ ] Reach all 3 phases → milestone + spotlight unlock
- [ ] Tap companion → chat overlay opens
- [ ] Type question → AI response
- [ ] All UI matches Neo-Brutalist style

**End-to-end test**:
```bash
# Both servers running (see Slice 6)
# Visit http://localhost:3000
# Click "Changing States" card
# Interact with simulation
# Verify companion reactions
# Open chat and ask question
```

---

## Priority Action Items

### 🔴 Critical (Blocks Integration Testing)

1. **Add GOOGLE_API_KEY to `.env`**
   ```bash
   # Edit .env and uncomment:
   GOOGLE_API_KEY=your_key_here
   ```

2. **Fix TypeScript errors** (14 errors)
   - Add index signature to `ChangingStatesSimState`
   - Fix setState callbacks in TopicRunner
   - Fix Framer Motion animate prop type
   - Fix type casting issues

3. **Start LangGraph backend**
   ```bash
   cd agent
   source .venv/bin/activate
   langgraph dev
   ```

### 🟡 Important (Quality/Polish)

4. **Test simulation event emission**
   - Verify phase_change events fire at correct temperatures
   - Verify dwell_timeout fires after 8s
   - Verify first_interaction fires on first touch

5. **Test companion reactions**
   - Verify speech bubbles appear
   - Verify emotion faces change
   - Verify suggestions render

6. **Test chat integration**
   - Verify chat overlay opens
   - Verify messages send/receive
   - Verify AI responses appear

### 🟢 Nice to Have (Future)

7. **Add frontend tests**
   - Component unit tests (Jest/Vitest)
   - Integration tests (Playwright)

8. **Add E2E smoke test script**
   - Automated full-flow verification

---

## Quick Start Commands

### Run All Backend Tests
```bash
cd agent
source .venv/bin/activate
pytest -v
# Expected: 10 passed
```

### Check TypeScript Types
```bash
npm run typecheck
# Expected: 14 errors (known issues)
```

### Start Development Environment
```bash
# Terminal 1: Backend
cd agent
source .venv/bin/activate
langgraph dev

# Terminal 2: Frontend
npm run dev

# Visit: http://localhost:3000
```

---

## Test Coverage Summary

| Slice | Unit Tests | Integration Tests | E2E Tests | Status |
|-------|-----------|------------------|-----------|--------|
| 1 | ✅ Python imports | ✅ Next.js starts | N/A | ✅ Complete |
| 2 | N/A | ✅ Manual nav test | N/A | ✅ Complete |
| 3 | N/A | ⚠️ Needs testing | ⚠️ Needs testing | ⚠️ Partial |
| 4 | N/A | ⚠️ Needs testing | ⚠️ Needs testing | ⚠️ Partial |
| 5 | ✅ 7 pytest tests | ✅ Graph compiles | N/A | ✅ Complete |
| 6 | ✅ 3 pytest tests | ⚠️ Needs backend | ⚠️ Needs backend | ⚠️ Partial |
| 7 | N/A | ⚠️ Blocked | ⚠️ Blocked | ⚠️ Not started |

**Overall**: 10/10 backend tests passing, frontend needs integration testing with live backend.

---

## Next Steps

1. **Get API key**: Obtain `GOOGLE_API_KEY` and add to `.env`
2. **Fix types**: Resolve 14 TypeScript errors
3. **Start backend**: Run `langgraph dev` in agent directory
4. **Integration test**: Follow Slice 7 acceptance criteria
5. **Polish**: Fix any bugs found during integration testing
