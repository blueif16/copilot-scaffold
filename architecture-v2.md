# Interactive Learning Platform — Architecture & Development Guide (v2)

## CopilotKit + AG-UI + LangGraph | Companion-Driven Educational Simulations

---

## 1. Philosophy

Every topic in this platform follows one principle: **the simulation teaches, the companion guides**. The simulation is a handcrafted, high-performance interactive environment that a child controls directly. The companion is an AI-powered character that observes what the child is doing and reacts — sometimes with pre-authored responses, sometimes with AI-generated ones, always through the same unified reaction format.

The AI never generates or controls the simulation UI. It never moves a slider, changes a color, or renders a particle. It only writes data into a companion state object, and the frontend decides how to render that data. This separation keeps the experience polished, predictable, and safe for children while allowing genuinely intelligent, adaptive guidance.

Every topic — regardless of subject, age range, or interaction style — uses the exact same framework, the same hooks, the same backend graph structure, and the same companion rendering pipeline. What changes per topic is the simulation component, the state schema, the reaction registry, and the pedagogical prompt. The infrastructure is built once.

---

## 2. Architecture Overview

### 2.1 The Three Channels

The system has three communication channels, each with a clear direction and purpose.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React / Next.js)                  │
│                                                                     │
│   ┌─────────────────────┐                                           │
│   │  Simulation Component│──── writes ────┐                         │
│   │  (topic-specific)    │                │                         │
│   └─────────────────────┘                │                         │
│                                          ▼                         │
│   CHANNEL 1: Simulation State    ═══════════════════╗              │
│   Direction: Frontend → Backend                     ║              │
│   Hook: useCoAgent (write side)                     ║              │
│   Contents: temperature, phase, slider position,    ║              │
│   interaction events, timestamps                    ║              │
│                                                     ║              │
│   CHANNEL 2: Companion State     ═══════════════════╣              │
│   Direction: Backend → Frontend                     ║              │
│   Hook: useCoAgent (read side) +                    ║              │
│         copilotkit_emit_state for real-time push    ║              │
│   Contents: reactions, emotion, suggestions,        ║              │
│   progress, spotlight triggers                      ║              │
│         │                                           ║              │
│         ▼                                           ║              │
│   ┌─────────────────────┐                           ║              │
│   │  Companion Component │◄── reads ────────────────╝              │
│   │  (universal)         │                                         │
│   └─────────────────────┘                                          │
│                                                                     │
│   CHANNEL 3: Chat Messages       ═══════════════════               │
│   Direction: Bidirectional                                          │
│   Hook: useCopilotChat (headless)                                   │
│   Contents: user questions, agent responses                         │
│   UI: Separate chatbox overlay/panel                                │
│                                                                     │
│   ┌─────────────────────┐                                           │
│   │  Chatbox Component   │ (opens as overlay when kid taps)         │
│   │  (universal)         │                                          │
│   └─────────────────────┘                                           │
│                                                                     │
│   BRIDGE: useCopilotReadable (with categories)                      │
│   Injects simulation state + companion state into chat context      │
│   so the chat agent knows what the kid is seeing/doing              │
│                                                                     │
│   EVENT TRIGGER: useCopilotAction ("processSimulationEvent")        │
│   Frontend defines when meaningful events cross threshold,          │
│   then calls the action to trigger the observation agent            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 The Two State Zones

Inside the single `useCoAgent` state object, there are two zones with strict ownership rules.

**Zone 1 — Simulation State**: Owned by the frontend. The backend reads it, never writes to it. This is the raw state of the interactive environment — what the kid is doing, what they're seeing, what has changed. The frontend updates this based on user input and simulation physics.

**Zone 2 — Companion State**: Owned by the backend. The frontend reads it, never writes to it (except to acknowledge/dismiss reactions). The backend updates this based on the reaction router's decisions. For real-time delivery, the backend uses `copilotkit_emit_state` to push companion updates to the frontend before a graph node finishes executing — this eliminates latency on the AI-escalated path.

**What does NOT go in state:** Static configuration (topic config, reaction registries, pedagogical prompts) is injected via closures when building the graph. Graph state is serialized and synced with the frontend on every update — putting large static objects there wastes bandwidth and leaks backend internals to the client.

```
useCoAgent state = {
  // ═══ ZONE 1: SIMULATION STATE (frontend writes, backend reads) ═══
  simulation: {
    ...topic-specific fields
  },
  events: {
    latest: { type: string, timestamp: number, data: object },
    history: EventRecord[],
  },

  // ═══ ZONE 2: COMPANION STATE (backend writes, frontend reads) ═══
  companion: {
    currentReaction: ReactionPayload | null,
    reactionHistory: string[],       // IDs of reactions already shown
    progress: ProgressState,
    spotlightUnlocked: boolean,
    suggestedQuestions: string[],
  },
}
```

### 2.3 How State Changes Trigger the Backend

LangGraph agents don't auto-execute when state changes. Something must explicitly trigger a run. This platform uses `useCopilotAction` to define a **"process simulation event"** action on the frontend. The frontend decides when a meaningful event crosses the threshold worth sending to the backend, then calls this action. This gives the frontend full control over event debouncing, throttling, and filtering — the backend only runs when the frontend says so.

```
┌──────────────┐     event threshold      ┌──────────────────────┐
│  Simulation   │──── crossed? ──────────▶│  useCopilotAction     │
│  Component    │     (debounced,          │  "processSimEvent"    │
│               │      filtered)           │  available: "remote"  │
└──────────────┘                          └──────────┬───────────┘
                                                     │
                                                     ▼
                                          ┌──────────────────────┐
                                          │  Observation Agent    │
                                          │  (LangGraph)          │
                                          │  Reads sim state,     │
                                          │  runs reaction lookup │
                                          └──────────────────────┘
```

This approach is better than triggering on every state change because:
- The frontend already knows the event classification logic (phase boundaries, dwell timeouts, etc.)
- No wasted backend runs for slider-is-still-moving frames
- The action payload carries the classified event, so the backend doesn't need to diff state
- Cost control: AI calls only happen when the frontend explicitly sends a meaningful event

### 2.4 Two Agents, Not Two Paths in One Graph

The observation loop (Path A) and the conversation loop (Path B) are **separate LangGraph agents**. LangGraph graphs have a single `START` node — forcing two entry points into one graph creates awkward routing. Separate agents are cleaner:

- **Observation Agent**: Lightweight, mostly deterministic. Triggered by the `processSimulationEvent` action. Reads simulation state, runs the reaction registry, optionally escalates to AI, writes to companion state.
- **Chat Agent**: Conversational, always AI-powered. Triggered by chat messages via `useCopilotChat`. Reads simulation state and companion context, generates age-appropriate responses.

Both agents share state through the same CopilotKit session. The chat agent sees the companion's reaction history (via `useCopilotReadable`) so it never repeats what the companion already said.

