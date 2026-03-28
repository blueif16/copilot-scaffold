import type { WidgetConfig } from "@/types/state";

/**
 * Base widget config for quiz content.
 *
 * ARCHITECTURE NOTE:
 * This config exists so the orchestrator knows quiz widgets exist.
 * At publish time, each quiz generates its OWN widget directory with
 * its own component (transformed from Simulation.js) — but they ALL
 * share this same spawn tool and subagent.
 *
 * The model calls show_quiz(quiz_id) → spawn tool loads baked-in data
 * → the per-quiz component renders it with its unique visual treatment.
 *
 * For now (dev), QuizContent.tsx is a flexible base renderer.
 * Published quizzes will have their own components alongside it.
 */
const config: WidgetConfig = {
  id: "quiz_content",
  tool: {
    name: "show_quiz",
    description:
      "Show a quiz for students. Quizzes are pre-built by teachers with custom interactions and visuals. [Layout: full width, fill height]",
    parameters: {
      quiz_id: {
        type: "string",
        description: "Identifier of the published quiz to show",
      },
    },
  },
  agent: "quiz_content",
  layout: { width: "full", height: "fill" },
};

export default config;
