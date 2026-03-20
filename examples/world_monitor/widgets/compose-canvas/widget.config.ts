import type { WidgetConfig } from "@/types/state";

const config: WidgetConfig = {
  id: "compose_canvas",
  tool: {
    name: "compose_canvas",
    description:
      "Render a styled dashboard title/header bar. Use this to give the composed dashboard a title and theme. " +
      "Call this FIRST before other widgets to set the visual framing. " +
      "theme can be 'dark' (default) or 'light'.",
    parameters: {
      title: {
        type: "string",
        description: "Dashboard title (required). E.g. 'Iran Situation Overview', 'Global Markets Dashboard'.",
      },
      columns: {
        type: "number",
        description: "Number of columns in the dashboard grid (default 2). Used as a hint for layout.",
        default: 2,
      },
      theme: {
        type: "string",
        description: "Visual theme: 'dark' or 'light'.",
        default: "dark",
      },
    },
  },
  agent: null,
  layout: { width: "full", height: "compact" },
};

export default config;