```
┌──────────────────────────────────────────────────────────────────┐
│                     OBSERVATION AGENT (LangGraph)                 │
│                                                                   │
│   Trigger: useCopilotAction "processSimulationEvent"              │
│                                                                   │
│   Event Classifier ──▶ Reaction Lookup ──▶ Route                  │
│   (deterministic)      (registry match)     │                     │
│                                       ┌─────┴──────┐             │
│                                    MATCH         NO MATCH         │
│                                       │              │            │
│                                 escalate?            │            │
│                                 ┌────┴────┐          │            │
│                              NO ▼      YES▼          ▼            │
│                          Use stored    AI Reasoning Node          │
│                          reaction      (with ai_hint context)     │
│                              │              │                     │
│                              └──────┬───────┘                     │
│                                     ▼                             │
│                           Deliver Reaction                        │
│                           (copilotkit_emit_state)                 │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                     CHAT AGENT (LangGraph)                        │
│                                                                   │
│   Trigger: useCopilotChat messages                                │
│                                                                   │
│   User Message ──▶ Context Enrichment ──▶ Conversational          │
│                     (reads simulation      Response                │
│                      state, progress,     (age-appropriate,        │
│                      reaction history     context-aware)           │
│                      via CopilotKitState)                          │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 2.5 CopilotKit Wiring Overview

The full CopilotKit integration has three layers:

**Backend (Python):**
```python
from copilotkit import CopilotKitRemoteEndpoint, LangGraphAgent

sdk = CopilotKitRemoteEndpoint(
    agents=[
        LangGraphAgent(
            name="observation-changing-states",
            description="Observes simulation events and delivers companion reactions",
            graph=observation_graph,
        ),
        LangGraphAgent(
            name="chat-changing-states",
            description="Answers questions about states of matter for ages 6-8",
            graph=chat_graph,
        ),
    ]
)
```

**Runtime API (Next.js):**
```typescript
import { CopilotRuntime, copilotRuntimeNextJSAppRouterEndpoint } from "@copilotkit/runtime";
import { LangGraphAgent } from "@copilotkit/runtime/langgraph";

const runtime = new CopilotRuntime({
  agents: {
    "observation-changing-states": new LangGraphAgent({
      deploymentUrl: process.env.LANGGRAPH_DEPLOYMENT_URL || "http://localhost:8123",
      graphId: "observation-changing-states",
      langsmithApiKey: process.env.LANGSMITH_API_KEY || "",
    }),
    "chat-changing-states": new LangGraphAgent({
      deploymentUrl: process.env.LANGGRAPH_DEPLOYMENT_URL || "http://localhost:8123",
      graphId: "chat-changing-states",
      langsmithApiKey: process.env.LANGSMITH_API_KEY || "",
    }),
  },
});

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter: new ExperimentalEmptyAdapter(),
    endpoint: "/api/copilotkit",
  });
  return handleRequest(req);
};
```

**Provider (React):**
```tsx
<CopilotKit runtimeUrl="/api/copilotkit" agent="observation-changing-states">
  <TopicRunner config={changingStatesConfig} ... />
</CopilotKit>
```

---

## 3. The Reaction System

### 3.1 The Ratio: ~90% Programmed, ~10% AI

Most state changes have known, pre-authored responses. The slider crosses from solid to liquid for the first time — the curriculum designer has written the perfect sentence for that moment. No LLM call needed. The response is instant and costs nothing.

AI gets invoked only when:
- No programmed reaction matches the current event + context combination
- A programmed reaction explicitly escalates via `escalate_to_ai: true` (e.g., unusual interaction patterns, repeated experimentation, post-chat follow-ups)
- The system needs fresh suggestion questions after the curated bank is exhausted

When AI is invoked, it produces a reaction through a structured tool call — the exact same `ReactionPayload` format as programmed reactions. The frontend can't distinguish between the two.

### 3.2 Event Classification

The frontend doesn't send every frame of slider movement to the backend. It debounces and emits **meaningful events** only. Critically, the **frontend classifies events** and decides when to trigger the backend via `useCopilotAction`. The backend receives already-classified events — it doesn't need to diff state.

| Event Type | Trigger Condition | Example |
|---|---|---|
| `phase_change` | Simulation crosses a state boundary | solid → liquid |
| `dwell_timeout` | Kid stays in one state for N seconds | 8s in gas phase |
| `first_interaction` | Kid touches the primary input for the first time | First slider drag |
| `reversal` | Kid changes direction of exploration | Was heating, now cooling |
| `rapid_cycling` | Multiple transitions in short time window | 3 transitions in 10s |
| `milestone` | Learning objective condition met | All three phases visited |
| `spotlight_tap` | Kid interacts with spotlight content | Tapped pressure cooker card |
| `idle_timeout` | No interaction for extended period | 30s of no input |

These events are emitted by the frontend into `state.events.latest` and simultaneously trigger the observation agent via the `processSimulationEvent` action.

### 3.3 The Unified Reaction Format

Every reaction — programmed or AI-generated — conforms to this format. The frontend receives this and renders it without knowing or caring about its source.

```
ReactionPayload {
  // ── Content ──────────────────────────────────
  message: string | null         // What the companion says
  suggestions: string[] | null   // Tappable question bubbles

  // ── Companion Behavior ───────────────────────
  emotion: string                // From EmotionSet (see §3.4)
  animation: string | null       // From AnimationSet (see §3.4)
  sound: string | null           // Sound effect key

  // ── Display Control ──────────────────────────
  type: "observation" | "suggestion" | "milestone" | "prompt"
  priority: number               // Higher wins when multiple fire
  autoExpireMs: number           // Auto-dismiss timer (ms)

  // ── Special Triggers ─────────────────────────
  unlockSpotlight: boolean
  progressUpdate: object | null  // Partial progress state merge

  // ── Metadata (not rendered) ──────────────────
  source: "programmed" | "ai"
  reactionId: string
  timestamp: number
}
```

### 3.4 Emotion & Animation Sets

**Universal Base Emotions** (available in ALL topics):

| Emotion Key | Description | Avatar Expression |
|---|---|---|
| `idle` | Default resting state | Neutral, gentle breathing |
| `excited` | Discovery moment | Wide eyes, big smile |
| `curious` | Prompting exploration | Head tilt, raised eyebrow |
| `impressed` | Kid did something clever | Nodding, approving smile |
| `celebrating` | Milestone reached | Arms up, confetti |
| `thinking` | Processing / waiting | Hand on chin, looking up |
| `encouraging` | Kid seems stuck | Warm smile, gentle gesture |
| `watching` | Observing quietly | Attentive, no speech |

Topics can register additional emotions beyond the base set (e.g., a weather topic might add `windy`). These extend the base set — they don't replace it.

**Universal Base Animations**:

| Animation Key | Description |
|---|---|
| `bounce` | Quick vertical bounce (discovery) |
| `nod` | Approval nod |
| `tilt_head` | Curious head tilt |
| `confetti` | Particle burst celebration |
| `wave` | Greeting or attention-getting |
| `point` | Points toward simulation area |
| `none` | No animation, just expression change |

Same extension pattern — topics can register additional animations.

---

## 4. Development Workflow

Every topic follows this exact 5-step process. No exceptions, no special cases.

### Step 1 → Design the State Schema

Define what simulation state this topic exposes. This is the contract between frontend and backend — the shape of Zone 1.

Deliverable: A TypeScript interface for the topic's simulation state, plus a list of meaningful events the frontend will emit.

Questions to answer:
- What does the kid directly control? (slider, drag targets, buttons, etc.)
- What derived state matters for learning? (current phase, score, completion %)
- What events constitute meaningful moments? (transitions, milestones, timeouts)
- What is the progression/completion condition?

### Step 2 → Build the Frontend Simulation

The interactive environment component. This is purely visual and interactive — no AI logic, no reaction rendering, no companion awareness. It manages its own physics/animation loop, reads user input, and writes simulation state.

Deliverable: A React component that accepts `state` and `onStateChange` and `onEvent` props and renders the full interactive environment. It writes to simulation state and emits events, reads from neither companion state nor chat.

Design constraints:
- 60fps animation, no jank
- Touch-friendly (48px+ hit targets for young children)
- All state changes debounced into event emissions (not every frame)
- Sound design hooks (exposes sound trigger points)
- Fully functional without the companion (the simulation stands alone)

### Step 3 → Author the Reaction Registry

The programmed reactions for this topic. Written by curriculum designers or developers who understand the learning objectives.

Deliverable: A Python `ReactionRegistry` containing `Reaction` entries — each with a trigger pattern, conditions, and a `ReactionPayload` response. Includes escalation flags for moments where AI should take over.

Guidelines:
- Cover all first-time events (first interaction, first transition of each type, first milestone)
- Cover dwell timeouts for each significant state
- Include escalation reactions for repeated/unusual patterns
- Set appropriate cooldowns to prevent nagging
- Include milestone reactions with progress updates
- Seed the suggested questions bank keyed to simulation states
- Author messages in age-appropriate language for the topic's target range

### Step 4 → Write the Topic Config

The metadata and prompts that configure the AI path and the chat agent.

Deliverable: A `TopicConfig` object containing the pedagogical prompt, knowledge context, suggested questions bank, spotlight content definition, learning objectives, and age range.

### Step 5 → Plug into the Framework

Register the topic with the `<TopicRunner>` wrapper. The framework wires everything up.

Deliverable: One line of configuration — the topic config + simulation component + reaction registry passed to `TopicRunner`. Everything else is automatic.

```
┌───────────────┐     ┌───────────────┐     ┌────────────────┐
│  Step 1        │     │  Step 2        │     │  Step 3         │
│  State Schema  │────▶│  Frontend Sim  │     │  Reactions      │
│  (contract)    │     │  (component)   │     │  (registry)     │
└───────────────┘     └───────────────┘     └────────────────┘
        │                     │                      │
        ▼                     ▼                      ▼
