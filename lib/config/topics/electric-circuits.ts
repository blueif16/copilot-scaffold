import type { TopicConfig, LabNotebookPage } from "@/lib/types";
import type { ElectricCircuitsSimState } from "@/lib/types/electric-circuits";
import { INITIAL_ELECTRIC_CIRCUITS } from "@/lib/types/electric-circuits";

// ── Lab Notebook Pages ──────────────────────────────────

const ELECTRIC_CIRCUITS_NOTEBOOK: LabNotebookPage[] = [
  {
    title: "What Is Electricity?",
    variant: "visual",
    body: "Electricity is the flow of tiny particles called electrons. They're way too small to see, but they carry energy from one place to another — like water flowing through a pipe!",
    illustration: "/assets/lightning_bolt.png",
    caption: "Electrons carry energy through wires",
    bgTint: "mustard",
    decorator: "/assets/sparkle_star.png",
  },
  {
    title: "What Is a Circuit?",
    variant: "visual",
    body: "A circuit is a complete loop that electricity can travel around. If there's a gap anywhere in the loop, the electricity stops — just like a train can't run if the track is broken!",
    illustration: "/assets/circuit_components_full.png",
    caption: "Circuits need a complete path with no gaps",
    bgTint: "sky",
    decorator: "/assets/light_bulb.png",
  },
  {
    title: "The Battery",
    variant: "visual",
    body: "A battery is like a pump for electricity. It pushes electrons around the circuit. The + and − ends create a force called voltage that makes electrons want to move.",
    illustration: "/assets/battery.png",
    caption: "Batteries provide the energy to push electrons",
    bgTint: "peach",
  },
  {
    title: "Wires & Components",
    variant: "text",
    body: "Wires are the roads that electrons travel on. They're made of metal (usually copper) because metals let electrons flow easily.\nComponents are the useful things in your circuit — light bulbs, motors, switches, and more. Each one uses the electrical energy in a different way.\nA light bulb turns electrical energy into light. A motor turns it into motion!",
    illustration: "/assets/wire.png",
    bgTint: "sage",
  },
  {
    title: "Switches",
    variant: "text",
    body: "A switch is like a drawbridge in your circuit. When it's closed (on), electrons can cross and the circuit works. When it's open (off), there's a gap and electrons stop flowing.\nThat's exactly how the light switch on your wall works — it opens and closes a tiny gap in the wires inside the wall!",
    illustration: "/assets/switch.png",
    bgTint: "lavender",
  },
  {
    title: "Series vs. Parallel",
    variant: "text",
    body: "In a series circuit, components are connected in a single line. If one bulb breaks, they all go out — like old-fashioned Christmas lights!\nIn a parallel circuit, each component has its own path. If one bulb breaks, the others stay on. That's how the lights in your house work.\nParallel circuits are more reliable, but series circuits are simpler to build.",
    illustration: "/assets/connection_node.png",
    bgTint: "sky",
  },
  {
    title: "Edison's Light Bulb",
    variant: "fun-fact",
    body: "Thomas Edison tested over 3,000 different materials before finding the right one for his light bulb filament. He tried everything from coconut hair to fishing line! The winner? Carbonized bamboo, which glowed for over 1,200 hours.",
    illustration: "/assets/light_bulb.png",
    bgTint: "mustard",
    caption: "Sometimes science takes thousands of tries",
  },
  {
    title: "Build Your Circuit!",
    variant: "visual",
    body: "Drag components onto the workspace and connect them with wires. Start simple — a battery, two wires, and a bulb. Can you make it light up? Then try adding a switch!",
    illustration: "/assets/spark.png",
    bgTint: "peach",
    decorator: "/assets/sparkle_star.png",
  },
];

// ── Topic Config ────────────────────────────────────────

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

  spotlightContent: null,

  extraEmotions: [],
  extraAnimations: ["spark", "glow"],
  eventDebounceMs: 150,

  labNotebook: ELECTRIC_CIRCUITS_NOTEBOOK,
};
