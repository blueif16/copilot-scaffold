import type { WidgetConfig } from "@/types/state";
import type { ComponentType } from "react";
import * as studentDashboard from "../../examples/student_dashboard";
import * as scienceLab from "../../examples/science_lab";

export interface WidgetEntry {
  config: WidgetConfig;
  Component: ComponentType<any>;
}

/**
 * Load all widgets from ALL examples.
 * Each example is a separate app - they all load together.
 */
function buildWidgetEntries(): WidgetEntry[] {
  const entries: WidgetEntry[] = [];
  const examples = [studentDashboard, scienceLab];

  for (const example of examples) {
    const configs: WidgetConfig[] = [];
    const components: Record<string, ComponentType<any>> = {};

    for (const [key, value] of Object.entries(example || {})) {
      if (value && typeof value === "object" && "tool" in value && "id" in value) {
        configs.push(value as WidgetConfig);
      } else if (typeof value === "function") {
        components[key] = value as ComponentType<any>;
      }
    }

    for (const config of configs) {
      const componentName = config.id
        .split("_")
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join("");

      const Component = components[componentName];
      if (Component) {
        entries.push({ config, Component });
      }
    }
  }

  return entries;
}

export const widgetEntries: WidgetEntry[] = buildWidgetEntries();
