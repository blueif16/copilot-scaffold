import type { WidgetConfig } from "@/types/state";

const config: WidgetConfig = {
  id: "forecasts",
  tool: {
    name: "get_forecasts",
    description:
      "Fetch geopolitical and macro forecasts. Returns forecast title, confidence/probability, and analysis text. " +
      "Use when the user asks about forecasts, predictions, outlooks, or what might happen next. " +
      "keyword optionally filters results client-side.",
    parameters: {
      keyword: {
        type: "string",
        description: "Optional keyword to filter forecasts (e.g. 'oil', 'election', 'war').",
        default: "",
      },
    },
  },
  agent: null,
  layout: { width: "half", height: "tall" },
};

export default config;
