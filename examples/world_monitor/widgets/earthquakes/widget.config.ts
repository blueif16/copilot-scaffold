import type { WidgetConfig } from "@/types/state";

const config: WidgetConfig = {
  id: "earthquakes",
  tool: {
    name: "get_earthquakes",
    description:
      "Fetch recent earthquake data. Returns magnitude, location, depth, and time. " +
      "Use when the user asks about earthquakes, seismic activity, or natural disasters. " +
      "filter_codes limits to specific countries. min_magnitude filters by minimum magnitude.",
    parameters: {
      filter_codes: {
        type: "string",
        description: "Comma-separated ISO alpha-2 codes to filter (e.g. 'JP,TR,ID'). Leave empty for global.",
        default: "",
      },
      min_magnitude: {
        type: "number",
        description: "Minimum earthquake magnitude to show (default 0).",
        default: 0,
      },
    },
  },
  agent: null,
  layout: { width: "half", height: "tall" },
};

export default config;
