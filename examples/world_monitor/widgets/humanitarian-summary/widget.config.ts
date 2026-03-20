import type { WidgetConfig } from "@/types/state";

const config: WidgetConfig = {
  id: "humanitarian_summary",
  tool: {
    name: "get_humanitarian_summary",
    description:
      "Fetch humanitarian crisis summary for a country. Returns IDPs, refugees, food insecurity stats, and crisis overview. " +
      "Use when the user asks about humanitarian situations, displacement, refugees, or food crises in a specific country. " +
      "country_code is required and must be an ISO alpha-2 code (e.g. 'UA' for Ukraine, 'SD' for Sudan).",
    parameters: {
      country_code: {
        type: "string",
        description: "ISO alpha-2 country code (required). E.g. 'UA', 'SD', 'SY', 'AF', 'YE'.",
      },
    },
  },
  agent: null,
  layout: { width: "half", height: "medium" },
};

export default config;