┌────────────────────────────────────────────────────────────┐
│  Step 4: Topic Config                                       │
│  (prompts, knowledge, questions, spotlight, extras)         │
└──────────────────────────┬─────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│  Step 5: TopicRunner                                        │
│  <TopicRunner                                               │
│    config={changingStatesConfig}                            │
│    simulation={ChangingStatesSimulation}                    │
│    reactions={changingStatesReactions}                      │
│  />                                                         │
│                                                             │
│  Framework automatically sets up:                           │
│  • useCoAgent with the state schema                         │
│  • useCopilotAction for event triggering                    │
│  • useCopilotChat headless with topic system prompt         │
│  • useCopilotReadable bridge (with categories)              │
│  • Companion component with emotion/animation sets          │
│  • Chatbox overlay                                          │
│  • Sound manager context provider                           │
│  • Progress persistence via threadId                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Code Scaffolding

### 5.1 TypeScript Types (Frontend)

```typescript
// ═══════════════════════════════════════════════════════════
// UNIVERSAL TYPES — shared across ALL topics
// ═══════════════════════════════════════════════════════════

// ── Emotion & Animation ─────────────────────────────────

type BaseEmotion =
  | "idle"
  | "excited"
  | "curious"
  | "impressed"
  | "celebrating"
  | "thinking"
  | "encouraging"
  | "watching";

type BaseAnimation =
  | "bounce"
  | "nod"
  | "tilt_head"
  | "confetti"
  | "wave"
  | "point"
  | "none";

type EmotionSet<TopicExtras extends string = never> = BaseEmotion | TopicExtras;
type AnimationSet<TopicExtras extends string = never> = BaseAnimation | TopicExtras;

// ── Events ──────────────────────────────────────────────

interface SimulationEvent {
  type: string;          // "phase_change", "dwell_timeout", "milestone", etc.
  timestamp: number;
  data: Record<string, unknown>;
}

interface EventState {
  latest: SimulationEvent | null;
  history: SimulationEvent[];
}

// ── Reaction Payload ────────────────────────────────────

interface ReactionPayload<
  E extends string = BaseEmotion,
  A extends string = BaseAnimation
> {
  message: string | null;
  suggestions: string[] | null;
  emotion: E;
  animation: A | null;
  sound: string | null;
  type: "observation" | "suggestion" | "milestone" | "prompt";
  priority: number;
  autoExpireMs: number;
  unlockSpotlight: boolean;
  progressUpdate: Record<string, unknown> | null;
  source: "programmed" | "ai";
  reactionId: string;
  timestamp: number;
}

// ── Companion State ─────────────────────────────────────

interface CompanionState<
  E extends string = BaseEmotion,
  A extends string = BaseAnimation
> {
  currentReaction: ReactionPayload<E, A> | null;
  reactionHistory: string[];
  progress: Record<string, unknown>;
  spotlightUnlocked: boolean;
  suggestedQuestions: string[];
}

// ── CoAgent State (full shape synced with backend) ──────

interface CoAgentState<
  SimState extends Record<string, unknown>,
  E extends string = BaseEmotion,
  A extends string = BaseAnimation
> {
  // Zone 1: Frontend writes, Backend reads
  simulation: SimState;
  events: EventState;

  // Zone 2: Backend writes, Frontend reads
  companion: CompanionState<E, A>;
}

// ── Topic Config ────────────────────────────────────────

interface SpotlightConfig {
  id: string;
  triggerCondition: string;
  component: React.ComponentType;
}

interface TopicConfig<
  SimState extends Record<string, unknown>,
  E extends string = never,
  A extends string = never
> {
  id: string;
  level: number;
  ageRange: [number, number];

  initialSimulationState: SimState;
  initialProgress: Record<string, unknown>;

  pedagogicalPrompt: string;
  knowledgeContext: string;
  chatSystemPrompt: string;

  suggestedQuestions: Record<string, string[]>;
  spotlightContent: SpotlightConfig | null;

  extraEmotions?: E[];
  extraAnimations?: A[];
  eventDebounceMs?: number;
}

// ── Simulation Component Contract ───────────────────────

interface SimulationProps<SimState extends Record<string, unknown>> {
  state: SimState;
  onStateChange: (partial: Partial<SimState>) => void;
  onEvent: (event: Omit<SimulationEvent, "timestamp">) => void;
}
```

### 5.2 Python Types (Backend)

