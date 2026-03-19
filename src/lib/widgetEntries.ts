import type { WidgetConfig } from "@/types/state";
import type { ComponentType } from "react";
import * as example from "./activeExample";

export interface WidgetEntry {
  config: WidgetConfig;
  Component: ComponentType<any>;
}

/**
 * Pairs widget components with their configs from the active example.
 *
 * Convention: each example barrel exports components as default exports
 * (e.g. UserCard, TopicProgress) and their configs with a "Config" suffix
 * (e.g. userCardConfig, topicProgressConfig).
 */
function buildWidgetEntries(): WidgetEntry[] {
  const entries: WidgetEntry[] = [];
  const configs: WidgetConfig[] = [];
  const components: Record<string, ComponentType<any>> = {};

  for (const [key, value] of Object.entries(example)) {
    if (value && typeof value === "object" && "tool" in value && "id" in value) {
      configs.push(value as WidgetConfig);
    } else if (typeof value === "function") {
      components[key] = value as ComponentType<any>;
    }
  }

  for (const config of configs) {
    // Find matching component: match by convention
    // Config id "user_card" matches component "UserCard"
    const componentName = config.id
      .split("_")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join("");

    const Component = components[componentName];
    if (Component) {
      entries.push({ config, Component });
    }
  }

  return entries;
}

export const widgetEntries: WidgetEntry[] = buildWidgetEntries();
