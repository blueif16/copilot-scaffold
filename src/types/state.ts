/** Widget platform v2 types */

export interface ToolParameter {
  type: string;
  description?: string;
  default?: unknown;
  enum?: string[];
}

export interface WidgetAgentConfig {
  id: string;
  promptFile: string;
  toolsModule: string;
}

export interface WidgetLayout {
  /** Width: "full" (100%), "half" (50%), "third" (33%). Default: "half" */
  width?: "full" | "half" | "third";
  /** Height hint: "compact" (~auto), "medium" (~300px), "tall" (~500px), "fill" (stretch to fill panel). Default: "compact" */
  height?: "compact" | "medium" | "tall" | "fill";
}

export interface WidgetConfig {
  id: string;
  tool: {
    name: string;
    description: string;
    parameters: Record<string, ToolParameter>;
  };
  agent: WidgetAgentConfig | null;
  layout?: WidgetLayout;
}

export interface OrchestratorState {
  active_widgets: string[];
  focused_agent: string | null;
  widget_state: Record<string, unknown>;
  widget_summaries: Record<string, string>;
}
