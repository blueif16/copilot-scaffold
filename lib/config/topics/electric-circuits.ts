import type { TopicConfig } from "@/lib/types";
import type { ElectricCircuitsSimState } from "@/lib/types/electric-circuits";
import { INITIAL_ELECTRIC_CIRCUITS } from "@/lib/types/electric-circuits";

/**
 * Frontend TopicConfig for "Electric Circuits" (Level 2, Ages 9–10).
 *
 * Prompts and knowledge context are stored here but only used
 * client-side for the local mock. In production (Slice 6+), the
 * backend TopicConfig in Python owns the real prompts.
 */
export const electricCircuitsConfig: TopicConfig<
  ElectricCircuitsSimState,
  never, // no extra emotions
  "spark" | "glow" // extra animations
> = {
  id: "electric-circuits",
  level: 2,
  ageRange: [9, 10],

  initialSimulationState: INITIAL_ELECTRIC_CIRCUITS,
  initialProgress: {
    first_circuit_complete: false,
    switch_discovered: false,
    parallel_circuit_built: false,
    spotlight_available: false,
    spotlight_viewed: false,
  },

  // These prompts are placeholders for the local mock.
  // Real prompts live in agent/topics/electric_circuits/config.py
  pedagogicalPrompt: "",
  knowledgeContext: "",
  chatSystemPrompt: "",

  suggestedQuestions: {
    initial: [
      "What does a battery do?",
      "How do I connect components?",
    ],
    circuit_complete: [
      "Why did the bulb light up?",
      "What happens if I remove a wire?",
    ],
    switch_added: [
      "How does a switch control electricity?",
      "Can I add more bulbs?",
    ],
    parallel_circuit: [
      "Why do both bulbs stay bright?",
      "What's different from connecting them in a line?",
    ],
  },

  spotlightContent: null, // No spotlight for this topic yet

  extraEmotions: [],
  extraAnimations: ["spark", "glow"],
  eventDebounceMs: 150,
};
