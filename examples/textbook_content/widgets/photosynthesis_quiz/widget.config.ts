import type { WidgetConfig } from "@/types/state";

const config: WidgetConfig = {
  id: "photosynthesis_quiz",
  tool: {
    name: "show_photosynthesis_quiz",
    description:
      "Show the Photosynthesis Quiz — interactive quiz about how plants convert light into energy. [Layout: full width, fill height]",
    parameters: {},
  },
  agent: "photosynthesis_quiz",
  layout: { width: "full", height: "fill" },
};

export default config;
