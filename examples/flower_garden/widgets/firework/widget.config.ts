import type { WidgetConfig } from "@/types/state";

const config: WidgetConfig = {
  id: "firework",
  tool: {
    name: "show_firework",
    description: "Launch an animated firework display that fills the screen. [Layout: full width, fill height]",
    parameters: {},
  },
  agent: null,
  layout: { width: "full", height: "fill" },
};

export default config;