```python
# ═══════════════════════════════════════════════════════════
# UNIVERSAL TYPES — shared across ALL topics
# ═══════════════════════════════════════════════════════════

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Literal, Optional
from enum import Enum


# ── Emotion & Animation ─────────────────────────────────

class BaseEmotion(str, Enum):
    IDLE = "idle"
    EXCITED = "excited"
    CURIOUS = "curious"
    IMPRESSED = "impressed"
    CELEBRATING = "celebrating"
    THINKING = "thinking"
    ENCOURAGING = "encouraging"
    WATCHING = "watching"


class BaseAnimation(str, Enum):
    BOUNCE = "bounce"
    NOD = "nod"
    TILT_HEAD = "tilt_head"
    CONFETTI = "confetti"
    WAVE = "wave"
    POINT = "point"
    NONE = "none"


# ── Events ──────────────────────────────────────────────

@dataclass
class SimulationEvent:
    type: str
    timestamp: float
    data: dict[str, Any] = field(default_factory=dict)


# ── Reaction System ─────────────────────────────────────

@dataclass
class EventPattern:
    """Defines when a reaction should trigger."""
    event: str                                    # Event type to match, or "*"
    conditions: dict[str, Any] = field(default_factory=dict)
    # Condition keys support suffixes:
    #   "field": exact match
    #   "field__gte": greater than or equal
    #   "field__lte": less than or equal
    #   "field__in": value in list


@dataclass
class ReactionPayload:
    """The universal reaction format. Frontend renders this regardless of source."""
    message: Optional[str] = None
    suggestions: Optional[list[str]] = None
    emotion: str = "idle"
    animation: Optional[str] = None
    sound: Optional[str] = None
    type: Literal["observation", "suggestion", "milestone", "prompt"] = "observation"
    priority: int = 5
    auto_expire_ms: int = 4000
    unlock_spotlight: bool = False
    progress_update: Optional[dict[str, Any]] = None
    source: Literal["programmed", "ai"] = "programmed"
    reaction_id: str = ""
    timestamp: float = 0.0


@dataclass
class Reaction:
    """A single programmed reaction: trigger pattern → response."""
    id: str
    trigger: EventPattern
    response: ReactionPayload
    cooldown_seconds: Optional[float] = None
    one_shot: bool = False
    escalate_to_ai: bool = False
    ai_hint: Optional[str] = None


class ReactionRegistry:
    """Collection of programmed reactions for a topic.
    
    Cooldowns use event timestamps from state (not wall-clock time)
    so behavior is consistent even if the graph is replayed via checkpointing.
    """

    def __init__(self, topic_id: str, reactions: list[Reaction]):
        self.topic_id = topic_id
        self.reactions = reactions
        self._fired: dict[str, float] = {}  # reaction_id → last fired timestamp

    def lookup(
        self,
        event: SimulationEvent,
        context: dict[str, Any],
    ) -> tuple[Optional[Reaction], bool]:
        """
        Find the highest-priority matching reaction.
        Returns (reaction, needs_ai).
        If no match: (None, True) — escalate to AI.
        If match with escalate_to_ai: (reaction, True) — AI gets the hint.
        If match without escalate: (reaction, False) — use programmed response.
        """
        matches: list[Reaction] = []

        for reaction in self.reactions:
            if self._is_on_cooldown(reaction, event.timestamp):
                continue
            if reaction.one_shot and reaction.id in self._fired:
                continue
            if self._matches(reaction.trigger, event, context):
                matches.append(reaction)

        if not matches:
            return (None, True)

        best = max(matches, key=lambda r: r.response.priority)
        self._fired[best.id] = event.timestamp

        if best.escalate_to_ai:
            return (best, True)

        return (best, False)

    def _matches(
        self, pattern: EventPattern, event: SimulationEvent, context: dict
    ) -> bool:
        if pattern.event != "*" and pattern.event != event.type:
            return False

        for key, expected in pattern.conditions.items():
            if "__" in key:
                field_name, op = key.rsplit("__", 1)
            else:
                field_name, op = key, "eq"

            actual = event.data.get(field_name, context.get(field_name))
            if actual is None:
                return False

            if op == "eq" and actual != expected:
                return False
            if op == "gte" and actual < expected:
                return False
            if op == "lte" and actual > expected:
                return False
            if op == "in" and actual not in expected:
                return False

        return True

    def _is_on_cooldown(self, reaction: Reaction, current_timestamp: float) -> bool:
        """Uses event timestamps, not wall-clock time, for checkpoint safety."""
        if reaction.cooldown_seconds is None:
            return False
        last = self._fired.get(reaction.id)
        if last is None:
            return False
        return (current_timestamp - last) < (reaction.cooldown_seconds * 1000)


# ── Topic Config ────────────────────────────────────────

@dataclass
class TopicConfig:
    """Complete configuration for a single topic.
    
    This object is NEVER placed in graph state. It is injected
    via closure when building the graph. See §5.4.
    """
    id: str
    level: int
    age_range: tuple[int, int]

    pedagogical_prompt: str
    knowledge_context: str
    chat_system_prompt: str

    suggested_questions: dict[str, list[str]]
    spotlight_id: Optional[str] = None
    spotlight_trigger: Optional[str] = None

    extra_emotions: list[str] = field(default_factory=list)
    extra_animations: list[str] = field(default_factory=list)


# ── AI Tool for Generating Reactions ────────────────────

def make_emit_reaction_tool(
    allowed_emotions: list[str],
    allowed_animations: list[str],
):
    """
    Creates the tool function the AI calls to emit a reaction.
    Constrained to the topic's allowed emotion/animation sets.
    """
    from langchain_core.tools import tool

    @tool
    def emit_reaction(
        message: str,
        emotion: str,
        animation: str = "none",
        type: str = "observation",
        sound: Optional[str] = None,
        suggestions: Optional[list[str]] = None,
        auto_expire_ms: int = 4000,
    ) -> dict:
        """Emit a companion reaction to the student. Use this to respond
        to what the student is doing in the simulation."""
        if emotion not in allowed_emotions:
            emotion = "idle"
        if animation not in allowed_animations:
            animation = "none"

        return ReactionPayload(
            message=message,
            emotion=emotion,
            animation=animation,
            type=type,
            sound=sound,
            suggestions=suggestions,
            auto_expire_ms=auto_expire_ms,
            source="ai",
        ).__dict__

    return emit_reaction
```

### 5.3 Frontend Hook Patterns

