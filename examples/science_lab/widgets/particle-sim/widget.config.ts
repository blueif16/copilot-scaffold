import type { WidgetConfig } from "@/types/state";

const config: WidgetConfig = {
  id: "particle_sim",
  tool: {
    name: "show_particle_sim",
    description: "Spawn the particle simulation widget",
    parameters: {
      initial_state: {
        type: "string",
        description: "Initial state - solid, liquid, or gas",
      },
    },
  },
  agent: null,
  layout: { width: "full", height: "fill" },
};

export default config;
