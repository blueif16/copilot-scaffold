import type { WidgetConfig } from "@/types/state";

const config: WidgetConfig = {
  id: "particle_bottle",
  tool: {
    name: "show_particle_bottle",
    description: "Show an animated bottle filled with bouncing particles. [Layout: half width, tall]",
    parameters: {
      color: {
        type: "string",
        description: "Particle color, e.g. '#ff4444' or 'blue'",
      },
    },
  },
  agent: null,
  layout: { width: "half", height: "tall" },
};

export default config;
