import type { WidgetConfig } from "@/types/state";
import type { ComponentType } from "react";
import studentDashboard from "../../examples/student_dashboard";

export interface WidgetEntry {
  config: WidgetConfig;
  Component: ComponentType<any>;
}

/**
 * Auto-discovers all widget configs and components from ALL examples.
 * Convention: each example barrel exports:
 *   - Component as default export (e.g. UserCard)
 *   - Config as named export with "Config" suffix (e.g. userCardConfig)
 */
function buildWidgetEntries(): WidgetEntry[] {
  const entries: WidgetEntry[] = [];
  const examples = [studentDashboard];

  for (const example of examples) {
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
  }

  return entries;
}

export const widgetEntries: WidgetEntry[] = buildWidgetEntries();
