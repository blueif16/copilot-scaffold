import type { TopicConfig, LabNotebookPage } from "@/lib/types";
import type { ChangingStatesSimState } from "@/lib/types/changing-states";
import { INITIAL_CHANGING_STATES } from "@/lib/types/changing-states";
import { PressureCookerSpotlight } from "./PressureCookerSpotlight";

// ── Lab Notebook Pages ──────────────────────────────────

const CHANGING_STATES_NOTEBOOK: LabNotebookPage[] = [
  {
    title: "What Is Matter?",
    variant: "visual",
    body: "Everything around you — your chair, the air, even your drink — is made of tiny, tiny pieces called particles. They're way too small to see!",
    illustration: "/assets/matter_particles_full.png",
    caption: "Particles are the building blocks of everything",
    bgTint: "sky",
    decorator: "/assets/magnifying_glass.png",
  },
  {
    title: "Solids: Stuck Together",
    variant: "visual",
    body: "In a solid, particles hold hands tight and barely move. That's why ice cubes keep their shape — the particles are locked in place!",
    illustration: "/assets/ice_cube.png",
    caption: "Particles in a solid vibrate but stay in place",
    bgTint: "sky",
    decorator: "/assets/snowflake.png",
  },
  {
    title: "Liquids: Sliding Around",
    variant: "visual",
    body: "When you warm things up, particles get more energy and start sliding past each other. That's why water can pour — the particles are still close but free to move!",
    illustration: "/assets/water_drop.png",
    caption: "Liquid particles flow and take the shape of their container",
    bgTint: "sage",
    decorator: "/assets/beaker.png",
  },
  {
    title: "Gases: Flying Free",
    variant: "visual",
    body: "Add even more heat and particles zoom apart! In a gas, particles fly all over the place. That's why steam spreads out and fills the whole room.",
    illustration: "/assets/steam_wisp.png",
    caption: "Gas particles have tons of energy and spread out everywhere",
    bgTint: "peach",
    decorator: "/assets/flame.png",
  },
  {
    title: "Melting & Freezing",
    variant: "text",
    body: "When a solid gets warm enough, it melts into a liquid. The temperature where this happens is called the melting point.\nFor water, that's 0°C (32°F) — right at the point where ice turns to water!\nIf you cool a liquid back down past this point, it freezes back into a solid. Melting and freezing are opposites!",
    illustration: "/assets/ice_cube_face.png",
    bgTint: "sky",
  },
  {
    title: "Boiling & Condensing",
    variant: "text",
    body: "Keep heating a liquid and eventually it boils — turning into a gas! For water, the boiling point is 100°C (212°F).\nWhen a gas cools down and turns back into a liquid, that's called condensation. You see this when your cold glass gets foggy on a warm day!\nThe water droplets on the outside of the glass are gas particles that cooled down and became liquid again.",
    illustration: "/assets/flame_face.png",
    bgTint: "peach",
  },
  {
    title: "It's All About Energy!",
    variant: "text",
    body: "Here's the big secret: changing states is all about energy. Heat gives particles more energy to move. Cool things down and particles slow down.\nSolid → add heat → Liquid → add more heat → Gas\nGas → cool down → Liquid → cool more → Solid\nThe particles don't change what they are — water particles are always water particles. Only how much they move changes!",
    illustration: "/assets/sparkle_star.png",
    bgTint: "lavender",
  },
  {
    title: "Chocolate Melts!",
    variant: "fun-fact",
    body: "Chocolate melts at about 34°C — just below your body temperature of 37°C. That's why it melts in your hand! Scientists had to figure out the perfect temperature to make chocolate that stays solid in the wrapper but melts on your tongue.",
    illustration: "/assets/test_tube.png",
    bgTint: "mustard",
    caption: "Your body is a chocolate-melting machine",
  },
  {
    title: "Try It Yourself!",
    variant: "visual",
    body: "Use the temperature slider in the experiment to heat and cool the particles. Watch how they behave differently as a solid, liquid, and gas. Can you find the exact temperatures where things change?",
    illustration: "/assets/microscope.png",
    bgTint: "sage",
    decorator: "/assets/sparkle_star.png",
  },
];

// ── Topic Config ────────────────────────────────────────

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

  labNotebook: CHANGING_STATES_NOTEBOOK,

  progressCalculator: (progress) => {
    // Track discovered phases
    const phasesDiscovered = new Set<string>();

    if (progress.solid_discovered) phasesDiscovered.add("solid");
    if (progress.liquid_discovered) phasesDiscovered.add("liquid");
    if (progress.gas_discovered) phasesDiscovered.add("gas");

    const total = 3;
    const discovered = phasesDiscovered.size;

    return (discovered / total) * 100;
  },

  progressMilestones: {
    0: {
      icon: "🔬",
      text: "Start exploring the phases...",
    },
    33: {
      icon: "🌟",
      text: "First phase discovered!",
    },
    66: {
      icon: "🚀",
      text: "Two phases found!",
    },
    100: {
      icon: "🎉",
      text: "All phases discovered!",
    },
  },
};
