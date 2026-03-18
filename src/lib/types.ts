/** Scaffold type definitions. Extend with your app-specific types. */

export type AgentMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: string;
};
