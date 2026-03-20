import type { WidgetConfig } from "@/types/state";

const config: WidgetConfig = {
  id: "country_risk",
  tool: {
    name: "get_country_risk",
    description:
      "Fetch country risk scores. Returns a ranked list of countries with composite risk scores and severity levels. " +
      "Use when the user asks about country risk, geopolitical risk, political stability, or risk rankings. " +
      "filter_codes optionally limits results to specific countries (comma-separated ISO alpha-2 codes).",
    parameters: {
      filter_codes: {
        type: "string",
        description: "Comma-separated ISO alpha-2 codes to filter (e.g. 'RU,CN,IR'). Leave empty for all.",
        default: "",
      },
    },
  },
  agent: null,
  layout: { width: "half", height: "tall" },
};

export default config;
