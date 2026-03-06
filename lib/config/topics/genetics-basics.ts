import type { TopicConfig, LabNotebookPage } from "@/lib/types";
import type { GeneticsBasicsSimState } from "@/lib/types/genetics-basics";
import { INITIAL_GENETICS_BASICS } from "@/lib/types/genetics-basics";

// ── Lab Notebook Pages ──────────────────────────────────

const GENETICS_BASICS_NOTEBOOK: LabNotebookPage[] = [
  {
    title: "What Are Genes?",
    variant: "visual",
    body: "Genes are tiny instructions inside every living thing. They're like a recipe book that tells your body how to build itself — what colour your eyes are, how tall you'll grow, and much more!",
    illustration: "/assets/dna_helix.png",
    caption: "DNA carries all your genetic instructions",
    bgTint: "lavender",
    decorator: "/assets/magnifying_glass.png",
  },
  {
    title: "DNA: The Code of Life",
    variant: "text",
    body: "DNA is a long, twisted molecule shaped like a spiral ladder — scientists call it a double helix. It lives inside almost every cell in your body.\nThe rungs of the ladder are made of four chemical letters: A, T, C, and G. The order of these letters spells out your genes.\nIf you stretched out all the DNA in just one of your cells, it would be about 2 metres long!",
    illustration: "/assets/dna_helix.png",
    bgTint: "lavender",
  },
  {
    title: "Dominant & Recessive",
    variant: "visual",
    body: "You get two copies of each gene — one from each parent. Some gene versions are dominant (stronger) and some are recessive (weaker). If you have even one dominant copy, that's the trait you'll show!",
    illustration: "/assets/genetics_creatures_full.png",
    caption: "Dominant traits only need one copy to show up",
    bgTint: "peach",
    decorator: "/assets/sparkle_star.png",
  },
  {
    title: "Genotype vs. Phenotype",
    variant: "text",
    body: "Your genotype is the combination of gene copies you carry — the hidden code. Your phenotype is what you actually look like — the visible result.\nTwo creatures can look identical (same phenotype) but carry different hidden genes (different genotype). That's why surprises happen when they have babies!\nWe write dominant alleles as capital letters (B) and recessive as lowercase (b). So Bb looks the same as BB, but carries a hidden recessive.",
    illustration: "/assets/eye_brown.png",
    bgTint: "sage",
  },
  {
    title: "The Punnett Square",
    variant: "visual",
    body: "A Punnett square is a simple grid that helps predict what traits offspring might have. Put one parent's alleles across the top and the other's down the side, then fill in the boxes!",
    illustration: "/assets/punnett_square.png",
    caption: "Each box shows one possible combination of alleles",
    bgTint: "sky",
  },
  {
    title: "Probability & Ratios",
    variant: "text",
    body: "Genetics is about probability, not certainty. If both parents carry one dominant and one recessive allele (Bb × Bb), the Punnett square predicts:\n• 25% chance of BB (homozygous dominant)\n• 50% chance of Bb (heterozygous — looks dominant)\n• 25% chance of bb (homozygous recessive — surprise!)\nThat's a 3:1 ratio of dominant to recessive phenotypes. But with real offspring, anything can happen!",
    illustration: "/assets/punnett_square.png",
    bgTint: "sky",
  },
  {
    title: "Gregor Mendel's Peas",
    variant: "fun-fact",
    body: "A monk named Gregor Mendel figured out the basics of genetics in the 1860s by growing over 28,000 pea plants! He carefully tracked traits like flower colour, seed shape, and plant height. Nobody paid much attention to his work at the time, but decades later scientists realised he'd discovered the fundamental laws of inheritance.",
    illustration: "/assets/plant_leaf.png",
    bgTint: "sage",
    caption: "The father of genetics was a pea farmer",
  },
  {
    title: "Hidden Traits",
    variant: "text",
    body: "Here's what makes genetics fascinating: two brown-eyed parents can have a blue-eyed child! If both parents are Bb (carrying a hidden recessive blue allele), there's a 25% chance their child gets bb — blue eyes.\nThis is why traits can seem to skip generations. A grandparent's trait might hide for a generation and then reappear.\nIn your experiment, try breeding creatures and watch for surprise recessive traits to pop up!",
    illustration: "/assets/eye_blue.png",
    bgTint: "lavender",
  },
  {
    title: "Start Breeding!",
    variant: "visual",
    body: "Pick a trait to study, set up your parent creatures, and use the Punnett square to predict what their babies might look like. Then breed them and see if your prediction was right!",
    illustration: "/assets/genetics_creatures_full.png",
    bgTint: "peach",
    decorator: "/assets/sparkle_star.png",
  },
];

// ── Topic Config ────────────────────────────────────────

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

  spotlightContent: null,

  extraEmotions: [],
  extraAnimations: [],
  eventDebounceMs: 200,

  labNotebook: GENETICS_BASICS_NOTEBOOK,
};
