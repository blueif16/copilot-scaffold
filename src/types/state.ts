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

export interface WidgetConfig {
  id: string;
  tool: {
    name: string;
    description: string;
    parameters: Record<string, ToolParameter>;
  };
  agent: WidgetAgentConfig | null;
  layout?: {
    slot?: "full" | "half" | "third";
  };
}

export interface OrchestratorState {
  active_widgets: string[];
  focused_agent: string | null;
  widget_state: Record<string, unknown>;
  widget_summaries: Record<string, string>;
}
