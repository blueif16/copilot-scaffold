// ═══════════════════════════════════════════════════════════
// Course Builder — Multi-file Sandpack scaffolds
//
// Convention:
//   /App.js          → Sandpack host (throwaway — not promoted)
//   /Simulation.js   → becomes TopicNameSimulation.tsx
//   /state.json      → becomes TS types + Python state schema
//   /data.json       → becomes config.py + reactions.py
//
// Scaffolds are STRUCTURAL only — they establish the expected
// file shapes and import wiring. The agent replaces each file
// entirely via write_file after learning the teacher's topic.
// ═══════════════════════════════════════════════════════════

import type { CourseFormat } from "@/lib/types/course-builder";

export function getTemplateFiles(format: CourseFormat): Record<string, string> {
  switch (format) {
    case "lab":
      return {
        "/App.js": APP_SCAFFOLD,
        "/Simulation.js": LAB_SIM_SCAFFOLD,
        "/state.json": EMPTY_STATE_SCAFFOLD,
        "/data.json": EMPTY_DATA_SCAFFOLD,
      };
    case "quiz":
      return {
        "/App.js": APP_SCAFFOLD,
        "/Simulation.js": QUIZ_SIM_SCAFFOLD,
        "/state.json": EMPTY_STATE_SCAFFOLD,
        "/data.json": EMPTY_DATA_SCAFFOLD,
      };
    case "dialogue":
      return {
        "/App.js": APP_SCAFFOLD,
        "/Simulation.js": DIALOGUE_SIM_SCAFFOLD,
        "/state.json": EMPTY_STATE_SCAFFOLD,
        "/data.json": EMPTY_DATA_SCAFFOLD,
      };
    default:
      return {
        "/App.js": APP_SCAFFOLD,
        "/Simulation.js": LAB_SIM_SCAFFOLD,
        "/state.json": EMPTY_STATE_SCAFFOLD,
        "/data.json": EMPTY_DATA_SCAFFOLD,
      };
  }
}

// ═══════════════════════════════════════════════════════════
// /App.js — Sandpack host (NOT promoted)
//
// Reads /state.json to build initial state, passes standard
// SimulationProps to /Simulation.js. Throwaway at promotion.
// ═══════════════════════════════════════════════════════════

const APP_SCAFFOLD = `import { useState, useCallback } from "react";
import Simulation from "./Simulation";
import stateSchema from "./state.json";

function getInitialState(schema) {
  const state = {};
  for (const [key, def] of Object.entries(schema.state)) {
    if (key.startsWith("_")) continue;
    state[key] = def.initial;
  }
  return state;
}

export default function App() {
  const [state, setState] = useState(() => getInitialState(stateSchema));
  const onStateChange = useCallback(
    (patch) => setState((s) => ({ ...s, ...patch })),
    []
  );
  const onEvent = useCallback((event) => {
    console.log("[event]", event.type, JSON.stringify(event.data));
  }, []);

  return (
    <Simulation state={state} onStateChange={onStateChange} onEvent={onEvent} />
  );
}
`;

// ═══════════════════════════════════════════════════════════
// /state.json — Structural only
//
// Agent replaces via write_file with topic-specific fields.
// Expected shape:
//   state: { [fieldName]: { type, initial, description, ...opts } }
//   events: { [eventName]: { description, data: { field: type } } }
// ═══════════════════════════════════════════════════════════

const EMPTY_STATE_SCAFFOLD = JSON.stringify(
  {
    _schema: "Each key in 'state' defines a simulation field: { type, initial, description }. Optional: min, max, values (for enum), derived (true = computed, excluded from agent state), internal (true = UI-only). Each key in 'events' defines an event: { description, data: { fieldName: type } }.",
    state: {},
    events: {},
  },
  null,
  2
);

// ═══════════════════════════════════════════════════════════
// /data.json — Structural only
//
// Agent replaces via write_file with topic-specific config.
// Expected shape:
//   topic: { id, level, ageRange, prompts, suggestedQuestions, spotlight }
//   reactions: [ { id, event, conditions, response, oneShot?, ... } ]
// ═══════════════════════════════════════════════════════════