```typescript
// ═══════════════════════════════════════════════════════════
// TopicRunner — The universal wrapper component
// ═══════════════════════════════════════════════════════════

import { useCoAgent } from "@copilotkit/react-core";
import { useCopilotChat } from "@copilotkit/react-core";
import { useCopilotReadable } from "@copilotkit/react-core";
import { useCopilotAction } from "@copilotkit/react-core";
import { Role, TextMessage } from "@copilotkit/runtime-client-gql";
import { useState, useCallback, useRef, useEffect, createContext } from "react";

// ── Sound Manager Context ───────────────────────────────
// Built once into the framework, not recreated per topic

interface SoundManagerContextType {
  play: (key: string) => void;
  setAmbient: (key: string, volume: number) => void;
  stopAll: () => void;
}

const SoundManagerContext = createContext<SoundManagerContextType | null>(null);

// ── Topic Runner ────────────────────────────────────────

interface TopicRunnerProps<SimState extends Record<string, unknown>> {
  config: TopicConfig<SimState>;
  SimulationComponent: React.ComponentType<SimulationProps<SimState>>;
}

function TopicRunner<SimState extends Record<string, unknown>>({
  config,
  SimulationComponent,
}: TopicRunnerProps<SimState>) {

  // ── Channel 1 & 2: CoAgent (shared state) ────────────
  //
  // IMPORTANT: Zone separation is enforced by convention.
  // - handleSimStateChange only writes to simulation + events
  // - The backend only writes to companion (via copilotkit_emit_state)
  // - We always spread the zone we don't own to avoid overwrites

  const { state, setState } = useCoAgent<CoAgentState<SimState>>({
    name: `observation-${config.id}`,
    initialState: {
      simulation: config.initialSimulationState,
      events: { latest: null, history: [] },
      companion: {
        currentReaction: null,
        reactionHistory: [],
        progress: config.initialProgress,
        spotlightUnlocked: false,
        suggestedQuestions: [],
      },
    },
  });

  // ── Channel 3: Chat (headless) ────────────────────────

  const {
    visibleMessages,
    appendMessage,
    isLoading: chatIsLoading,
  } = useCopilotChat();

  // ── Bridge: Readable context for chat ─────────────────
  // Uses categories to separate observation vs chat context

  useCopilotReadable({
    description: "Current simulation state for the learning topic",
    value: {
      topic: config.id,
      ageRange: config.ageRange,
      simulationState: state.simulation,
    },
    categories: ["observation", "chat"],
  });

  useCopilotReadable({
    description: "Learning progress, reaction history, and companion context",
    value: {
      progress: state.companion.progress,
      reactionHistory: state.companion.reactionHistory,
      lastReaction: state.companion.currentReaction,
      spotlightUnlocked: state.companion.spotlightUnlocked,
    },
    categories: ["chat"],
  });

  // ── Event trigger: useCopilotAction ───────────────────
  //
  // This is how the frontend tells the observation agent to run.
  // The frontend decides WHEN to call this — the backend just processes
  // whatever event arrives. This gives full control over debouncing,
  // throttling, and filtering to the frontend.

  useCopilotAction({
    name: "processSimulationEvent",
    description: "Process a meaningful simulation event and generate a companion reaction",
    available: "remote",
    parameters: [
      {
        name: "eventType",
        type: "string",
        description: "The classified event type",
        required: true,
      },
      {
        name: "eventData",
        type: "object",
        description: "Event-specific data payload",
        required: true,
      },
    ],
    handler: async ({ eventType, eventData }) => {
      // The action triggers the observation agent on the backend.
      // The handler returns the event data for the agent to process.
      return { eventType, eventData, simulationState: state.simulation };
    },
  });

  // ── Simulation state handler ──────────────────────────
  // Frontend writes to Zone 1 only, always preserving Zone 2

  const handleSimStateChange = useCallback(
    (partial: Partial<SimState>) => {
      setState((prev) => ({
        ...prev,
        simulation: { ...prev.simulation, ...partial },
        // Zone 2 (companion) is untouched
      }));
    },
    [setState]
  );

  // ── Event emitter (debounced + triggers backend) ──────

  const eventDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const eventCountsRef = useRef<Record<string, number>>({});

  const handleEvent = useCallback(
    (event: Omit<SimulationEvent, "timestamp">) => {
      const fullEvent: SimulationEvent = {
        ...event,
        timestamp: Date.now(),
      };

      // Track event counts on the frontend for threshold decisions
      const count = (eventCountsRef.current[event.type] ?? 0) + 1;
      eventCountsRef.current[event.type] = count;
      fullEvent.data = { ...fullEvent.data, times_seen: count };

      // Debounce rapid events
      if (eventDebounceRef.current) {
        clearTimeout(eventDebounceRef.current);
      }
      eventDebounceRef.current = setTimeout(() => {
        // 1. Write to state (for history tracking)
        setState((prev) => ({
          ...prev,
          events: {
            latest: fullEvent,
            history: [...prev.events.history, fullEvent],
          },
        }));

        // 2. Trigger the observation agent via the action
        //    The action is defined as "remote" so it runs on the backend agent
        appendMessage(
          new TextMessage({
            content: JSON.stringify({
              action: "processSimulationEvent",
              eventType: event.type,
              eventData: fullEvent.data,
            }),
            role: Role.User,
          }),
        );
      }, config.eventDebounceMs ?? 150);
    },
    [setState, appendMessage, config.eventDebounceMs]
  );

  // ── Reaction display management ───────────────────────
  // Auto-dismiss reactions after their expiry time

  const [displayedReaction, setDisplayedReaction] =
    useState<ReactionPayload | null>(null);

  useEffect(() => {
    const reaction = state.companion.currentReaction;
    if (!reaction) return;

    if (
      !displayedReaction ||
      reaction.timestamp !== displayedReaction.timestamp
    ) {
      setDisplayedReaction(reaction);

      if (reaction.autoExpireMs > 0) {
        const timer = setTimeout(() => {
          setDisplayedReaction(null);
        }, reaction.autoExpireMs);
        return () => clearTimeout(timer);
      }
    }
  }, [state.companion.currentReaction]);

  // ── Chat panel state ──────────────────────────────────

  const [chatOpen, setChatOpen] = useState(false);

  // ── Render ────────────────────────────────────────────

  return (
    <SoundManagerContext.Provider value={soundManager}>
      <div className="topic-runner">
        {/* The interactive simulation — takes up most of the screen */}
        <SimulationComponent
          state={state.simulation}
          onStateChange={handleSimStateChange}
          onEvent={handleEvent}
        />

        {/* The companion character — bottom-right corner */}
        <Companion
          reaction={displayedReaction}
          onSuggestionTap={(question) => {
            setChatOpen(true);
            appendMessage(
              new TextMessage({ content: question, role: Role.User })
            );
          }}
          onCompanionTap={() => setChatOpen(true)}
        />

        {/* Spotlight card — top-left, appears when unlocked */}
        {state.companion.spotlightUnlocked && config.spotlightContent && (
          <SpotlightCard config={config.spotlightContent} />
        )}

        {/* Chat overlay — opens when kid taps companion or suggestion */}
        {chatOpen && (
          <ChatOverlay
            messages={visibleMessages}
            onSend={(text) =>
              appendMessage(new TextMessage({ content: text, role: Role.User }))
            }
            onClose={() => setChatOpen(false)}
            isLoading={chatIsLoading}
          />
        )}
      </div>
    </SoundManagerContext.Provider>
  );
}
```

### 5.4 LangGraph Agent Scaffolds (Python)

**Key design decisions:**
- `TopicConfig` and `ReactionRegistry` are injected via **closures** — they never touch graph state
- Agent state extends **`CopilotKitState`** — required for CopilotKit to inject frontend actions and manage messages
- Reactions are pushed to the frontend via **`copilotkit_emit_state`** for real-time display
- Routing uses **`Command`** for cleaner state+goto in a single return
- Observation and Chat are **separate compiled graphs** served as separate agents

