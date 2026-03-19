import type { WidgetConfig } from "@/types/state";

const config: WidgetConfig = {
  id: "user_card",
  tool: {
    name: "show_user_card",
    description: "Display the student's profile card with name and age",
    parameters: {
      username: { type: "string", description: "Student's display name" },
      age: { type: "number", description: "Student's age" },
    },
  },
  agent: null,
  layout: { width: "half", height: "compact" },
};

export default config;
