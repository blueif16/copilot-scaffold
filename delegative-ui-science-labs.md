# Delegative UI: Building Agent-Native Interfaces
### A Scaffold Guide with CopilotKit + AG-UI + LangGraph

> **Core concept:** In Conversational UI you *ask* an AI a question.  
> In Delegative UI you *assign* an AI a goal — and the interface assembles itself around the task in real time.

---

## Table of Contents

1. [Mental Model](#1-mental-model)
2. [The Stack](#2-the-stack)
3. [Protocol Layer: AG-UI](#3-protocol-layer-ag-ui)
4. [Agent Runtime: LangGraph](#4-agent-runtime-langgraph)
5. [Frontend Runtime: CopilotKit](#5-frontend-runtime-copilotkit)
6. [Core Patterns](#6-core-patterns)
7. [Lab Architecture](#7-lab-architecture)
8. [Lab 1 — Solids, Liquids & Gases](#lab-1--solids-liquids--gases)
9. [Lab 2 — Wheel & Axle](#lab-2--wheel--axle)
10. [Lab 3 — Light & Shadows](#lab-3--light--shadows)
11. [Full Agent Graph](#11-full-agent-graph)
12. [Project Setup](#12-project-setup)
13. [Key References](#13-key-references)

---

## 1. Mental Model

Traditional apps hardcode every screen. Delegative UI registers *component capabilities* — then lets the agent decide which component to surface, when, and with what data.

```
User says: "I want to explore how ice cream is made"
                    │
        ┌───────────▼──────────────┐
        │    LangGraph agent       │  ← reasons about intent
        │  picks: lab_selector +   │
        │  ice_cream_maker widget  │
        └───────────┬──────────────┘
                    │ AG-UI SSE stream
        ┌───────────▼──────────────┐
        │  CopilotKit frontend     │  ← renders pre-built React widget
        │  IceCreamMakerWidget     │
        │  + LabNavCard            │
        └──────────────────────────┘
```

The user never navigated anywhere. The agent changed the UI.

---

## 2. The Stack

| Layer | Technology | Role |
|---|---|---|
| Frontend runtime | **CopilotKit** (`@copilotkit/react-core`) | Registers components, syncs shared state, renders tool calls |
| Protocol | **AG-UI** (built into CopilotKit) | SSE event stream between agent and UI — 17 typed events |
| Agent runtime | **LangGraph** (Python) | Stateful graph, human-in-the-loop interrupts, streaming |
| LLM | OpenAI / Anthropic (via LangChain) | Powers agent reasoning |
| API route | Next.js App Router + CopilotRuntime | Bridges frontend ↔ LangGraph server |

### Why these three together?

- **AG-UI** was born from CopilotKit's partnership with LangGraph. The protocol is the connective tissue; CopilotKit and LangGraph are the first-party implementations on each side.
- **LangGraph** gives the agent *memory* (checkpointer), *interrupts* (HITL), and *streaming* — all three are required for rich delegative interactions.
- **CopilotKit** abstracts the SSE wiring with `useFrontendTool`, `useCoAgent`, and `useCopilotAction` so you write React, not protocol bytes.

---

## 3. Protocol Layer: AG-UI

AG-UI is a lightweight, transport-agnostic event protocol (MIT licensed). The default transport is SSE over HTTP POST. Every event is a JSON object:

```typescript
// The 5 event categories
type AGUIEvent =
  // 1. Lifecycle
  | { type: "RUN_STARTED"; runId: string; threadId: string }
  | { type: "RUN_FINISHED"; runId: string; result?: unknown }
  | { type: "STEP_STARTED"; stepName: string }
  | { type: "STEP_FINISHED"; stepName: string }
  // 2. Text streaming
  | { type: "TEXT_MESSAGE_START"; messageId: string }
  | { type: "TEXT_MESSAGE_CONTENT"; messageId: string; delta: string }
  | { type: "TEXT_MESSAGE_END"; messageId: string }
  // 3. Tool calls (component dispatch)
  | { type: "TOOL_CALL_START"; toolCallId: string; toolName: string }
  | { type: "TOOL_CALL_ARGS"; toolCallId: string; delta: string }  // streams JSON args
  | { type: "TOOL_CALL_END"; toolCallId: string }
  | { type: "TOOL_CALL_RESULT"; toolCallId: string; result: string }
  // 4. Shared state
  | { type: "STATE_SNAPSHOT"; snapshot: Record<string, unknown> }
  | { type: "STATE_DELTA"; delta: JSONPatchOp[] }  // RFC 6902 JSON Patch
  // 5. Custom (interrupts, custom events)
  | { type: "CUSTOM"; name: string; value: unknown }
```

**Key insight:** `TOOL_CALL_ARGS` *streams* JSON arguments incrementally — the UI can start rendering a component skeleton before the agent finishes "speaking". This is what makes the interface feel instantaneous.

---

## 4. Agent Runtime: LangGraph

### State definition

```python
# agent/graph.py
from typing import Literal, Optional, List, TypedDict, Annotated
from langgraph.graph import StateGraph, START, END, MessagesState
from langgraph.types import interrupt, Command
from langgraph.checkpoint.memory import MemorySaver
from langchain_openai import ChatOpenAI

class LabState(MessagesState):
    """Shared state — readable AND writable from the React frontend."""
    active_lab: Optional[Literal["states_of_matter", "wheel_axle", "light_shadows"]]
    active_module: Optional[str]          # e.g. "ice_cream_maker"
    lab_progress: dict                    # per-lab progress tracking
    student_name: Optional[str]
    pending_approval: Optional[dict]      # HITL payload
```

### Agent node

```python
from langchain_core.messages import SystemMessage
from copilotkit.langchain import copilotkit_customize_config

llm = ChatOpenAI(model="gpt-4o", temperature=0)

SYSTEM_PROMPT = """You are a science lab guide for curious learners.

You have access to these UI tools. Call them to change what the student sees:
- show_lab_selector()            → shows the three-lab navigation card
- show_ice_cream_maker()         → states-of-matter: ice cream phase-change simulation
- show_particle_simulation()     → states-of-matter: pushes and pulls particle sandbox  
- show_wheel_axle_workshop()     → wheel & axle: mesopotamian innovation explorer
- show_vehicle_designer()        → wheel & axle: build-a-vehicle sandbox
- show_camera_obscura()          → light & shadows: camera obscura interactive
- show_shadow_ar_module()        → light & shadows: shadow angle / time-of-day simulator
- request_student_approval(...)  → HITL: pause and ask student to confirm before proceeding

Rules:
- Always start with show_lab_selector() on the first message.
- When a student expresses interest in a topic, proactively call the matching UI tool.
- Narrate WHILE the component is loading — the text streams alongside the widget.
- Use request_student_approval() before advancing to a new lab section.
"""

def agent_node(state: LabState, config):
    config = copilotkit_customize_config(
        config,
        emit_intermediate_state=[{
            "state_key": "active_lab",
            "tool": "show_ice_cream_maker",
        }],
    )
    messages = [SystemMessage(content=SYSTEM_PROMPT)] + state["messages"]
    response = llm.bind_tools(all_tools).invoke(messages, config=config)
    return {"messages": [response]}
```

### HITL interrupt node

```python
def approval_node(state: LabState) -> Command[Literal["agent", END]]:
    """Pause execution and surface an approval card in the UI."""
    decision = interrupt({
        "type": "lab_advance_approval",
        "message": state.get("pending_approval", {}).get("message", "Ready to continue?"),
        "next_module": state.get("pending_approval", {}).get("next_module"),
    })
    if decision is True:
        return Command(goto="agent")
    return Command(goto=END)
```

### Graph assembly

```python
from langgraph.prebuilt import ToolNode

all_tools = [
    show_lab_selector, show_ice_cream_maker, show_particle_simulation,
    show_wheel_axle_workshop, show_vehicle_designer,
    show_camera_obscura, show_shadow_ar_module,
    request_student_approval,
]

def route_after_agent(state: LabState):
    last = state["messages"][-1]
    if last.tool_calls:
        for tc in last.tool_calls:
            if tc["name"] == "request_student_approval":
                return "approval"
        return "tools"
    return END

builder = StateGraph(LabState)
builder.add_node("agent", agent_node)
builder.add_node("tools", ToolNode(all_tools))
builder.add_node("approval", approval_node)

builder.set_entry_point("agent")
builder.add_conditional_edges("agent", route_after_agent)
builder.add_edge("tools", "agent")
builder.add_edge("approval", "agent")

graph = builder.compile(checkpointer=MemorySaver())
```

---

## 5. Frontend Runtime: CopilotKit

### Next.js API route

```typescript
// app/api/copilotkit/route.ts
import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { LangGraphAgent } from "@copilotkit/runtime/langgraph";
import { NextRequest } from "next/server";

const runtime = new CopilotRuntime({
  agents: {
    lab_guide: new LangGraphAgent({
      deploymentUrl: process.env.LANGGRAPH_URL ?? "http://localhost:8123",
      graphId: "lab_guide",
      langsmithApiKey: process.env.LANGSMITH_API_KEY,
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

### Root layout + shared state

```typescript
// app/layout.tsx
import { CopilotKit } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CopilotKit runtimeUrl="/api/copilotkit" agent="lab_guide">
          {children}
        </CopilotKit>
      </body>
    </html>
  );
}
```

### Shared state hook — the bridge

```typescript
// hooks/useLabState.ts
import { useCoAgent } from "@copilotkit/react-core";

export interface LabState {
  active_lab: "states_of_matter" | "wheel_axle" | "light_shadows" | null;
  active_module: string | null;
  lab_progress: Record<string, number>;
  student_name: string | null;
  pending_approval: { message: string; next_module: string } | null;
}

export function useLabState() {
  return useCoAgent<LabState>({
    name: "lab_guide",
    initialState: {
      active_lab: null,
      active_module: null,
      lab_progress: {},
      student_name: null,
      pending_approval: null,
    },
  });
}
```

> **The magic:** `useCoAgent` creates a bidirectional bridge. When the LangGraph agent calls `show_ice_cream_maker()` and updates `active_module`, the React component re-renders instantly — no prop drilling, no Redux, no REST call.

---

## 6. Core Patterns

### Pattern A — Static Generative UI (useFrontendTool)

The agent picks from your pre-built component catalog. Maximum design control.

```typescript
// components/LabCanvas.tsx
import { useFrontendTool } from "@copilotkit/react-core";
import { LabSelectorCard } from "./labs/LabSelectorCard";
import { IceCreamMaker } from "./labs/IceCreamMaker";
import { ParticleSimulation } from "./labs/ParticleSimulation";

export function LabCanvas() {
  // ── Lab 1 tools ──────────────────────────────────────────────
  useFrontendTool({
    name: "show_lab_selector",
    description: "Show the three-lab navigation overview card",
    parameters: {},
    render: ({ status }) => (
      <LabSelectorCard loading={status !== "complete"} />
    ),
  });

  useFrontendTool({
    name: "show_ice_cream_maker",
    description: "Show the ice cream phase-change simulation",
    parameters: {
      temperature: { type: "number", description: "Starting temperature (°C)" },
      ingredient: { type: "string", description: "Key ingredient to highlight" },
    },
    render: ({ status, args }) => (
      status === "complete"
        ? <IceCreamMaker temperature={args.temperature} ingredient={args.ingredient} />
        : <WidgetSkeleton label="Loading Ice Cream Maker…" />
    ),
  });

  useFrontendTool({
    name: "show_particle_simulation",
    description: "Show pushes and pulls particle sandbox",
    parameters: {
      state_of_matter: {
        type: "string",
        enum: ["solid", "liquid", "gas"],
        description: "Initial particle arrangement",
      },
    },
    render: ({ status, args }) => (
      status === "complete"
        ? <ParticleSimulation initialState={args.state_of_matter} />
        : <WidgetSkeleton label="Arranging particles…" />
    ),
  });

  // ── Lab 2 tools ──────────────────────────────────────────────
  useFrontendTool({
    name: "show_wheel_axle_workshop",
    description: "Show the Mesopotamian wheel & axle innovation explorer",
    parameters: { era: { type: "string", description: "Historical era to highlight" } },
    render: ({ status, args }) => (
      status === "complete"
        ? <WheelAxleWorkshop era={args.era} />
        : <WidgetSkeleton label="Spinning up history…" />
    ),
  });

  useFrontendTool({
    name: "show_vehicle_designer",
    description: "Show the vehicle design workshop sandbox",
    parameters: {},
    render: ({ status }) => (
      status === "complete"
        ? <VehicleDesigner />
        : <WidgetSkeleton label="Loading workshop…" />
    ),
  });

  // ── Lab 3 tools ──────────────────────────────────────────────
  useFrontendTool({
    name: "show_camera_obscura",
    description: "Show the interactive camera obscura",
    parameters: { scene: { type: "string", description: "Scene to project" } },
    render: ({ status, args }) => (
      status === "complete"
        ? <CameraObscura scene={args.scene} />
        : <WidgetSkeleton label="Dimming the room…" />
    ),
  });

  useFrontendTool({
    name: "show_shadow_ar_module",
    description: "Show the shadow angle / time-of-day simulator",
    parameters: {
      latitude: { type: "number" },
      time_of_day: { type: "number", description: "Hour 0-23" },
    },
    render: ({ status, args }) => (
      status === "complete"
        ? <ShadowARModule latitude={args.latitude} timeOfDay={args.time_of_day} />
        : <WidgetSkeleton label="Calculating sun angle…" />
    ),
  });

  return null; // renders inline in the CopilotSidebar / CopilotChat
}
```

### Pattern B — HITL approval card

```typescript
// components/HITLApprovalCard.tsx
import { useCopilotAction } from "@copilotkit/react-core";
import { useLabState } from "../hooks/useLabState";

export function HITLApprovalCard() {
  const { state, setState } = useLabState();

  useCopilotAction({
    name: "request_student_approval",
    description: "Pause and ask the student to confirm before advancing",
    parameters: [
      { name: "message", type: "string", required: true },
      { name: "next_module", type: "string", required: true },
    ],
    // renderAndWait pauses agent execution until the user resolves
    renderAndWait: ({ args, resolve }) => (
      <div className="approval-card">
        <p>{args.message}</p>
        <p>Ready to explore: <strong>{args.next_module}</strong>?</p>
        <button onClick={() => resolve(true)}>Yes, let's go! 🚀</button>
        <button onClick={() => resolve(false)}>Not yet</button>
      </div>
    ),
  });

  return null;
}
```

### Pattern C — Agent-driven UI action (theme / layout change)

```typescript
// The agent can change any UI property, not just content
useCopilotAction({
  name: "set_lab_theme",
  parameters: [
    { name: "primary_color", type: "string" },
    { name: "lab_id", type: "string" },
  ],
  handler: ({ primary_color, lab_id }) => {
    document.documentElement.style.setProperty("--lab-accent", primary_color);
    // e.g. purple for states-of-matter, amber for wheel-axle, teal for light-shadows
  },
});
```

---

## 7. Lab Architecture

Each lab is a self-contained React module with:
- A **discovery card** (agent shows this first)
- **Interactive widgets** (shown on demand by agent reasoning)
- **State slices** fed into `useCoAgent` shared state
- A **HITL checkpoint** before advancing

```
src/
  components/
    labs/
      LabSelectorCard.tsx          ← overview of all 3 labs
      states-of-matter/
        IceCreamMaker.tsx
        ParticleSimulation.tsx
      wheel-axle/
        WheelAxleWorkshop.tsx
        VehicleDesigner.tsx
      light-shadows/
        CameraObscura.tsx
        ShadowARModule.tsx
    HITLApprovalCard.tsx
    WidgetSkeleton.tsx
    LabCanvas.tsx                  ← registers all useFrontendTool hooks
  hooks/
    useLabState.ts
  app/
    page.tsx                       ← CopilotSidebar + LabCanvas
    api/copilotkit/route.ts
agent/
  graph.py                         ← LangGraph agent + tools
  tools.py                         ← tool definitions
  langgraph.json
```

---

## Lab 1 — Solids, Liquids & Gases

**Agent trigger phrases:** "states of matter", "ice cream", "particles", "solid liquid gas"  
**Lab accent color:** `#8B5CF6` (purple)

### Module A: Ice Cream Maker

The agent calls `show_ice_cream_maker()` when the student asks about phase changes or food science. The widget simulates temperature change and shows water molecules transitioning between states.

```typescript
// components/labs/states-of-matter/IceCreamMaker.tsx
"use client";
import { useState, useEffect } from "react";
import { useCopilotAction } from "@copilotkit/react-core";

interface Props {
  temperature: number;   // passed from agent tool call args
  ingredient: string;
}

export function IceCreamMaker({ temperature, ingredient }: Props) {
  const [temp, setTemp] = useState(temperature);
  const [phase, setPhase] = useState<"solid" | "liquid" | "gas">("liquid");

  useEffect(() => {
    if (temp < 0) setPhase("solid");
    else if (temp < 100) setPhase("liquid");
    else setPhase("gas");
  }, [temp]);

  // Agent can update the temperature while narrating
  useCopilotAction({
    name: "update_ice_cream_temperature",
    description: "Update the displayed temperature in the ice cream maker",
    parameters: [{ name: "temperature", type: "number", required: true }],
    handler: ({ temperature }) => setTemp(temperature),
  });

  const phaseColors = {
    solid: "#93C5FD",   // blue - ice
    liquid: "#FDE68A",  // yellow - cream
    gas:    "#D1FAE5",  // green - steam
  };

  return (
    <div style={{ background: phaseColors[phase] }} className="lab-widget">
      <h3>🍦 Ice Cream Maker</h3>
      <p>Featuring: <strong>{ingredient}</strong></p>

      <div className="thermometer-track">
        <input
          type="range" min={-20} max={120} value={temp}
          onChange={(e) => setTemp(Number(e.target.value))}
        />
        <span>{temp}°C</span>
      </div>

      <div className="phase-display">
        <span className="phase-label">{phase.toUpperCase()}</span>
        <MoleculeDisplay phase={phase} />
      </div>

      <p className="phase-description">{PHASE_DESCRIPTIONS[phase]}</p>
    </div>
  );
}

const PHASE_DESCRIPTIONS = {
  solid:  "At this temperature the cream freezes solid — molecules lock into place!",
  liquid: "Perfect scooping consistency — molecules slide past each other.",
  gas:    "Too hot! The water molecules escape as steam.",
};
```

### Module B: Particle Simulation (Pushes & Pulls)

The agent calls `show_particle_simulation({ state_of_matter: "solid" | "liquid" | "gas" })` to seed the sandbox in a specific arrangement.

```typescript
// components/labs/states-of-matter/ParticleSimulation.tsx
"use client";
import { useRef, useEffect } from "react";
import { useCopilotAction } from "@copilotkit/react-core";

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
}

export function ParticleSimulation({ initialState }: { initialState: "solid"|"liquid"|"gas" }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(initialState);

  // Agent can change particle arrangement mid-conversation
  useCopilotAction({
    name: "set_particle_state",
    description: "Change particle arrangement to solid, liquid, or gas",
    parameters: [{ name: "state", type: "string", enum: ["solid","liquid","gas"], required: true }],
    handler: ({ state }) => { stateRef.current = state as any; resetSimulation(state); },
  });

  useEffect(() => {
    // Canvas-based particle simulation using Lennard-Jones potential
    // (abbreviated — full implementation in repo)
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let particles: Particle[] = spawnParticles(initialState);
    let raf: number;

    function tick() {
      applyForces(particles, stateRef.current);
      draw(ctx, particles);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="lab-widget">
      <h3>⚛️ Particle Interactions</h3>
      <canvas ref={canvasRef} width={400} height={300} />
      <div className="controls">
        {(["solid","liquid","gas"] as const).map(s => (
          <button key={s} onClick={() => { stateRef.current = s; }}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function spawnParticles(state: string): Particle[] {
  // Grid layout for solid, random for liquid, dispersed for gas
  const count = state === "solid" ? 25 : state === "liquid" ? 20 : 12;
  return Array.from({ length: count }, (_, i) => ({
    x: state === "solid" ? 50 + (i % 5) * 60 : Math.random() * 380 + 10,
    y: state === "solid" ? 50 + Math.floor(i / 5) * 60 : Math.random() * 280 + 10,
    vx: state === "solid" ? 0 : (Math.random() - 0.5) * (state === "gas" ? 4 : 1),
    vy: state === "solid" ? 0 : (Math.random() - 0.5) * (state === "gas" ? 4 : 1),
  }));
}
```

---

## Lab 2 — Wheel & Axle

**Agent trigger phrases:** "wheel", "axle", "Mesopotamia", "simple machines", "vehicle", "ancient"  
**Lab accent color:** `#F59E0B` (amber)

### Module A: Mesopotamian Innovation Explorer

The agent calls `show_wheel_axle_workshop({ era: "ancient" | "medieval" | "industrial" | "modern" })`.

```typescript
// components/labs/wheel-axle/WheelAxleWorkshop.tsx
"use client";
import { useState } from "react";
import { useCopilotAction } from "@copilotkit/react-core";

type Era = "ancient" | "medieval" | "industrial" | "modern";

const ERA_DATA: Record<Era, {
  year: string;
  description: string;
  wheelType: string;
  mechanicalAdvantage: number;
  emoji: string;
}> = {
  ancient:     { year: "3500 BCE", description: "Solid wooden disk wheel in Mesopotamia", wheelType: "Solid disk",    mechanicalAdvantage: 3,  emoji: "🏺" },
  medieval:    { year: "1200 CE",  description: "Spoked wheel with iron rim",             wheelType: "Spoked wheel",  mechanicalAdvantage: 6,  emoji: "⚔️" },
  industrial:  { year: "1850 CE",  description: "Ball-bearing precision axle",            wheelType: "Ball bearing",  mechanicalAdvantage: 12, emoji: "⚙️" },
  modern:      { year: "2024 CE",  description: "Carbon fiber + sealed bearing",          wheelType: "Carbon fiber",  mechanicalAdvantage: 20, emoji: "🚗" },
};

export function WheelAxleWorkshop({ era: initialEra }: { era: string }) {
  const [era, setEra] = useState<Era>((initialEra as Era) || "ancient");
  const data = ERA_DATA[era];

  useCopilotAction({
    name: "advance_wheel_era",
    description: "Move the wheel & axle timeline to a different era",
    parameters: [{ name: "era", type: "string", enum: ["ancient","medieval","industrial","modern"], required: true }],
    handler: ({ era }) => setEra(era as Era),
  });

  return (
    <div className="lab-widget" style={{ "--lab-accent": "#F59E0B" } as any}>
      <h3>🏺 Wheel & Axle Through Time</h3>

      {/* Era timeline selector */}
      <div className="era-timeline">
        {(Object.keys(ERA_DATA) as Era[]).map(e => (
          <button
            key={e}
            className={e === era ? "active" : ""}
            onClick={() => setEra(e)}
          >
            {ERA_DATA[e].emoji} {e}
          </button>
        ))}
      </div>

      {/* Animated wheel diagram */}
      <WheelDiagram wheelType={data.wheelType} mechanicalAdvantage={data.mechanicalAdvantage} />

      <div className="era-info">
        <p><strong>{data.year}</strong> — {data.description}</p>
        <p>Mechanical advantage: <strong>{data.mechanicalAdvantage}×</strong></p>
        <div className="ma-bar" style={{ width: `${data.mechanicalAdvantage * 4}%` }} />
      </div>
    </div>
  );
}

function WheelDiagram({ wheelType, mechanicalAdvantage }: { wheelType: string; mechanicalAdvantage: number }) {
  const spokes = mechanicalAdvantage <= 3 ? 0 : Math.min(mechanicalAdvantage, 12);
  const radius = 60;
  const cx = 80; const cy = 80;

  return (
    <svg width="160" height="160" viewBox="0 0 160 160">
      {/* Axle */}
      <circle cx={cx} cy={cy} r={8} fill="#78716C" />
      {/* Spokes */}
      {Array.from({ length: spokes }, (_, i) => {
        const angle = (i / spokes) * Math.PI * 2;
        return <line key={i}
          x1={cx} y1={cy}
          x2={cx + Math.cos(angle) * radius}
          y2={cy + Math.sin(angle) * radius}
          stroke="#A8A29E" strokeWidth="2"
        />;
      })}
      {/* Rim */}
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#44403C" strokeWidth="4" />
      <text x={cx} y={cy + radius + 16} textAnchor="middle" fontSize="11" fill="currentColor">
        {wheelType}
      </text>
    </svg>
  );
}
```

### Module B: Vehicle Design Workshop

```typescript
// components/labs/wheel-axle/VehicleDesigner.tsx
"use client";
import { useState } from "react";
import { useCopilotAction } from "@copilotkit/react-core";

interface VehicleConfig {
  wheelSize: number;        // 1–5
  axleType: "wood" | "iron" | "steel" | "carbon";
  payload: number;          // kg
  terrain: "flat" | "hills" | "rough";
}

export function VehicleDesigner() {
  const [config, setConfig] = useState<VehicleConfig>({
    wheelSize: 3,
    axleType: "iron",
    payload: 100,
    terrain: "flat",
  });

  // Agent can pre-configure the vehicle based on conversation context
  useCopilotAction({
    name: "configure_vehicle",
    description: "Set vehicle parameters in the design workshop",
    parameters: [
      { name: "wheel_size",  type: "number"                                                        },
      { name: "axle_type",   type: "string", enum: ["wood","iron","steel","carbon"]                },
      { name: "payload",     type: "number"                                                        },
      { name: "terrain",     type: "string", enum: ["flat","hills","rough"]                        },
    ],
    handler: (args) => setConfig({
      wheelSize:  args.wheel_size  ?? config.wheelSize,
      axleType:   (args.axle_type  ?? config.axleType) as VehicleConfig["axleType"],
      payload:    args.payload     ?? config.payload,
      terrain:    (args.terrain    ?? config.terrain)  as VehicleConfig["terrain"],
    }),
  });

  const efficiency = calcEfficiency(config);

  return (
    <div className="lab-widget">
      <h3>🔧 Vehicle Design Workshop</h3>

      <label>Wheel size
        <input type="range" min={1} max={5} value={config.wheelSize}
          onChange={e => setConfig({ ...config, wheelSize: Number(e.target.value) })} />
        <span>{config.wheelSize}</span>
      </label>

      <label>Axle material
        <select value={config.axleType}
          onChange={e => setConfig({ ...config, axleType: e.target.value as any })}>
          {["wood","iron","steel","carbon"].map(a => <option key={a}>{a}</option>)}
        </select>
      </label>

      <label>Payload (kg)
        <input type="range" min={10} max={500} step={10} value={config.payload}
          onChange={e => setConfig({ ...config, payload: Number(e.target.value) })} />
        <span>{config.payload} kg</span>
      </label>

      <div className="efficiency-meter">
        <span>Efficiency</span>
        <div className="bar" style={{ width: `${efficiency}%`, background: efficiency > 70 ? "#10B981" : "#F59E0B" }} />
        <span>{efficiency.toFixed(0)}%</span>
      </div>
    </div>
  );
}

function calcEfficiency({ wheelSize, axleType, payload, terrain }: VehicleConfig): number {
  const axleScore  = { wood: 30, iron: 55, steel: 75, carbon: 95 }[axleType];
  const terrainMod = { flat: 1.0, hills: 0.8, rough: 0.6 }[terrain];
  const sizeScore  = wheelSize * 10;
  const payloadMod = Math.max(0.3, 1 - payload / 600);
  return Math.min(100, (axleScore * 0.5 + sizeScore * 0.3) * terrainMod * payloadMod * 1.5);
}
```

---

## Lab 3 — Light & Shadows

**Agent trigger phrases:** "light", "shadow", "camera obscura", "optics", "sun", "pinhole"  
**Lab accent color:** `#0EA5E9` (sky blue)

### Module A: Camera Obscura

```typescript
// components/labs/light-shadows/CameraObscura.tsx
"use client";
import { useRef, useEffect, useState } from "react";
import { useCopilotAction } from "@copilotkit/react-core";

const SCENES = {
  cityscape:  "🏙️",
  tree:       "🌳",
  lighthouse: "🗼",
  mountain:   "⛰️",
};

export function CameraObscura({ scene: initialScene }: { scene: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scene, setScene] = useState(initialScene || "cityscape");
  const [apertureSize, setApertureSize] = useState(4);  // px — smaller = sharper inversion

  useCopilotAction({
    name: "change_obscura_scene",
    description: "Change the scene projected through the camera obscura",
    parameters: [
      { name: "scene",         type: "string", enum: Object.keys(SCENES), required: true },
      { name: "aperture_size", type: "number", description: "1-20, smaller = sharper"    },
    ],
    handler: ({ scene, aperture_size }) => {
      setScene(scene);
      if (aperture_size) setApertureSize(aperture_size);
    },
  });

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    // Render source scene on left half, inverted projection on right half
    ctx.clearRect(0, 0, 480, 240);

    // Source side (left)
    ctx.fillStyle = "#87CEEB";
    ctx.fillRect(0, 0, 200, 240);
    ctx.font = "60px serif";
    ctx.textAlign = "center";
    ctx.fillText((SCENES as any)[scene] ?? "🌳", 100, 140);
    ctx.fillStyle = "#555";
    ctx.font = "12px sans-serif";
    ctx.fillText("Original", 100, 225);

    // Pinhole wall (middle)
    ctx.fillStyle = "#374151";
    ctx.fillRect(215, 0, 50, 240);
    ctx.fillStyle = "#F59E0B";
    const holeY = 120 - apertureSize / 2;
    ctx.fillRect(225, holeY, 30, apertureSize);
    ctx.fillStyle = "#fff";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${apertureSize}px`, 240, 230);

    // Inverted projection (right)
    ctx.save();
    ctx.translate(480, 240);
    ctx.rotate(Math.PI);  // 180° inversion — the key optical principle
    ctx.fillStyle = "#F0E6C8";
    ctx.fillRect(0, 0, 210, 240);
    ctx.font = "60px serif";
    ctx.textAlign = "center";
    const blur = Math.max(0, (apertureSize - 2) * 1.5);
    ctx.filter = `blur(${blur}px)`;
    ctx.globalAlpha = 0.9;
    ctx.fillText((SCENES as any)[scene] ?? "🌳", 105, 140);
    ctx.restore();
    ctx.fillStyle = "#555";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Projected (inverted)", 375, 225);

    // Ray lines
    ctx.strokeStyle = "#FCD34D";
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.4;
    for (let i = 0; i < 5; i++) {
      const srcY = 60 + i * 30;
      const dstY = 240 - srcY;
      ctx.beginPath();
      ctx.moveTo(200, srcY);
      ctx.lineTo(240, 120);
      ctx.lineTo(265, dstY);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }, [scene, apertureSize]);

  return (
    <div className="lab-widget">
      <h3>📷 Camera Obscura</h3>
      <canvas ref={canvasRef} width={480} height={240} style={{ width: "100%" }} />
      <label>Aperture size: {apertureSize}px
        <input type="range" min={1} max={20} value={apertureSize}
          onChange={e => setApertureSize(Number(e.target.value))} />
      </label>
      <div className="scene-picker">
        {Object.entries(SCENES).map(([key, emoji]) => (
          <button key={key} className={key === scene ? "active" : ""} onClick={() => setScene(key)}>
            {emoji} {key}
          </button>
        ))}
      </div>
    </div>
  );
}
```

### Module B: Shadow AR Module

```typescript
// components/labs/light-shadows/ShadowARModule.tsx
"use client";
import { useMemo, useState } from "react";
import { useCopilotAction } from "@copilotkit/react-core";

export function ShadowARModule({ latitude, timeOfDay }: { latitude: number; timeOfDay: number }) {
  const [lat, setLat]   = useState(latitude  || 35);
  const [hour, setHour] = useState(timeOfDay || 12);

  useCopilotAction({
    name: "set_shadow_time",
    description: "Update the time of day for shadow simulation",
    parameters: [
      { name: "hour",     type: "number", description: "0-23"        },
      { name: "latitude", type: "number", description: "-90 to 90"   },
    ],
    handler: ({ hour, latitude }) => {
      if (hour     !== undefined) setHour(hour);
      if (latitude !== undefined) setLat(latitude);
    },
  });

  const { shadowLength, shadowAngle, sunAltitude } = useMemo(
    () => calcShadow(lat, hour),
    [lat, hour]
  );

  const shadowX = Math.cos(shadowAngle) * shadowLength * 30;
  const shadowY = Math.sin(shadowAngle) * shadowLength * 10;

  return (
    <div className="lab-widget">
      <h3>☀️ Shadow Simulator</h3>

      <svg width="360" height="200" viewBox="-180 -100 360 200">
        {/* Ground */}
        <line x1="-180" y1="80" x2="180" y2="80" stroke="var(--color-border-secondary)" strokeWidth="1"/>
        {/* Object (gnomon) */}
        <rect x="-6" y="-40" width="12" height="120" fill="#7C3AED" rx="3"/>
        {/* Shadow */}
        <ellipse
          cx={shadowX} cy={80}
          rx={Math.abs(shadowX) * 0.3 + 8} ry={5}
          fill="#374151" opacity={0.35}
        />
        <line
          x1="0" y1="80"
          x2={shadowX} y2={80}
          stroke="#374151" strokeWidth="3" strokeLinecap="round"
        />
        {/* Sun */}
        <circle
          cx={-Math.cos(shadowAngle) * 120}
          cy={-sunAltitude * 1.2}
          r={18}
          fill="#FCD34D"
        />
        <text x={-Math.cos(shadowAngle) * 120} y={-sunAltitude * 1.2 + 4}
          textAnchor="middle" fontSize="12">☀️</text>
      </svg>

      <label>Time of day: {hour}:00
        <input type="range" min={5} max={20} value={hour}
          onChange={e => setHour(Number(e.target.value))} />
      </label>
      <label>Latitude: {lat}°
        <input type="range" min={-70} max={70} value={lat}
          onChange={e => setLat(Number(e.target.value))} />
      </label>

      <div className="shadow-stats">
        <span>Sun altitude: {sunAltitude.toFixed(1)}°</span>
        <span>Shadow length: {shadowLength.toFixed(1)}×</span>
      </div>
    </div>
  );
}

function calcShadow(latitude: number, hour: number) {
  const hourAngle   = ((hour - 12) / 12) * Math.PI;
  const declination = 23.5 * Math.PI / 180;
  const lat         = latitude * Math.PI / 180;

  const sinAlt =
    Math.sin(lat) * Math.sin(declination) +
    Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle);

  const sunAltitude   = Math.max(0, Math.asin(sinAlt) * 180 / Math.PI);
  const shadowLength  = sunAltitude > 2 ? 1 / Math.tan(sunAltitude * Math.PI / 180) : 10;
  const shadowAngle   = hourAngle + Math.PI;

  return { shadowLength: Math.min(shadowLength, 10), shadowAngle, sunAltitude };
}
```

---

## 11. Full Agent Graph

```python
# agent/tools.py — the tool schemas the LLM sees
from langchain_core.tools import tool
from typing import Optional, Literal

@tool
def show_lab_selector() -> str:
    """Show the overview card for all three labs."""
    return "lab_selector displayed"

@tool
def show_ice_cream_maker(
    temperature: float = -5.0,
    ingredient: str = "water"
) -> str:
    """Show the ice cream maker phase-change simulation.
    Args:
        temperature: Starting temperature in Celsius. Use -5 for solid ice cream.
        ingredient: The ingredient whose phase to highlight (water, sugar, cream).
    """
    return f"ice_cream_maker displayed at {temperature}°C, featuring {ingredient}"

@tool
def show_particle_simulation(
    state_of_matter: Literal["solid", "liquid", "gas"] = "liquid"
) -> str:
    """Show the particle interaction simulation (pushes and pulls)."""
    return f"particle_simulation displayed in {state_of_matter} state"

@tool
def show_wheel_axle_workshop(
    era: Literal["ancient", "medieval", "industrial", "modern"] = "ancient"
) -> str:
    """Show the Mesopotamian wheel and axle innovation explorer."""
    return f"wheel_axle_workshop displayed for {era} era"

@tool
def show_vehicle_designer() -> str:
    """Show the vehicle design workshop sandbox."""
    return "vehicle_designer displayed"

@tool
def show_camera_obscura(scene: str = "cityscape") -> str:
    """Show the interactive camera obscura."""
    return f"camera_obscura displayed with {scene} scene"

@tool
def show_shadow_ar_module(
    latitude: float = 35.0,
    time_of_day: int = 12
) -> str:
    """Show the shadow angle / time-of-day simulator.
    Args:
        latitude: Location latitude (-90 to 90).
        time_of_day: Hour of day 0-23.
    """
    return f"shadow_ar_module at lat={latitude}, hour={time_of_day}"

@tool
def request_student_approval(
    message: str,
    next_module: str
) -> str:
    """Pause and ask the student to approve before advancing to the next lab section.
    Use this before transitioning between lab modules or major topics.
    """
    return f"approval_requested: {message}"
```

---

## 12. Project Setup

```bash
# 1. Create Next.js app
npx create-next-app@latest delegative-labs --typescript --app
cd delegative-labs

# 2. Install frontend deps
npm install @copilotkit/react-core @copilotkit/react-ui @copilotkit/runtime

# 3. Setup Python agent
python -m venv agent/.venv
source agent/.venv/bin/activate    # or agent\.venv\Scripts\activate on Windows
pip install langgraph langchain-openai copilotkit

# 4. Environment
echo "OPENAI_API_KEY=sk-..." > agent/.env
echo "LANGGRAPH_URL=http://localhost:8123" > .env.local

# 5. Run agent server
cd agent && langgraph dev --port 8123 --no-browser

# 6. Run frontend (new terminal)
npm run dev
```

```json
// agent/langgraph.json
{
  "dependencies": ["."],
  "graphs": {
    "lab_guide": "./graph.py:graph"
  }
}
```

---

## 13. Key References

| Resource | URL |
|---|---|
| AG-UI protocol spec | https://docs.ag-ui.com |
| AG-UI event types (all 17) | https://docs.ag-ui.com/concepts/events |
| CopilotKit + LangGraph starter | https://github.com/CopilotKit/with-langgraph-python |
| Generative UI patterns | https://github.com/CopilotKit/generative-ui |
| LangGraph HITL interrupts | https://langchain-ai.github.io/langgraph/concepts/human_in_the_loop |
| LangGraph streaming | https://langchain-ai.github.io/langgraph/concepts/streaming |
| CopilotKit `useFrontendTool` | https://docs.copilotkit.ai/reference/hooks/useFrontendTool |
| CopilotKit `useCoAgent` | https://docs.copilotkit.ai/reference/hooks/useCoAgent |
| Agent Spec (Oracle + Google + CopilotKit) | https://blogs.oracle.com/ai-and-datascience/announcing-ag-ui-integration-for-agent-spec |
| AG-UI Dojo demos (50–200 line examples each) | https://github.com/ag-ui-protocol/ag-ui |

---

## Delegative UI — Design Principles Demonstrated

| Principle | Where it appears in this scaffold |
|---|---|
| **Goal not navigation** | Student says "ice cream" → agent routes to widget, not a menu |
| **Component catalog** | `useFrontendTool` registers the catalog; agent picks from it |
| **Streaming args** | Widget renders a skeleton while TOOL_CALL_ARGS streams in |
| **Shared state = single truth** | `useCoAgent` — both agent and UI write to the same state |
| **HITL gates** | `renderAndWait` pauses agent until student approves next section |
| **Agent-driven UI mutation** | `set_lab_theme`, `update_ice_cream_temperature` — agent changes live UI |
| **Step visibility** | `STEP_STARTED` / `STEP_FINISHED` events power progress indicators |
| **No page navigation** | All three labs co-exist in one React tree; agent swaps active widget |
