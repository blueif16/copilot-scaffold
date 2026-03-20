import type { WidgetConfig } from "@/types/state";

const config: WidgetConfig = {
  id: "prediction_markets",
  tool: {
    name: "get_prediction_markets",
    description:
      "Search prediction markets (Polymarket, Metaculus, etc.) for a query. Returns market question, yes/no probability, and volume. " +
      "Use when the user asks about predictions, forecasts, odds, or probabilities of geopolitical events. " +
      "category can be: politics, science, sports, crypto, economics, pop-culture, or leave empty for all.",
    parameters: {
      query: {
        type: "string",
        description: "Search query (required). E.g. 'Iran nuclear deal', 'US election', 'oil price'.",
      },
      category: {
        type: "string",
        description: "Filter by category: politics, science, sports, crypto, economics, pop-culture. Leave empty for all.",
        default: "",
      },
      page_size: {
        type: "number",
        description: "Number of markets to return (default 10, max 50).",
        default: 10,
      },
    },
  },
  agent: null,
  layout: { width: "half", height: "tall" },
};

export default config;
