import type { TopicConfig } from "@/lib/types";
import type { GeneticsBasicsSimState } from "@/lib/types/genetics-basics";
import { INITIAL_GENETICS_BASICS } from "@/lib/types/genetics-basics";

/**
 * Frontend TopicConfig for "Genetics Basics" (Level 3, Ages 11–12).
 *
 * Prompts and knowledge context are stored here but only used
 * client-side for the local mock. In production (Slice 6+), the
 * backend TopicConfig in Python owns the real prompts.
 */
export const geneticsBasicsConfig: TopicConfig<
  GeneticsBasicsSimState,
  never, // no extra emotions
  never // no extra animations
> = {
  id: "genetics-basics",
  level: 3,
  ageRange: [11, 12],

  initialSimulationState: INITIAL_GENETICS_BASICS,
  initialProgress: {
    first_cross_completed: false,
    recessive_discovered: false,
    second_generation_bred: false,
    all_traits_explored: false,
    spotlight_available: false,
    spotlight_viewed: false,
  },

  // These prompts are placeholders for the local mock.
  // Real prompts live in agent/topics/genetics_basics/config.py
  pedagogicalPrompt: "",
  knowledgeContext: "",
  chatSystemPrompt: "",

  suggestedQuestions: {
    initial: [
      "What's the difference between genotype and phenotype?",
      "Why do both parents look the same but have different genes?",
    ],
    first_cross: [
      "What does the Punnett square predict?",
      "Why are some traits more common than others?",
    ],
    recessive_appears: [
      "Where did the blue eyes come from?",
      "How can two brown-eyed parents have a blue-eyed child?",
    ],
    second_generation: [
      "What happens if I breed two offspring together?",
      "Can I make a creature with all recessive traits?",
    ],
    all_traits_explored: [
      "Which trait was hardest to predict?",
      "How do real genetics work in humans?",
    ],
  },

  spotlightContent: null, // No spotlight for this topic yet

  extraEmotions: [],
  extraAnimations: [],
  eventDebounceMs: 200,
};
