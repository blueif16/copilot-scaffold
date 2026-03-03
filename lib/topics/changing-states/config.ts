import type { TopicConfig } from "@/lib/types";
import type { ChangingStatesSimState } from "@/lib/types/changing-states";
import { INITIAL_CHANGING_STATES } from "@/lib/types/changing-states";
import { PressureCookerSpotlight } from "./PressureCookerSpotlight";

/**
 * Frontend TopicConfig for "Changing States" (Level 1, Ages 6–8).
 *
 * Prompts and knowledge context are stored here but only used
 * client-side for the local mock. In production (Slice 6+), the
 * backend TopicConfig in Python owns the real prompts.
 */
export const changingStatesConfig: TopicConfig<
  ChangingStatesSimState,
  never, // no extra emotions
  "shiver" | "melt" // extra animations
> = {
  id: "changing-states",
  level: 1,
  ageRange: [6, 8],

  initialSimulationState: INITIAL_CHANGING_STATES,
  initialProgress: {
    all_phases_discovered: false,
    spotlight_available: false,
    spotlight_viewed: false,
  },

  // These prompts are placeholders for the local mock.
  // Real prompts live in agent/topics/changing_states/config.py
  pedagogicalPrompt: "",
  knowledgeContext: "",
  chatSystemPrompt: "",

  suggestedQuestions: {
    solid: [
      "Why are the particles so still?",
      "What happens when things get really, really cold?",
    ],
    liquid: [
      "Can you find the exact spot where it melts?",
      "Why can liquids pour but solids can't?",
    ],
    gas: [
      "Where does the steam go?",
      "Why do the particles fly apart?",
    ],
    all_phases_discovered: [
      "What was the coolest change to watch?",
      "Can you change it back and forth?",
    ],
  },

  spotlightContent: {
    id: "pressure-cooker",
    triggerCondition: "all_phases_discovered",
    component: PressureCookerSpotlight,
  },

  extraEmotions: [],
  extraAnimations: ["shiver", "melt"],
  eventDebounceMs: 150,
};