```python
# ═══════════════════════════════════════════════════════════
# Observation Agent — processes simulation events
# ═══════════════════════════════════════════════════════════

import time
from typing import Any, Literal
from langgraph.graph import StateGraph, START, END
from langgraph.types import Command
from langchain_core.runnables import RunnableConfig
from langchain_core.messages import SystemMessage
from langchain_openai import ChatOpenAI
from copilotkit import CopilotKitState
from copilotkit.langgraph import copilotkit_emit_state


# ── Agent State ──────────────────────────────────────────
# Extends CopilotKitState which provides `messages` and `copilotkit` (actions)
# Only contains data that needs to sync with the frontend.

class ObservationAgentState(CopilotKitState):
    """State synced with frontend. No config objects here."""
    simulation: dict[str, Any]
    events: dict[str, Any]
    companion: dict[str, Any]
    # Internal routing fields (small, transient)
    _pending_reaction: dict[str, Any] | None
    _ai_hint: str | None
    _event_counts: dict[str, int]


# ── Build the graph with config injected via closure ─────

def build_observation_graph(
    topic_config: TopicConfig,
    reaction_registry: ReactionRegistry,
):
    """
    Build the observation agent graph. TopicConfig and ReactionRegistry
    are captured by closure — they never appear in graph state.
    """

    # Pre-compute allowed emotions/animations for the AI tool
    all_emotions = [e.value for e in BaseEmotion] + topic_config.extra_emotions
    all_animations = [a.value for a in BaseAnimation] + topic_config.extra_animations

    # ── Nodes ────────────────────────────────────────────

    def event_classifier(state: ObservationAgentState) -> dict:
        """Classify the incoming event and update event counts."""
        event = state["events"].get("latest")
        if not event:
            return {}

        event_type = event["type"]
        counts = state.get("_event_counts", {})
        counts[event_type] = counts.get(event_type, 0) + 1
        event["data"]["times_seen"] = counts[event_type]

        return {"_event_counts": counts, "events": state["events"]}

    def reaction_lookup(
        state: ObservationAgentState,
    ) -> Command[Literal["ai_reasoning", "deliver_reaction"]]:
        """Look up programmed reaction. Route via Command."""
        event = state["events"].get("latest")
        if not event:
            return Command(goto="deliver_reaction", update={"_pending_reaction": None})

        sim_event = SimulationEvent(
            type=event["type"],
            timestamp=event["timestamp"],
            data=event.get("data", {}),
        )

        # Build context from state (config accessed via closure, not state)
        context = {
            **state["simulation"],
            **state["companion"].get("progress", {}),
            "times_seen": event["data"].get("times_seen", 1),
            "reaction_history": state["companion"].get("reactionHistory", []),
        }

        # Registry accessed via closure
        reaction, needs_ai = reaction_registry.lookup(sim_event, context)

        if not needs_ai and reaction:
            payload = reaction.response
            payload.reaction_id = reaction.id
            payload.timestamp = time.time()
            return Command(
                goto="deliver_reaction",
                update={"_pending_reaction": payload.__dict__},
            )
        else:
            return Command(
                goto="ai_reasoning",
                update={
                    "_ai_hint": reaction.ai_hint if reaction else None,
                    "_pending_reaction": None,
                },
            )

    async def ai_reasoning(
        state: ObservationAgentState, config: RunnableConfig
    ) -> dict:
        """LLM decides what the companion should do."""
        hint = state.get("_ai_hint", "")

        # topic_config accessed via closure
        prompt = f"""{topic_config.pedagogical_prompt}

CURRENT SIMULATION STATE:
{state["simulation"]}

EVENT THAT TRIGGERED THIS:
{state["events"].get("latest")}

REACTIONS ALREADY SHOWN:
{state["companion"].get("reactionHistory", [])}

ADDITIONAL CONTEXT:
{hint}

Decide if the companion should react. If yes, call the emit_reaction tool.
If the moment doesn't warrant a reaction, do nothing."""

        tool = make_emit_reaction_tool(all_emotions, all_animations)
        model = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)
        model_with_tool = model.bind_tools([tool])

        response = await model_with_tool.ainvoke(
            [SystemMessage(content=prompt)], config
        )

        # Extract tool call result if present
        if hasattr(response, "tool_calls") and response.tool_calls:
            tool_call = response.tool_calls[0]
            payload = tool_call.get("args", {})
            payload["source"] = "ai"
            payload["reaction_id"] = f"ai-{int(time.time())}"
            payload["timestamp"] = time.time()
            return {"_pending_reaction": payload}

        return {"_pending_reaction": None}

    async def deliver_reaction(
        state: ObservationAgentState, config: RunnableConfig
    ) -> dict:
        """Write the reaction to companion state and emit immediately."""
        pending = state.get("_pending_reaction")
        if not pending:
            return {}

        companion = {**state["companion"]}
        companion["currentReaction"] = pending
        companion["reactionHistory"] = companion.get("reactionHistory", []) + [
            pending.get("reaction_id", "")
        ]

        if pending.get("progress_update"):
            progress = {**companion.get("progress", {})}
            progress.update(pending["progress_update"])
            companion["progress"] = progress

        if pending.get("unlock_spotlight"):
            companion["spotlightUnlocked"] = True

        # Push to frontend immediately — don't wait for node completion
        await copilotkit_emit_state(config, {"companion": companion})

        return {"companion": companion}

    # ── Assemble the graph ───────────────────────────────

    graph = StateGraph(ObservationAgentState)

    graph.add_node("event_classifier", event_classifier)
    graph.add_node("reaction_lookup", reaction_lookup)
    graph.add_node("ai_reasoning", ai_reasoning)
    graph.add_node("deliver_reaction", deliver_reaction)

    graph.add_edge(START, "event_classifier")
    graph.add_edge("event_classifier", "reaction_lookup")
    # reaction_lookup uses Command for routing — no conditional edges needed
    graph.add_edge("ai_reasoning", "deliver_reaction")
    graph.add_edge("deliver_reaction", END)

    return graph.compile()


# ═══════════════════════════════════════════════════════════
# Chat Agent — answers questions in context
# ═══════════════════════════════════════════════════════════

def build_chat_graph(topic_config: TopicConfig):
    """
    Build the chat agent graph. TopicConfig injected via closure.
    """

    class ChatAgentState(CopilotKitState):
        simulation: dict[str, Any]
        companion: dict[str, Any]

    async def conversational_response(
        state: ChatAgentState, config: RunnableConfig
    ) -> Command:
        """Generate chat response using LLM with full simulation context."""

        # topic_config accessed via closure
        system_msg = f"""{topic_config.chat_system_prompt}

CURRENT SIMULATION STATE:
{state.get("simulation", {})}

STUDENT PROGRESS:
{state.get("companion", {}).get("progress", {})}

REACTIONS ALREADY SHOWN (don't repeat these):
{state.get("companion", {}).get("reactionHistory", [])}

TOPIC KNOWLEDGE:
{topic_config.knowledge_context}"""

        model = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)
        response = await model.ainvoke(
            [SystemMessage(content=system_msg), *state["messages"]],
            config,
        )

        return Command(goto=END, update={"messages": [response]})

    graph = StateGraph(ChatAgentState)
    graph.add_node("respond", conversational_response)
    graph.add_edge(START, "respond")

    return graph.compile()
```

---

## 6. Full Example: Changing States (Level 1, Ages 6–8)

### 6.1 State Schema

```typescript
interface ChangingStatesSimState {
  temperature: number;            // 0–100, maps to slider position
  phase: "solid" | "liquid" | "gas";
  particleSpeed: number;          // Derived from temperature
  sliderActive: boolean;          // Is the kid currently dragging?
}

type ChangingStatesEmotion = never;  // No extras needed
type ChangingStatesAnimation = "shiver" | "melt";

// Meaningful events:
// "phase_change"      → { from: Phase, to: Phase }
// "dwell_timeout"     → { phase: Phase, seconds: number }
// "first_interaction"  → {}
// "reversal"          → { previousDirection: "heating" | "cooling" }
// "rapid_cycling"     → { transitionsInWindow: number }
// "milestone"         → { all_phases_visited: boolean }
// "spotlight_tap"     → {}
// "idle_timeout"      → { seconds: number }
```

### 6.2 Simulation Component Behavior (Design Spec)

The simulation is a single React component that manages a canvas-based particle system and a slider input. No AI logic inside it.

**Layout**: Full-width beaker (canvas) taking ~70% of screen height. Temperature slider below it, spanning full width. Slider thumb is 48px minimum, styled as a gradient from blue (left) to red (right).

**Particle physics** (all local, 60fps):
- `temperature 0–33`: Particles in tight grid, tiny vibrations. Visual: solid block. Background: icy blue.
- `temperature 34–66`: Particles loosely spaced, moderate random movement. Visual: liquid with surface wobble. Background: neutral.
- `temperature 67–100`: Particles flying apart, high velocity, bouncing off walls. Visual: steam wisps rising. Background: warm red tint.
- Phase boundaries at 33 and 67: particles visibly reorganize over ~0.5s transition animation.

**Event emissions**: The component calls `onEvent` with debounced, classified events. The `TopicRunner` handles triggering the backend.

**Sound hooks**: The component calls a sound manager (provided via `SoundManagerContext`) with keys like `ice_crackle`, `water_bubble`, `steam_hiss`, `transition_chime`.

### 6.3 Reaction Registry

