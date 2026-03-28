// Textbook Content — barrel export.
//
// Each widget is self-contained. Add one export line per published widget.
// The auto-discovery in widgetEntries.ts matches snake_case config id
// to PascalCase component export: photosynthesis_quiz → PhotosynthesisQuiz.

export {
  default as PhotosynthesisQuiz,
  config as photosynthesisQuizConfig,
} from "./widgets/photosynthesis_quiz";

export {
  default as AncientHistoryQuiz,
  config as ancientHistoryQuizConfig,
} from "./widgets/ancient_history_quiz";

// TODO: future published widgets get added here by the transform script:
// export { default as CellDivisionLesson, config as cellDivisionLessonConfig } from "./widgets/cell_division_lesson";
// export { default as SolarSystemQuiz, config as solarSystemQuizConfig } from "./widgets/solar_system_quiz";
