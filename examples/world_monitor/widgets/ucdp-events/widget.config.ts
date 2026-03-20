import type { WidgetConfig } from "@/types/state";

const config: WidgetConfig = {
  id: "ucdp_events",
  tool: {
    name: "get_ucdp_events",
    description:
      "Fetch UCDP (Uppsala Conflict Data Program) armed-conflict events. Returns country, deaths (best/low/high estimates), date, " +
      "actors (sideA vs sideB), and violence type (state-based, non-state, one-sided). " +
      "Use when the user asks about state-based armed conflicts, battle-related deaths, or organized violence. " +
      "country accepts ISO alpha-2 code (e.g. 'UA' for Ukraine, 'SY' for Syria).",
    parameters: {
      country: {
        type: "string",
        description: "ISO alpha-2 country code (e.g. 'UA', 'SY'). Leave empty for global.",
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
