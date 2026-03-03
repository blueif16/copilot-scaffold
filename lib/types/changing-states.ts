// ═══════════════════════════════════════════════════════════
// CHANGING STATES — Topic-specific types (Level 1, Ages 6–8)
// ═══════════════════════════════════════════════════════════

export type Phase = "solid" | "liquid" | "gas";

export interface ChangingStatesSimState extends Record<string, unknown> {
  temperature: number; // 0–100, maps to slider position
  phase: Phase;
  particleSpeed: number; // Derived from temperature
  sliderActive: boolean; // Is the kid currently dragging?
}

// Extra animations for this topic (no extra emotions needed)
export type ChangingStatesAnimation = "shiver" | "melt";

// ── Phase Boundaries ────────────────────────────────────

export const PHASE_BOUNDARIES = {
  solidToLiquid: 33,
  liquidToGas: 67,
} as const;

// ── Event Type Constants ────────────────────────────────

export const CHANGING_STATES_EVENTS = {
  PHASE_CHANGE: "phase_change",
  DWELL_TIMEOUT: "dwell_timeout",
  FIRST_INTERACTION: "first_interaction",
  REVERSAL: "reversal",
  RAPID_CYCLING: "rapid_cycling",
  MILESTONE: "milestone",
  SPOTLIGHT_TAP: "spotlight_tap",
  IDLE_TIMEOUT: "idle_timeout",
} as const;

// ── Dwell / Idle Thresholds (seconds) ───────────────────

export const DWELL_THRESHOLD_S = 8;
export const IDLE_THRESHOLD_S = 30;
export const RAPID_CYCLING_WINDOW_MS = 10_000;
export const RAPID_CYCLING_MIN_TRANSITIONS = 3;

// ── Initial State ───────────────────────────────────────

export const INITIAL_CHANGING_STATES: ChangingStatesSimState = {
  temperature: 15,
  phase: "solid",
  particleSpeed: 0.15,
  sliderActive: false,
};
