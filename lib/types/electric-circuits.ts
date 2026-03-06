// ═══════════════════════════════════════════════════════════
// ELECTRIC CIRCUITS — Topic-specific types (Level 2, Ages 9–10)
// ═══════════════════════════════════════════════════════════

export type ComponentType =
  | "battery"
  | "wire"
  | "lightbulb"
  | "switch"
  | "motor"
  | "resistor";

export interface Position {
  x: number;
  y: number;
}

export interface CircuitComponent {
  id: string;
  type: ComponentType;
  position: Position;
  rotation: number; // 0, 90, 180, 270 degrees
  connections: string[]; // IDs of connected components
}

export interface ElectricCircuitsSimState extends Record<string, unknown> {
  components: CircuitComponent[];
  connections: Array<{ from: string; to: string }>;
  isComplete: boolean; // Does the circuit form a closed loop?
  currentFlow: boolean; // Is current flowing through the circuit?
  gridSize: number; // Snap-to-grid size in pixels
}

// Extra animations for this topic
export type ElectricCircuitsAnimation = "spark" | "glow";

// ── Event Type Constants ────────────────────────────────────

export const ELECTRIC_CIRCUITS_EVENTS = {
  CIRCUIT_COMPLETE: "circuit_complete",
  CIRCUIT_BROKEN: "circuit_broken",
  COMPONENT_ADDED: "component_added",
  COMPONENT_REMOVED: "component_removed",
  SWITCH_TOGGLED: "switch_toggled",
  SECOND_BULB_ADDED: "second_bulb_added",
  FIRST_INTERACTION: "first_interaction",
  MILESTONE: "milestone",
  SPOTLIGHT_TAP: "spotlight_tap",
  IDLE_TIMEOUT: "idle_timeout",
} as const;

// ── Grid Configuration ──────────────────────────────────────

export const GRID_SIZE = 40; // pixels
export const WORKSPACE_WIDTH = 640; // 16 columns * 40px
export const WORKSPACE_HEIGHT = 440; // 11 rows * 40px

// ── Initial State ───────────────────────────────────────────

export const INITIAL_ELECTRIC_CIRCUITS: ElectricCircuitsSimState = {
  components: [
    {
      id: "battery-1",
      type: "battery",
      position: { x: 2, y: 2 },
      rotation: 0,
      connections: [],
    },
  ],
  connections: [],
  isComplete: false,
  currentFlow: false,
  gridSize: GRID_SIZE,
};
