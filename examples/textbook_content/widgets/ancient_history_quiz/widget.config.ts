import type { WidgetConfig } from "@/types/state";

const config: WidgetConfig = {
  id: "ancient_history_quiz",
  tool: {
    name: "show_ancient_history_quiz",
    description:
      "Show the Ancient History Quiz. [Layout: full width, fill height]",
    parameters: {},
  },
  agent: "ancient_history_quiz",
  layout: { width: "full", height: "fill" },
};

export default config;
