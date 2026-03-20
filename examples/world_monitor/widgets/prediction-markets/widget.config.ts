import type { WidgetConfig } from "@/types/state";

const config: WidgetConfig = {
  id: "prediction_markets",
  tool: {
    name: "get_prediction_markets",
    description:
      "Search prediction markets (Polymarket, Kalshi) for a query. Returns market title, yes probability (0-1), volume, and close date. " +
      "Use when the user asks about predictions, forecasts, odds, or probabilities of events. " +
      "category can be: ai, tech, crypto, science, economy, fed, inflation, interest-rates, recession, trade, tariffs, debt-ceiling.",
    parameters: {
      query: {
        type: "string",
        description: "Search query (required, max 100 chars). E.g. 'Iran nuclear deal', 'US election', 'oil price'.",
      },
      category: {
        type: "string",
        description: "Filter by category: ai, tech, crypto, science, economy, fed, inflation, interest-rates, recession, trade, tariffs, debt-ceiling. Leave empty for all.",
        default: "",
      },
      page_size: {
        type: "number",
        description: "Number of markets to return (default 10, max 100).",
        default: 10,
      },
    },
  },
  agent: null,
  layout: { width: "half", height: "tall" },
};

export default config;
