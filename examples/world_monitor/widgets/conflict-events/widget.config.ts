import type { WidgetConfig } from "@/types/state";

const config: WidgetConfig = {
  id: "conflict_events",
  tool: {
    name: "get_conflict_events",
    description:
      "Fetch ACLED armed-conflict events. Returns date, location, event type, fatalities, and actors. " +
      "Use when the user asks about wars, battles, protests, riots, or violence in a specific country or globally. " +
      "country accepts full English name (e.g. 'Ukraine', 'Syria'). " +
      "start/end are optional Unix timestamps to narrow the date range.",
    parameters: {
      country: {
        type: "string",
        description: "Country name to filter events (e.g. 'Ukraine', 'Syria'). Leave empty for global.",
        default: "",
      },
      start: {
        type: "number",
        description: "Start date as Unix timestamp. Leave empty for no lower bound.",
        default: 0,
      },
      end: {
        type: "number",
        description: "End date as Unix timestamp. Leave empty for no upper bound.",
        default: 0,
      },
      page_size: {
        type: "number",
        description: "Number of events to return (default 25, max 100).",
        default: 25,
      },
    },
  },
  agent: null,
  layout: { width: "half", height: "tall" },
};

export default config;