const EMPTY_DATA_SCAFFOLD = JSON.stringify(
  {
    _schema: "topic: full TopicConfig fields (id, level, ageRange, pedagogicalPrompt, knowledgeContext, chatSystemPrompt, suggestedQuestions, spotlight). reactions: array of Reaction objects (id, event, conditions, response: { message, emotion, animation, sound, type, priority, autoExpireMs }, oneShot?, escalateToAi?, aiHint?, cooldownSeconds?).",
    topic: {
      id: "",
      level: 1,
      ageRange: [6, 12],
      pedagogicalPrompt: "",
      knowledgeContext: "",
      chatSystemPrompt: "",
      suggestedQuestions: {},
      spotlight: null,
    },
    reactions: [],
  },
  null,
  2
);

// ═══════════════════════════════════════════════════════════
// /Simulation.js — Format-specific layout skeletons
//
// Each format has a distinct layout pattern but NO domain
// content. Agent replaces entirely via write_file.
// All accept SimulationProps: { state, onStateChange, onEvent }
// ═══════════════════════════════════════════════════════════

const LAB_SIM_SCAFFOLD = `import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// SimulationProps contract: { state, onStateChange, onEvent }
// - state: current simulation state (shape from /state.json)
// - onStateChange(patch): merge partial update into state
// - onEvent({ type, data }): emit events (types from /state.json events)

export default function Simulation({ state, onStateChange, onEvent }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      fontFamily: "'Noto Sans SC', system-ui, sans-serif",
      background: "#FAFAF7", color: "#1A1A1A",
      userSelect: "none", overflow: "hidden",
    }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>实验标题</div>
      </div>
      <div style={{ flex: 1, padding: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "rgba(0,0,0,0.2)" }}>可视化区域</div>
      </div>
      <div style={{ padding: "16px 20px 24px", borderTop: "1px solid rgba(0,0,0,0.06)", background: "white" }}>
        <div style={{ color: "rgba(0,0,0,0.2)", textAlign: "center" }}>控制面板</div>
      </div>
    </div>
  );
}
`;

const QUIZ_SIM_SCAFFOLD = `import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// SimulationProps contract: { state, onStateChange, onEvent }

export default function Simulation({ state, onStateChange, onEvent }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      fontFamily: "'Noto Sans SC', system-ui, sans-serif",
      background: "#FAFAF7", color: "#1A1A1A", overflow: "hidden",
    }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 600 }}>题目进度</div>
        <div style={{ fontWeight: 600 }}>得分</div>
      </div>
      <div style={{ height: 4, background: "rgba(0,0,0,0.04)" }} />
      <div style={{ flex: 1, padding: "28px 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "rgba(0,0,0,0.2)" }}>题目区域</div>
      </div>
      <div style={{ padding: "12px 20px 24px", borderTop: "1px solid rgba(0,0,0,0.06)", background: "white" }}>
        <div style={{ color: "rgba(0,0,0,0.2)", textAlign: "center" }}>导航按钮</div>
      </div>
    </div>
  );
}
`;

const DIALOGUE_SIM_SCAFFOLD = `import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// SimulationProps contract: { state, onStateChange, onEvent }

export default function Simulation({ state, onStateChange, onEvent }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      fontFamily: "'Noto Sans SC', system-ui, sans-serif",
      background: "#FAFAF7", color: "#1A1A1A", overflow: "hidden",
    }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 700 }}>故事标题</div>
        <div style={{ fontSize: 12, fontWeight: 600 }}>进度</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "rgba(0,0,0,0.2)" }}>对话区域</div>
      </div>
      <div style={{ padding: "12px 16px 24px", borderTop: "1px solid rgba(0,0,0,0.06)", background: "white" }}>
        <div style={{ color: "rgba(0,0,0,0.2)", textAlign: "center" }}>选择按钮</div>
      </div>
    </div>
  );
}
`;
