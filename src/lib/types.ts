/** Scaffold type definitions. Extend with your app-specific types. */

import type { ComponentType } from "react";
import type { WidgetConfig } from "@/types/state";

export type AgentMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: string;
};

export interface WidgetEntry {
  config: WidgetConfig;
  Component: ComponentType<any>;
}

export interface SpawnedWidget {
  id: string;
  Component: ComponentType<any>;
  props: Record<string, any>;
}
