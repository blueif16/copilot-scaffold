// ═══════════════════════════════════════════════════════════
// UNIVERSAL TYPES — shared across ALL topics
// ═══════════════════════════════════════════════════════════

import type { ComponentType } from "react";

// ── Emotion & Animation ─────────────────────────────────

export type BaseEmotion =
  | "idle"
  | "excited"
  | "curious"
  | "impressed"
  | "celebrating"
  | "thinking"
  | "encouraging"
  | "watching";

export type BaseAnimation =
  | "bounce"
  | "nod"
  | "tilt_head"
  | "confetti"
  | "wave"
  | "point"
  | "none";

export type EmotionSet<TopicExtras extends string = never> =
  | BaseEmotion
  | TopicExtras;

export type AnimationSet<TopicExtras extends string = never> =
  | BaseAnimation
  | TopicExtras;

// ── Events ──────────────────────────────────────────────

export interface SimulationEvent {
  type: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface EventState {
  latest: SimulationEvent | null;
  history: SimulationEvent[];
}

// ── Reaction Payload ────────────────────────────────────

export interface ReactionPayload<
  E extends string = BaseEmotion,
  A extends string = BaseAnimation,
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

export interface CompanionState<
  E extends string = BaseEmotion,
  A extends string = BaseAnimation,
> {
  currentReaction: ReactionPayload<E, A> | null;
  reactionHistory: string[];
  progress: Record<string, unknown>;
  spotlightUnlocked: boolean;
  suggestedQuestions: string[];
}

// ── CoAgent State (full shape synced with backend) ──────

export interface CoAgentState<
  SimState extends Record<string, unknown>,
  E extends string = BaseEmotion,
  A extends string = BaseAnimation,
> {
  // Zone 1: Frontend writes, Backend reads
  simulation: SimState;
  events: EventState;

  // Zone 2: Backend writes, Frontend reads
  companion: CompanionState<E, A>;
}

// ── Lab Notebook ─────────────────────────────────────────

export interface LabNotebookPage {
  /** Tab/header title, e.g. "What Is Matter?" */
  title: string;
  /** Body text — supports simple line breaks via \n */
  body: string;
  /** Style variant controls the page layout */
  variant: "visual" | "text" | "fun-fact";
  /** Main illustration asset path, e.g. "/assets/ice_cube.png" */
  illustration?: string;
  /** Small decorative corner asset */
  decorator?: string;
  /** Background tint color key from playful palette */
  bgTint?: "sky" | "peach" | "sage" | "lavender" | "mustard";
  /** Optional caption under the illustration */
  caption?: string;
}

// ── Topic Config ────────────────────────────────────────

export interface SpotlightConfig {
  id: string;
  triggerCondition: string;
  component: ComponentType;
}

export interface ProgressMilestone {
  icon: string;
  text: string;
}

export interface TopicConfig<
  SimState extends Record<string, unknown>,
  E extends string = never,
  A extends string = never,
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

  /** Lab notebook pages shown on the left panel */
  labNotebook?: LabNotebookPage[];

  /** Progress calculation function */
  progressCalculator?: (progress: Record<string, unknown>) => number;

  /** Progress milestones with icons and text */
  progressMilestones?: Record<number, ProgressMilestone>;
}

// ── Simulation Component Contract ───────────────────────

export interface SimulationProps<
  SimState extends Record<string, unknown>,
> {
  state: SimState;
  onStateChange: (partial: Partial<SimState>) => void;
  onEvent: (event: Omit<SimulationEvent, "timestamp">) => void;
}

// ── Topic Metadata (for collection page) ────────────────

export interface TopicMeta {
  id: string;
  title: string;
  description: string;
  ageRange: [number, number];
  level: number;
  route: string;
  color: string;
}
