import type { WidgetConfig } from "@/types/state";

const config: WidgetConfig = {
  id: "market_overview",
  tool: {
    name: "get_market_overview",
    description:
      "Fetch global market data by category keys. Returns tables of quotes, signals, or flows for each requested key. " +
      "Use when the user asks about markets, commodities, crypto, macro signals, ETFs, or Gulf stocks. " +
      "keys (required) is a comma-separated list from: " +
      "marketQuotes, commodityQuotes, cryptoQuotes, macroSignals, stablecoinMarkets, gulfQuotes, sectors, etfFlows. " +
      "Example: 'commodityQuotes,cryptoQuotes' for commodities and crypto together.",
    parameters: {
      keys: {
        type: "string",
        description:
          "Comma-separated bootstrap keys (required). Options: marketQuotes, commodityQuotes, cryptoQuotes, " +
          "macroSignals, stablecoinMarkets, gulfQuotes, sectors, etfFlows.",
      },
    },
  },
  agent: null,
  layout: { width: "full", height: "tall" },
};

export default config;
