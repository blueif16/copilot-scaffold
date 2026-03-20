import type { WidgetConfig } from "@/types/state";

const config: WidgetConfig = {
  id: "news_feed",
  tool: {
    name: "get_news_feed",
    description:
      "Fetch curated news feed. Returns articles grouped by category with title, source, date, link, and threat assessment. " +
      "Use when the user asks for news about a specific topic area. " +
      "category selects which news bucket to display. " +
      "variant controls the feed variant: 'full' (default), 'tech', 'finance', 'happy', 'commodity'.",
    parameters: {
      category: {
        type: "string",
        description:
          "News category to display (required). The response contains multiple categories — this selects which to show. " +
          "Common categories: general, middleeast, conflict, asia, europe, americas, africa, energy, commodities, markets, crypto, tech, climate, health.",
      },
      variant: {
        type: "string",
        description: "Feed variant: 'full' (default), 'tech', 'finance', 'happy', 'commodity'.",
        default: "full",
      },
      keyword: {
        type: "string",
        description: "Optional keyword to filter article titles.",
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
