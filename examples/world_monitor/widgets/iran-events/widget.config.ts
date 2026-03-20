import type { WidgetConfig } from "@/types/state";

const config: WidgetConfig = {
  id: "iran_events",
  tool: {
    name: "get_iran_events",
    description:
      "Fetch Iran-related conflict and geopolitical events. Returns a curated timeline of events involving Iran " +
      "including proxy conflicts, nuclear program developments, and regional incidents. " +
      "Use when the user asks about Iran, the Middle East, or Persian Gulf tensions.",
    parameters: {},
  },
  agent: null,
  layout: { width: "half", height: "tall" },
};

export default config;