```python
changing_states_reactions = ReactionRegistry(
    topic_id="changing-states",
    reactions=[

        # ═══════════════════════════════════════════════════
        # FIRST INTERACTIONS
        # ═══════════════════════════════════════════════════

        Reaction(
            id="welcome",
            trigger=EventPattern(event="first_interaction"),
            response=ReactionPayload(
                message="Ooh, try sliding it! See what happens to the tiny particles!",
                emotion="excited",
                animation="point",
                sound="gentle_chime",
                type="prompt",
                priority=20,
                auto_expire_ms=5000,
            ),
            one_shot=True,
        ),

        # ═══════════════════════════════════════════════════
        # PHASE TRANSITIONS — First time each
        # ═══════════════════════════════════════════════════

        Reaction(
            id="first_solid_to_liquid",
            trigger=EventPattern(
                event="phase_change",
                conditions={"from": "solid", "to": "liquid", "times_seen": 1},
            ),
            response=ReactionPayload(
                message="Whoa! You melted it! See how the particles started moving apart?",
                emotion="excited",
                animation="bounce",
                sound="discovery_chime",
                type="observation",
                priority=15,
                auto_expire_ms=5000,
            ),
            one_shot=True,
        ),

        Reaction(
            id="first_liquid_to_gas",
            trigger=EventPattern(
                event="phase_change",
                conditions={"from": "liquid", "to": "gas", "times_seen": 1},
            ),
            response=ReactionPayload(
                message="It's boiling! The particles are zooming everywhere!",
                emotion="excited",
                animation="bounce",
                sound="discovery_chime",
                type="observation",
                priority=15,
                auto_expire_ms=5000,
            ),
            one_shot=True,
        ),

        Reaction(
            id="first_liquid_to_solid",
            trigger=EventPattern(
                event="phase_change",
                conditions={"from": "liquid", "to": "solid", "times_seen": 1},
            ),
            response=ReactionPayload(
                message="You froze it back! The particles snapped right back together!",
                emotion="impressed",
                animation="nod",
                sound="gentle_chime",
                type="observation",
                priority=15,
                auto_expire_ms=5000,
            ),
            one_shot=True,
        ),

        Reaction(
            id="first_gas_to_liquid",
            trigger=EventPattern(
                event="phase_change",
                conditions={"from": "gas", "to": "liquid", "times_seen": 1},
            ),
            response=ReactionPayload(
                message="You caught the steam! It turned back into a liquid — that's called condensation!",
                emotion="impressed",
                animation="nod",
                sound="gentle_chime",
                type="observation",
                priority=15,
                auto_expire_ms=5000,
            ),
            one_shot=True,
        ),

        # ═══════════════════════════════════════════════════
        # PHASE TRANSITIONS — Repeated (escalate to AI)
        # ═══════════════════════════════════════════════════

        Reaction(
            id="repeat_transition_escalate",
            trigger=EventPattern(
                event="phase_change",
                conditions={"times_seen__gte": 4},
            ),
            response=ReactionPayload(
                emotion="watching",
                type="observation",
                priority=3,
                auto_expire_ms=0,
            ),
            escalate_to_ai=True,
            ai_hint=(
                "The student has triggered several phase transitions now. "
                "They seem to be experimenting freely. Consider acknowledging "
                "their exploration pattern, asking what they notice, or staying "
                "quiet if they seem focused. Keep it to one short sentence max."
            ),
            cooldown_seconds=20,
        ),

        # ═══════════════════════════════════════════════════
        # DWELL TIMEOUTS
        # ═══════════════════════════════════════════════════

        Reaction(
            id="dwell_solid",
            trigger=EventPattern(
                event="dwell_timeout",
                conditions={"phase": "solid", "seconds__gte": 8},
            ),
            response=ReactionPayload(
                message="What do you think happens if you warm it up? Slide to the right!",
                emotion="curious",
                animation="tilt_head",
                type="prompt",
                priority=5,
                auto_expire_ms=6000,
            ),
            cooldown_seconds=30,
        ),

        Reaction(
            id="dwell_liquid",
            trigger=EventPattern(
                event="dwell_timeout",
                conditions={"phase": "liquid", "seconds__gte": 10},
            ),
            response=ReactionPayload(
                suggestions=[
                    "Can you find the exact spot where it melts?",
                    "What happens if you keep heating it?",
                ],
                emotion="curious",
                animation="tilt_head",
                type="suggestion",
                priority=4,
                auto_expire_ms=10000,
            ),
            cooldown_seconds=30,
        ),

        Reaction(
            id="dwell_gas",
            trigger=EventPattern(
                event="dwell_timeout",
                conditions={"phase": "gas", "seconds__gte": 8},
            ),
            response=ReactionPayload(
                message="What do you think happens if you cool it back down? Try it!",
                emotion="curious",
                animation="tilt_head",
                type="prompt",
                priority=5,
                auto_expire_ms=6000,
            ),
            cooldown_seconds=30,
        ),

        # ═══════════════════════════════════════════════════
        # INTERACTION PATTERNS
        # ═══════════════════════════════════════════════════

        Reaction(
            id="reversal_first",
            trigger=EventPattern(
                event="reversal",
                conditions={"times_seen": 1},
            ),
            response=ReactionPayload(
                message="Oh, you went backwards! It changes both ways — cool, right?",
                emotion="impressed",
                animation="nod",
                type="observation",
                priority=8,
                auto_expire_ms=4000,
            ),
            one_shot=True,
        ),

        Reaction(
            id="rapid_cycling",
            trigger=EventPattern(event="rapid_cycling"),
            response=ReactionPayload(
                emotion="watching",
                type="observation",
                priority=2,
                auto_expire_ms=0,
            ),
            escalate_to_ai=True,
            ai_hint=(
                "The student is rapidly cycling the slider back and forth through "
                "multiple transitions. They might be playing, testing, or exploring "
                "the transition boundaries. This is good experimental behavior. "
                "Consider a brief, encouraging comment. Max one sentence."
            ),
            cooldown_seconds=30,
        ),

        # ═══════════════════════════════════════════════════
        # MILESTONES
        # ═══════════════════════════════════════════════════

        Reaction(
            id="all_phases_discovered",
            trigger=EventPattern(
                event="milestone",
                conditions={"all_phases_visited": True},
            ),
            response=ReactionPayload(
                message="You discovered all three states of matter! Solid, liquid, and gas — you're a real scientist!",
                emotion="celebrating",
                animation="confetti",
                sound="achievement",
                type="milestone",
                priority=20,
                auto_expire_ms=8000,
                unlock_spotlight=True,
                progress_update={
                    "all_phases_discovered": True,
                    "spotlight_available": True,
                },
                suggestions=[
                    "What was the coolest change?",
                    "Where does the steam go?",
                ],
            ),
            one_shot=True,
        ),

        # ═══════════════════════════════════════════════════
        # SPOTLIGHT
        # ═══════════════════════════════════════════════════

        Reaction(
            id="spotlight_engaged",
            trigger=EventPattern(event="spotlight_tap"),
            response=ReactionPayload(
                message="Pressure cookers are so cool — they trap the steam to cook food faster!",
                emotion="excited",
                animation="bounce",
                type="observation",
                priority=10,
                auto_expire_ms=5000,
                progress_update={"spotlight_viewed": True},
            ),
            one_shot=True,
        ),

        # ═══════════════════════════════════════════════════
        # IDLE / INACTIVITY
        # ═══════════════════════════════════════════════════

        Reaction(
            id="idle_nudge",
            trigger=EventPattern(
                event="idle_timeout",
                conditions={"seconds__gte": 30},
            ),
            response=ReactionPayload(
                message="Hey! Try moving the slider — I wonder what will happen!",
                emotion="encouraging",
                animation="wave",
                type="prompt",
                priority=6,
                auto_expire_ms=6000,
            ),
            cooldown_seconds=60,
        ),
    ],
)
```

