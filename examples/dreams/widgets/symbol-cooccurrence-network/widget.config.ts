import type { WidgetConfig } from "@/types/state";

const config: WidgetConfig = {
  id: "symbol_cooccurrence_network",
  tool: {
    name: "show_symbol_cooccurrence_network",
    description:
      "Show a force-directed symbol co-occurrence bubble network graph. Central symbol node with connected symbols sized by edge weight. [Layout: full width, tall height]",
    parameters: {
      symbol: {
        type: "string",
        description: "The central dream symbol to build the co-occurrence network around",
      },
    },
  },
  agent: null,
  layout: { width: "full", height: "tall" },
};

export default config;
