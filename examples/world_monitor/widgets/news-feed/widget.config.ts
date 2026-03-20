import type { WidgetConfig } from "@/types/state";

const config: WidgetConfig = {
  id: "news_feed",
  tool: {
    name: "get_news_feed",
    description:
      "Fetch curated news feed filtered by category. Returns article title, source, date, and link. " +
      "Use when the user asks for news about a specific topic area. " +
      "category (required) must be one of: " +
      "general, middleeast, conflict, asia, europe, americas, africa, energy, commodities, " +
      "markets, crypto, tech, climate, health.",
    parameters: {
      category: {
        type: "string",
        description:
          "News category (required). One of: general, middleeast, conflict, asia, europe, americas, " +
          "africa, energy, commodities, markets, crypto, tech, climate, health.",
      },
      keyword: {
        type: "string",
        description: "Optional keyword to highlight in results.",
        default: "",
      },
      lang: {
        type: "string",
        description: "Language code (default 'en').",
        default: "en",
      },
    },
  },
  agent: null,
  layout: { width: "half", height: "tall" },
};

export default config;
