// Course Builder Types

export type CourseFormat = "lab" | "quiz" | "dialogue";

export interface CourseTemplate {
  id: string;
  name: string;
  format: CourseFormat;
  description: string;
  icon: string;
  /** System prompt context injected when this format is selected */
  systemPromptContext: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export type BuilderPhase = "landing" | "chat" | "split";

/** Image uploaded by teacher for context (textbook page, worksheet, diagram) */
export interface UploadedImage {
  id: string;
  base64: string;       // raw base64 (no data: prefix)
  mimeType: string;     // e.g. "image/jpeg"
  filename: string;
}

/** Matches CourseBuilderState on the backend (CopilotKitState fields omitted) */
export interface CourseBuilderAgentState {
  files: Record<string, string>;
  uploaded_images: UploadedImage[];
}

export interface CourseBuilderState {
  phase: BuilderPhase;
  selectedTemplate: CourseTemplate | null;
  messages: ChatMessage[];
  isLoading: boolean;
  files: Record<string, string>;
}

export interface TemplateCardProps {
  template: CourseTemplate;
  onClick: (template: CourseTemplate) => void;
}

export interface CourseBuilderProps {
  // No props needed for now - fully self-contained
}
