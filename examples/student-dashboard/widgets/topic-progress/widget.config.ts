import type { WidgetConfig } from "@/types/state";

const config: WidgetConfig = {
  id: "topic_progress",
  tool: {
    name: "show_topic_progress",
    description: "Display progress bars for all science topics",
    parameters: {
      topics: {
        type: "array",
        description: "Array of { name, progress (0-1), status }",
      },
    },
  },
  agent: null,
  layout: { width: "half", height: "compact" },
};

export default config;
