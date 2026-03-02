# Omniscience — Slice Plan

> Run `/cm` with any slice block below. Slices are ordered by dependency.
> After Slice 1 merges: `cp .env.example .env` and fill in keys. All worktrees resolve from main.

## Environment
| Key | Service | First needed |
|-----|---------|-------------|
| GOOGLE_API_KEY | Google Gemini (2.5 Flash for observation AI, 2.5 Flash Lite for chat) | Slice 5 |
| LANGSMITH_API_KEY | LangSmith (LangGraph tracing, optional) | Slice 5 |
| LANGGRAPH_DEPLOYMENT_URL | LangGraph backend URL (default http://localhost:8123) | Slice 6 |

## Slice Index
| # | Name | Spec sections | Depends on | Est. Level |
|---|------|--------------|------------|------------|
| 1 | Scaffold + Shared Types + Theme | §2.1, §2.2, §5.1, Style Spec | — | L2 |
| 2 | App Collection Page | — (new page, routing) | 1 | L1 |
| 3 | Changing States Simulation | §6.1, §6.2, §3.2, Style Spec | 1 | L3 |
| 4 | Companion + TopicRunner Framework | §2.1–2.3, §3.3–3.4, §5.3 | 1 | L3 |
| 5 | Observation Agent + Reaction Registry | §3.1–3.3, §5.2, §5.4, §6.3–6.4 | 1 | L3 |
| 6 | Chat Agent + CopilotKit Wiring | §2.4–2.5, §5.4, §6.5 | 4, 5 | L3 |
| 7 | Full Integration + Polish | §4, §6.5, §8 | 2, 3, 6 | L2 |

## Dependency Graph
```
Slice 1 (scaffold)
  ├── Slice 2 (collection page)  ─────────────────┐
  ├── Slice 3 (simulation component)  ─────────────┤
  ├── Slice 4 (companion + TopicRunner framework)──┤── Slice 7 (integration)
  └── Slice 5 (observation agent + reactions) ─┐   │
                                                └── Slice 6 (chat + wiring) ──┘

Parallel opportunities: Slices 2, 3, 4, 5 can ALL run in parallel after Slice 1.
Slice 6 waits on 4 + 5. Slice 7 waits on 2 + 3 + 6.
```

---

### Slice 1 — Scaffold + Shared Types + Theme

**Read:** §2.2 (Two State Zones), §5.1 (TypeScript Types), §5.2 (Python Types), Style Spec (Color Palette, Typography, Shape Language, Grain Overlay)

**Deliver:**
- `package.json` + Next.js 14 App Router setup (`npx create-next-app@latest` with TypeScript, Tailwind, App Router)
- `tailwind.config.ts`: Custom colors (`paper`, `ink`, `playful.*`), `boxShadow.chunky`, font config (Fraunces + Space Grotesk)
- `app/layout.tsx`: Root layout with Google Fonts, `bg-paper`, GrainOverlay
- `components/ui/GrainOverlay.tsx`: SVG noise filter overlay (from style spec)
- `lib/types/index.ts`: ALL shared TypeScript types from §5.1 — `SimulationEvent`, `EventState`, `ReactionPayload`, `CompanionState`, `CoAgentState`, `TopicConfig`, `SimulationProps`, emotion/animation types
- `lib/types/changing-states.ts`: `ChangingStatesSimState` interface + event type constants from §6.1
- `agent/pyproject.toml` + `agent/__init__.py`: Python package scaffold (uv-managed). Dependencies include `langchain-google-genai` (NOT langchain-openai), `copilotkit`, `langgraph`, `langchain-core`
- `agent/models.py`: ALL shared Python types from §5.2 — `SimulationEvent`, `EventPattern`, `ReactionPayload`, `Reaction`, `ReactionRegistry`, `TopicConfig`, `BaseEmotion`, `BaseAnimation`
- `agent/langgraph.json`: LangGraph CLI config with both graph IDs
- `.env.example`: All env keys (GOOGLE_API_KEY, LANGSMITH_API_KEY, LANGGRAPH_DEPLOYMENT_URL)
- `.gitignore`: Node, Python, .env, __pycache__, .next
- `app/globals.css`: Tailwind directives + any base styles

**Fixtures produced:** none — hand-written mocks
**Fixtures required:** none

**Acceptance:**
- `npm run dev` — Next.js starts, shows default page with `bg-paper` background + grain overlay
- `npx tsc --noEmit` — All shared types compile without errors
- `cd agent && python -c "from models import ReactionRegistry, ReactionPayload; print('OK')"` — Python types import cleanly

---

### Slice 2 — App Collection Page

**Read:** Style Spec (Shape Language — chunky borders, shadow-chunky, typography)

**Deliver:**
- `app/page.tsx`: App collection landing page — grid of topic cards, header with "Omniscience" branding
- `components/TopicCard.tsx`: Chunky Neo-Brutalist card component — `border-4 border-ink shadow-chunky` style, shows topic title, age range, level badge, description. Placeholder illustration area. Links to `/topics/[id]`
- `app/topics/changing-states/page.tsx`: Empty stub page that will host the simulation (just renders "Loading…" placeholder for now)
- `lib/topics/index.ts`: Topic metadata array (id, title, description, ageRange, level, route) — currently just "Changing States" entry

**Fixtures produced:** none
**Fixtures required:** none

**Acceptance:**
- `npm run dev` → `/` shows collection page with one "Changing States" card in Neo-Brutalist style
- Clicking the card navigates to `/topics/changing-states`
- Card has `border-4 border-ink shadow-chunky rounded-2xl` styling, hover lifts shadow
- Page is responsive (single column mobile, grid desktop)

---

### Slice 3 — Changing States Simulation Component

**Read:** §6.1 (State Schema), §6.2 (Simulation Component Behavior), §3.2 (Event Classification), Style Spec (Particle placeholders, Beaker, Slider, color interpolation)

**Deliver:**
- `components/simulations/ChangingStatesSimulation.tsx`: Full simulation component implementing `SimulationProps<ChangingStatesSimState>`. Contains:
  - Temperature slider (0–100) — 48px thumb, `border-4 border-ink`, gradient track blue→red
  - Beaker container — `border-4 border-ink rounded-b-[4rem] shadow-chunky` placeholder
  - Particle system — array of ~50 Framer Motion `<motion.div>` circles (`bg-playful-sky mix-blend-multiply`). Solid = tight grid vibrating. Liquid = loose wobbly bottom pile. Gas = bouncing everywhere.
  - Background color interpolation via Framer Motion (`playful-sky` → white → `playful-peach`)
  - Phase labels ("SOLID" / "LIQUID" / "GAS") in Fraunces font, animated swap
  - Phase boundaries at temperature 33 and 67, ~0.5s transition animation
- `components/simulations/useParticlePhysics.ts`: Custom hook managing particle positions/velocities per phase. 60fps requestAnimationFrame loop.
- `components/simulations/useEventEmitter.ts`: Custom hook implementing event classification from §3.2 — debounced `phase_change`, `dwell_timeout`, `first_interaction`, `reversal`, `rapid_cycling`, `milestone`, `idle_timeout` events. Calls `onEvent` prop.
- `lib/sounds.ts`: Sound key constants (`ice_crackle`, `water_bubble`, `steam_hiss`, `transition_chime`, etc.) — stubs only, no audio files yet

**Fixtures produced:** none
**Fixtures required:** none

**Acceptance:**
- Render `<ChangingStatesSimulation>` standalone with mock props → slider controls temperature, particles animate through 3 phases
- Dragging slider from 0→100 shows: tight grid (solid) → loose flowing (liquid) → flying apart (gas)
- Background color smoothly interpolates blue → neutral → warm
- `onEvent` fires `phase_change` when crossing 33 or 67 (check via `console.log`)
- `onEvent` fires `dwell_timeout` after 8s in any phase without slider movement
- `onEvent` fires `first_interaction` on first slider touch
- All touch targets ≥ 48px, works on mobile viewport

---

### Slice 4 — Companion + TopicRunner Framework

**Read:** §2.1–2.3 (Three Channels, Two State Zones, Event Triggering), §3.3–3.4 (Reaction Format, Emotions, Animations), §5.3 (Frontend Hook Patterns — TopicRunner)

**Deliver:**
- `components/companion/Companion.tsx`: Universal companion character — chunky circle placeholder (`bg-playful-mustard border-4 border-ink rounded-full shadow-chunky`), face text (`:)` / `^o^` etc. per emotion). Displays speech bubble for `currentReaction.message`, suggestion bubbles for `suggestions`. Auto-expire timer. Emotion-to-face mapping for all 8 base emotions.
- `components/companion/SpeechBubble.tsx`: Chunky speech bubble with tail — `border-3 border-ink bg-white shadow-chunky` — Framer Motion enter/exit animations
- `components/companion/SuggestionBubbles.tsx`: Tappable question bubble pills — `border-2 border-ink bg-playful-sage` — calls `onSuggestionTap`
- `components/chat/ChatOverlay.tsx`: Slide-up chat panel overlay — message list + text input, `border-4 border-ink` styling. Renders `visibleMessages`. Close button.
- `components/spotlight/SpotlightCard.tsx`: Top-left unlock card — `border-4 border-ink shadow-chunky-lg` — placeholder content area, Framer Motion slide-in
- `framework/TopicRunner.tsx`: The universal wrapper from §5.3 — **local-only mock version** (no CopilotKit hooks yet). Uses React state to simulate `CoAgentState`. Accepts `config`, `SimulationComponent` props. Wires `onStateChange`, `onEvent` to simulation. Manages reaction display, auto-expire, chat panel toggle. SoundManagerContext provider (stub).
- `framework/SoundManager.tsx`: Context provider + hook — `play(key)`, `setAmbient(key, vol)`, `stopAll()` — all no-op stubs for now

**Fixtures produced:** `tests/fixtures/mock-reactions.ts` — array of sample `ReactionPayload` objects for testing companion rendering
**Fixtures required:** none

**Acceptance:**
- `<TopicRunner config={...} SimulationComponent={...} />` renders simulation + companion + chat toggle
- Manually injecting a `ReactionPayload` into companion state → speech bubble appears with message, auto-dismisses after `autoExpireMs`
- Companion shows different face per emotion key (`:)` for idle, `*o*` for excited, etc.)
- Tapping companion opens ChatOverlay. Tapping suggestion bubble fires `onSuggestionTap`.
- SpotlightCard slides in when `spotlightUnlocked` is set true

---

### Slice 5 — Observation Agent + Reaction Registry

**Read:** §3.1–3.3 (Reaction System), §5.2 (Python Types — ReactionRegistry), §5.4 (LangGraph Scaffolds — Observation Agent), §6.3 (Changing States Reactions), §6.4 (Topic Config)

**Deliver:**
- `agent/topics/changing_states/reactions.py`: Full `changing_states_reactions` ReactionRegistry from §6.3 — all reactions (welcome, first transitions, repeat escalation, dwell timeouts, reversal, rapid_cycling, milestones, spotlight, idle)
- `agent/topics/changing_states/config.py`: Full `changing_states_config` TopicConfig from §6.4 — pedagogical prompt, knowledge context, chat system prompt, suggested questions, spotlight config
- `agent/graphs/observation.py`: `build_observation_graph()` from §5.4 — `event_classifier` → `reaction_lookup` → `ai_reasoning` / `deliver_reaction` nodes. Uses `Command` routing. `copilotkit_emit_state` in deliver node. Topic config + registry via closure injection. **AI reasoning node uses `ChatGoogleGenerativeAI(model="gemini-2.5-flash")` from `langchain_google_genai`** instead of ChatOpenAI.
- `agent/tools/emit_reaction.py`: `make_emit_reaction_tool()` — constrained tool the AI calls to emit reactions (Gemini supports tool calling natively)
- `agent/config.py`: Worktree-aware `.env` resolution pattern from slice spec

**Fixtures produced:** `agent/tests/fixtures/sample_events.py` — sample `SimulationEvent` dicts for all 8 event types
**Fixtures required:** none

**Acceptance:**
- `cd agent && python -c "from topics.changing_states.reactions import changing_states_reactions; print(len(changing_states_reactions.reactions), 'reactions loaded')"` — prints reaction count
- `cd agent && python -m pytest tests/test_reaction_lookup.py` — tests: (1) first_interaction event matches "welcome" reaction, (2) phase_change solid→liquid matches "first_solid_to_liquid", (3) unknown event returns `(None, True)` for AI escalation, (4) one_shot reactions don't fire twice, (5) cooldown prevents re-fire within window
- `cd agent && python -c "from graphs.observation import build_observation_graph; from topics.changing_states.config import changing_states_config; from topics.changing_states.reactions import changing_states_reactions; g = build_observation_graph(changing_states_config, changing_states_reactions); print('Graph compiled:', g)"` — graph compiles without error

---

### Slice 6 — Chat Agent + CopilotKit Wiring

**Read:** §2.4–2.5 (Two Agents, CopilotKit Wiring), §5.3 (useCopilotChat, useCopilotReadable, useCopilotAction patterns), §5.4 (Chat Agent scaffold), §6.5 (Wiring It Up)

**Deliver:**
- `agent/graphs/chat.py`: `build_chat_graph()` from §5.4 — single `conversational_response` node with topic config via closure, system prompt enrichment from simulation/companion state. **Uses `ChatGoogleGenerativeAI(model="gemini-2.5-flash-lite-preview-06-17")` for all conversation** — fast, cheap, ideal for child-facing chat. Import from `langchain_google_genai`.
- `agent/main.py`: Entry point — builds both graphs, registers with `CopilotKitRemoteEndpoint` as two `LangGraphAgent`s
- `app/api/copilotkit/route.ts`: Next.js API route — `CopilotRuntime` with both agents registered as `LangGraphAgent` (platform mode) or `LangGraphHttpAgent` (self-hosted mode, configurable via env)
- `framework/TopicRunner.tsx`: **UPGRADE** from local mock to real CopilotKit hooks — `useCoAgent`, `useCopilotChat` (headless), `useCopilotReadable` (with categories), `useCopilotAction("processSimulationEvent")`. Zone-separated `setState`. Debounced event emitter triggering observation agent.
- `app/topics/changing-states/page.tsx`: **UPGRADE** — wraps in `<CopilotKit runtimeUrl="/api/copilotkit" agent="observation-changing-states">`, passes real config + simulation to TopicRunner

**Fixtures produced:** none
**Fixtures required:** `agent/tests/fixtures/sample_events.py` from Slice 5

**Acceptance:**
- `cd agent && python -m pytest tests/test_chat_graph.py` — chat graph compiles, accepts a user message, returns assistant message (mocked LLM)
- `cd agent && langgraph dev` — both agents start at localhost:8123 without errors
- `npm run dev` → `/topics/changing-states` loads with CopilotKit provider wrapping TopicRunner
- `npx tsc --noEmit` — no type errors in the CopilotKit integration code

---

### Slice 7 — Full Integration + Polish

**Read:** §4 (Development Workflow), §6.5 (Wiring), §8 (Session Persistence), Style Spec (all polish items)

**Deliver:**
- `app/topics/changing-states/page.tsx`: **FINAL** — full integration: CopilotKit provider → TopicRunner → ChangingStatesSimulation + Companion + ChatOverlay + SpotlightCard all wired together
- `app/page.tsx`: **UPGRADE** — collection page links to working `/topics/changing-states`
- `components/simulations/ChangingStatesSimulation.tsx`: **POLISH** — ensure event emitter integrates cleanly with TopicRunner's `onEvent` → observation agent pipeline
- `framework/TopicRunner.tsx`: **POLISH** — threadId support for session persistence, proper reaction history dedup, suggested questions cycling
- `app/layout.tsx`: **POLISH** — page transitions, loading states, error boundaries
- Integration test script: End-to-end smoke test — start backend, start frontend, verify collection page → topic page → slider triggers companion reaction

**Fixtures produced:** none
**Fixtures required:** All prior slices merged

**Acceptance:**
- `npm run dev` + `cd agent && langgraph dev` — both running
- `/` shows collection page with Changing States card
- Click card → `/topics/changing-states` loads simulation with companion
- Drag slider across phase boundary → companion speech bubble appears with programmed reaction
- Wait 8s in one phase → dwell_timeout reaction appears
- Reach all 3 phases → milestone "confetti" reaction + spotlight unlock
- Tap companion → chat overlay opens, can type question, gets AI response
- All UI matches Neo-Brutalist style: `border-4 border-ink`, `shadow-chunky`, `bg-paper`, grain overlay
