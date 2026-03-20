import type { WidgetConfig } from "@/types/state";

const config: WidgetConfig = {
  id: "country_stock_index",
  tool: {
    name: "get_country_stock_index",
    description:
      "Fetch the primary stock market index for a country. Returns index name, current price, and daily change percentage. " +
      "Use when the user asks about a country's stock market or equity index. " +
      "country_code is required and must be an ISO alpha-2 code (e.g. 'US' for S&P 500, 'JP' for Nikkei 225).",
    parameters: {
      country_code: {
        type: "string",
        description: "ISO alpha-2 country code (required). E.g. 'US', 'JP', 'DE', 'CN', 'GB'.",
      },
    },
  },
  agent: null,
  layout: { width: "half", height: "medium" },
};

export default config;
