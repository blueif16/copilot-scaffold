"use client";

import { useState } from "react";
import { useCopilotAction, useCoAgent } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";

type AgentState = {
  messages: string[];
  current_task: string;
  result: string;
};

export default function Home() {
  const [background, setBackground] = useState("linear-gradient(135deg, #667eea 0%, #764ba2 100%)");

  // [DATA-FLOW] useCoAgent: Sync state with backend LangGraph agent
  const { state, setState } = useCoAgent<AgentState>({
    name: "scaffold_agent",
    initialState: {
      messages: [],
      current_task: "",
      result: "",
    },
  });

  console.log("[DATA-FLOW] Agent state shape:", {
    messages: state.messages,
    current_task: state.current_task,
    result: state.result,
    timestamp: new Date().toISOString(),
  });

  // Frontend action: Change background color
  useCopilotAction({
    name: "changeBackgroundColor",
    description: "Change the background color of the interface. Accepts CSS background values including gradients.",
    parameters: [
      {
        name: "background",
        type: "string",
        description: "CSS background value (color, gradient, etc.)",
        required: true,
      },
    ],
    handler: async ({ background }) => {
      console.log("[DATA-FLOW] changeBackgroundColor called:", { background });
      setBackground(background);
      return `Background changed to ${background}`;
    },
  });

  // Frontend action: Update agent status manually
  useCopilotAction({
    name: "updateAgentTask",
    description: "Manually update the agent's current task",
    parameters: [
      {
        name: "task",
        type: "string",
        description: "New task value",
        required: true,
      },
    ],
    handler: async ({ task }) => {
      console.log("[DATA-FLOW] updateAgentTask called:", { task });
      setState({ ...state, current_task: task });
      return `Task updated to ${task}`;
    },
  });

  return (
    <div
      className="h-screen w-full flex items-center justify-center"
      style={{ background }}
    >
      <div className="w-full max-w-3xl h-[80vh] px-4">
        <div className="h-full bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-4 bg-black/20 border-b border-white/10">
            <h1 className="text-white text-xl font-semibold">CopilotKit + LangGraph</h1>
            <p className="text-white/70 text-sm mt-1">
              Task: <span className="font-mono">{state.current_task || "none"}</span>
            </p>
            {state.result && (
              <p className="text-white/70 text-sm mt-1">
                Result: <span className="font-mono">{state.result}</span>
              </p>
            )}
          </div>
          <CopilotChat
            className="h-[calc(100%-80px)]"
            labels={{
              initial: "Hi! I'm your AI assistant. How can I help you today?",
              placeholder: "Type a message...",
            }}
          />
        </div>
      </div>
    </div>
  );
}
