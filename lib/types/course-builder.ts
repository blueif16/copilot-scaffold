// Course Builder Types

export type CourseFormat = "lab" | "dialogue";

export interface CourseTemplate {
  id: string;
  name: string;
  format: CourseFormat;
  description: string;
  color: string;
  icon: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export type BuilderPhase = "landing" | "chat" | "split";

export interface CourseBuilderState {
  phase: BuilderPhase;
  selectedTemplate: CourseTemplate | null;
  messages: ChatMessage[];
  isLoading: boolean;
  currentFile: string | null;
  files: Record<string, string>;
}

export interface TemplateCardProps {
  template: CourseTemplate;
  onClick: (template: CourseTemplate) => void;
}

export interface CourseBuilderProps {
  // No props needed for now - fully self-contained
}
