import type { WidgetConfig } from "@/types/state";

const config: WidgetConfig = {
  id: "community_mirror",
  tool: {
    name: "show_community_mirror",
    description:
      "Show anonymized community dream snippets that mirror the user's dream symbol, with emotion tags and similarity scores. [Layout: third width, medium height]",
    parameters: {
      symbol: {
        type: "string",
        description: "The dream symbol to find similar community dreams for",
      },
    },
  },
  agent: null,
  layout: { width: "third", height: "medium" },
};

export default config;
