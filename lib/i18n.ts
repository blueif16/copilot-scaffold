export type Locale = "en" | "zh";

export const translations = {
  en: {
    appName: "Omniscience",
    footer: "Built with CopilotKit + LangGraph · Ages 6–12",
  },
  zh: {
    appName: "全知",
    footer: "基于 CopilotKit + LangGraph 构建 · 适合 6-12 岁",
  },
} as const;

export function getTranslation(locale: Locale) {
  return translations[locale];
}
