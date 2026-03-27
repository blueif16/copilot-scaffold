import type { WidgetConfig } from "@/types/state";

const config: WidgetConfig = {
  id: "red_flower",
  tool: {
    name: "show_red_flower",
    description: "Show a giant red flower that fills the screen. [Layout: full width, fill height]",
    parameters: {},
  },
  agent: null,
  layout: { width: "full", height: "fill" },
};

export default config;