### 6.4 Topic Config

```python
changing_states_config = TopicConfig(
    id="changing-states",
    level=1,
    age_range=(6, 8),

    pedagogical_prompt="""You are a friendly science companion for a 6-8 year old.
You are watching them interact with a states-of-matter simulation where they
control temperature with a slider and see particles change behavior.

LEARNING OBJECTIVES:
- Matter exists in three states: solid, liquid, gas
- Heating makes particles move faster and spread apart
- Cooling makes particles slow down and come together
- Changes between states are reversible

PERSONALITY:
- You are excited about science, like a fun older sibling
- You use simple words (no jargon unless you explain it)
- You speak in 1 sentence, 2 max
- You ask questions that make the kid want to try something
- You celebrate discoveries with genuine enthusiasm
- You NEVER lecture or explain for more than one sentence
- You connect what you say to what the kid can SEE happening

DECISION RULES:
- If the kid is actively experimenting (slider moving), stay quiet
- Only speak at natural pause moments
- Never repeat something already in the reaction history
- If the kid seems stuck, suggest an action with the slider
- If the kid is playing/having fun, let them play
""",

    knowledge_context="""States of Matter (simplified for ages 6-8):

Everything is made of tiny particles too small to see.
- SOLID: Particles are packed tightly together, barely moving. They vibrate 
  in place. That is why solids keep their shape. Ice is water as a solid.
- LIQUID: Particles are close but can slide past each other. They move 
  around slowly. That is why liquids take the shape of their container. 
  Water you drink is a liquid.
- GAS: Particles are far apart and zoom around really fast. They spread 
  out to fill any space. Steam from a kettle is water as a gas.

Temperature is how fast the particles are moving. 
Hot = fast particles. Cold = slow particles.

MELTING: solid → liquid (ice melting into water)
BOILING: liquid → gas (water boiling into steam)
CONDENSATION: gas → liquid (steam on a cold mirror)
FREEZING: liquid → solid (water turning to ice)

Fun fact: A pressure cooker traps steam inside a sealed pot. The trapped 
steam builds up pressure, which makes the water boil at a higher 
temperature, so food cooks faster.""",

    chat_system_prompt="""You are a friendly science buddy helping a 6-8 year old 
learn about states of matter. They are playing with an interactive simulation 
where they control temperature with a slider.

RULES:
- Use very simple words. A 6-year-old should understand every word.
- Max 2-3 sentences per response.
- Connect your answers to the simulation: "Try sliding to..." "Look at the particles when..."
- If they ask something beyond the topic, gently redirect: "That's a great question! 
  For now, let's figure out what happens when..."
- Be warm, curious, and encouraging. Never condescending.
- If you mention a scientific term, immediately explain it: "That's called condensation — 
  it's when gas turns back into liquid!"
""",

    suggested_questions={
        "solid": [
            "Why are the particles so still?",
            "What happens when things get really, really cold?",
        ],
        "liquid": [
            "Can you find the exact spot where it melts?",
            "Why can liquids pour but solids can't?",
        ],
        "gas": [
            "Where does the steam go?",
            "Why do the particles fly apart?",
        ],
        "all_phases_discovered": [
            "What was the coolest change to watch?",
            "Can you change it back and forth?",
        ],
    },

    spotlight_id="pressure-cooker",
    spotlight_trigger="all_phases_discovered",

    extra_emotions=[],
    extra_animations=["shiver", "melt"],
)
```

### 6.5 Wiring It Up

```python
# agent/main.py — LangGraph agent entry point

from copilotkit import CopilotKitRemoteEndpoint, LangGraphAgent

# Build both graphs with config injected via closure
observation_graph = build_observation_graph(
    changing_states_config, changing_states_reactions
)
chat_graph = build_chat_graph(changing_states_config)

# Expose via CopilotKit
sdk = CopilotKitRemoteEndpoint(
    agents=[
        LangGraphAgent(
            name="observation-changing-states",
            description="Observes simulation events and delivers companion reactions",
            graph=observation_graph,
        ),
        LangGraphAgent(
            name="chat-changing-states",
            description="Answers questions about states of matter for ages 6-8",
            graph=chat_graph,
        ),
    ]
)
```

```json
// agent/langgraph.json — LangGraph CLI configuration
{
  "python_version": "3.12",
  "dependencies": ["."],
  "package_manager": "uv",
  "graphs": {
    "observation-changing-states": "./main.py:observation_graph",
    "chat-changing-states": "./main.py:chat_graph"
  },
  "env": ".env"
}
```

```tsx
// pages/topics/changing-states.tsx — Frontend entry

import { CopilotKit } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";
import { TopicRunner } from "@/framework/TopicRunner";
import { ChangingStatesSimulation } from "@/topics/changing-states/Simulation";
import { changingStatesConfig } from "@/topics/changing-states/config";

export default function ChangingStatesPage() {
  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      agent="observation-changing-states"
      // threadId={sessionId} — set this to resume progress across sessions
    >
      <TopicRunner
        config={changingStatesConfig}
        SimulationComponent={ChangingStatesSimulation}
      />
    </CopilotKit>
  );
}
```

---

## 7. Creating the Next Topic

The workflow is always the same:

**1. State Schema** — What does the kid control? What events matter?

**2. Build the simulation** — Interactive component. No AI code.

**3. Author reactions** — Programmed responses for all known learning moments.

**4. Topic config** — Prompts, knowledge, questions, age range.

**5. Plug in** — Build graphs with closure injection, register with CopilotKit, wrap in `TopicRunner`.

The companion behaves identically. The chatbox works identically. The reaction pipeline works identically. The emotion system works identically. Only the simulation, the state, the reactions, and the prompts are new.

---

## 8. Session Persistence

CopilotKit supports session persistence via `threadId`. When a `threadId` is set on the `<CopilotKit>` component, all agent state (including companion progress, reaction history, and chat messages) is restored from the database.

```tsx
<CopilotKit
  runtimeUrl="/api/copilotkit"
  agent="observation-changing-states"
  threadId="2140b272-7180-410d-9526-f66210918b13"  // Must be a valid UUID
>
```

This maps directly to learning progress: each student session gets a `threadId`, and returning to the topic resumes where they left off.

---

## 9. Key Decisions Summary

| Decision | Choice | Rationale |
|---|---|---|
| Agent count | Two separate agents (observation + chat) | LangGraph has single START; separate agents avoid routing hacks |
| Event triggering | `useCopilotAction` on frontend | Frontend controls when backend runs; no wasted cycles on every frame |
| Backend state base | `CopilotKitState` | Required for CopilotKit to inject actions, manage messages |
| Config injection | Closures, not graph state | Prevents serializing large static config to frontend on every sync |
| Real-time reactions | `copilotkit_emit_state` | Pushes companion updates before node completion; eliminates AI latency |
| Graph routing | `Command` class | Cleaner than conditional edges — combines state update + goto |
| Chat UI | Separate chatbox overlay (headless `useCopilotChat`) | Keeps simulation uncluttered; chat is secondary to exploration |
| AI vs Programmed | ~90% programmed, ~10% AI via escalation | Instant response, low cost, curriculum-designer control, AI for novelty |
| Context sharing | `useCopilotReadable` with categories | Chat agent sees full context; observation agent sees only what it needs |
| Cooldown timing | Event timestamps, not wall-clock | Safe for checkpoint replay; consistent behavior across executions |
| Session persistence | CopilotKit `threadId` | Restores progress, reaction history, chat across sessions |
| Sound management | `SoundManagerContext` provider in framework | Built once, available to all simulations via React context |
