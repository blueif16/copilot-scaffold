import type { WidgetConfig } from "@/types/state";

const config: WidgetConfig = {
  id: "security_advisories",
  tool: {
    name: "get_security_advisories",
    description:
      "Fetch travel and security advisories. Returns country, threat level, and advisory description. " +
      "Use when the user asks about travel safety, security warnings, or threat levels for countries. " +
      "filter_codes optionally limits results to specific countries.",
    parameters: {
      filter_codes: {
        type: "string",
        description: "Comma-separated ISO alpha-2 codes to filter (e.g. 'UA,SY,AF'). Leave empty for all.",
        default: "",
      },
    },
  },
  agent: null,
  layout: { width: "half", height: "tall" },
};

export default config;
