"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SandpackProvider, SandpackPreview } from "@codesandbox/sandpack-react";
import { CopilotKit } from "@copilotkit/react-core";
import { useCopilotChat, useCopilotAction } from "@copilotkit/react-core";
import { Role, TextMessage } from "@copilotkit/runtime-client-gql";
import {
  CourseTemplate,
  ChatMessage,
  BuilderPhase,
} from "@/lib/types/course-builder";
import TemplateCard from "./TemplateCard";
import SaveDraftButton from "@/app/(teacher)/courses/components/SaveDraftButton";

const TEMPLATES: CourseTemplate[] = [
  {
    id: "water-cycle",
    name: "Water Cycle",
    format: "lab",
    description: "Interactive simulation of evaporation, condensation, and precipitation",
    color: "#E0F2FE",
    icon: "💧",
  },
  {
    id: "solar-system",
    name: "Solar System",
    format: "lab",
    description: "Explore planets, orbits, and gravitational forces",
    color: "#FEF3C7",
    icon: "🪐",
  },
  {
    id: "photosynthesis",
    name: "Photosynthesis",
    format: "dialogue",
    description: "Conversational journey through plant energy production",
    color: "#D1FAE5",
    icon: "🌱",
  },
];

function CourseBuilderContent() {
  const [phase, setPhase] = useState<BuilderPhase>("landing");
  const [selectedTemplate, setSelectedTemplate] = useState<CourseTemplate | null>(null);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<Record<string, string>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // CopilotKit integration
  const {
    visibleMessages,
    appendMessage,
    isLoading,
  } = useCopilotChat();

  // Convert CopilotKit messages to our ChatMessage format
  const messages: ChatMessage[] = visibleMessages.map((msg) => {
    const msgAny = msg as any;
    return {
      id: msg.id,
      role: msgAny.role === Role.User ? "user" : "assistant",
      content: typeof msgAny.content === "string" ? msgAny.content : "",
      timestamp: new Date(msgAny.createdAt || Date.now()),
    };
  });

  // Handle write_file tool calls from agent
  useCopilotAction({
    name: "write_file",
    description: "Write a new file to the Sandpack preview",
    parameters: [
      {
        name: "path",
        type: "string",
        description: "File path (e.g., /App.tsx)",
        required: true,
      },
      {
        name: "content",
        type: "string",
        description: "File content",
        required: true,
      },
    ],
    handler: async ({ path, content }) => {
      setFiles((prev) => ({ ...prev, [path]: content }));
      // Transition to split view when first file is written
      if (Object.keys(files).length === 0) {
        setPhase("split");
      }
      return { success: true, path };
    },
  });

  // Handle update_file tool calls from agent
  useCopilotAction({
    name: "update_file",
    description: "Update an existing file in the Sandpack preview",
    parameters: [
      {
        name: "path",
        type: "string",
        description: "File path to update",
        required: true,
      },
      {
        name: "content",
        type: "string",
        description: "New file content",
        required: true,
      },
    ],
    handler: async ({ path, content }) => {
      setFiles((prev) => ({ ...prev, [path]: content }));
      return { success: true, path };
    },
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleMessages]);

  const handleTemplateClick = useCallback((template: CourseTemplate) => {
    setSelectedTemplate(template);
    setPhase("chat");
    appendMessage(
      new TextMessage({
        content: `Great choice! Let's build a ${template.name} lesson. What age group are you teaching?`,
        role: Role.Assistant,
      })
    );
  }, [appendMessage]);

  const handleSendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    appendMessage(
      new TextMessage({
        content: input,
        role: Role.User,
      })
    );
    setInput("");
  }, [input, isLoading, appendMessage]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  return (
    <div className="h-screen bg-paper flex flex-col">
      <AnimatePresence mode="wait">
        {/* Phase 1: Landing */}
        {phase === "landing" && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center p-8"
          >
            <motion.h1
              className="font-display text-5xl font-bold text-ink mb-4"
              initial={{ y: -20 }}
              animate={{ y: 0 }}
            >
              Create a Course
            </motion.h1>
            <motion.p
              className="font-body text-ink/70 text-lg mb-12"
              initial={{ y: -10 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.1 }}
            >
              Start with a template or describe what you want to build
            </motion.p>

            {/* Chat Input */}
            <motion.div
              className="w-full max-w-2xl mb-16"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                onFocus={() => {
                  if (input.trim()) setPhase("chat");
                }}
                placeholder="Describe your lesson idea..."
                className="w-full px-6 py-4 rounded-2xl border-4 border-ink shadow-chunky font-body text-lg focus:outline-none focus:shadow-chunky-hover transition-shadow"
              />
            </motion.div>

            {/* Template Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl">
              {TEMPLATES.map((template, idx) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + idx * 0.1 }}
                >
                  <TemplateCard template={template} onClick={handleTemplateClick} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Phase 2: Chat Only */}
        {phase === "chat" && (
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col"
          >
            {/* Header */}
            <div className="border-b-4 border-ink bg-white p-4">
              <h2 className="font-display text-2xl font-bold text-ink">
                {selectedTemplate?.name || "New Course"}
              </h2>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-2xl px-6 py-4 rounded-2xl border-4 border-ink ${
                      message.role === "user"
                        ? "bg-sky shadow-chunky-sm"
                        : "bg-white shadow-chunky-sm"
                    }`}
                  >
                    <p className="font-body text-ink">{message.content}</p>
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="max-w-2xl px-6 py-4 rounded-2xl border-4 border-ink bg-white shadow-chunky-sm">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-ink/40 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-ink/40 rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-ink/40 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t-4 border-ink bg-white p-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-3 rounded-xl border-4 border-ink shadow-chunky-sm font-body focus:outline-none focus:shadow-chunky transition-shadow"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isLoading}
                  className="btn-chunky px-6 py-3 bg-sky disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Phase 3: Split View */}
        {phase === "split" && (
          <motion.div
            key="split"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex"
          >
            {/* Chat Panel */}
            <div className="w-1/2 border-r-4 border-ink flex flex-col">
              {/* Header */}
              <div className="border-b-4 border-ink bg-white p-4">
                <h2 className="font-display text-2xl font-bold text-ink">
                  {selectedTemplate?.name || "New Course"}
                </h2>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-lg px-6 py-4 rounded-2xl border-4 border-ink ${
                        message.role === "user"
                          ? "bg-sky shadow-chunky-sm"
                          : "bg-white shadow-chunky-sm"
                      }`}
                    >
                      <p className="font-body text-ink">{message.content}</p>
                    </div>
                  </motion.div>
                ))}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="max-w-lg px-6 py-4 rounded-2xl border-4 border-ink bg-white shadow-chunky-sm">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-ink/40 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-ink/40 rounded-full animate-bounce delay-100" />
                        <div className="w-2 h-2 bg-ink/40 rounded-full animate-bounce delay-200" />
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t-4 border-ink bg-white p-4">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-3 rounded-xl border-4 border-ink shadow-chunky-sm font-body focus:outline-none focus:shadow-chunky transition-shadow"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isLoading}
                    className="btn-chunky px-6 py-3 bg-sky disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>

            {/* Preview Panel */}
            <div className="w-1/2 bg-white flex flex-col">
              <div className="border-b-4 border-ink bg-white p-4 flex justify-between items-center">
                <h3 className="font-display text-xl font-bold text-ink">Live Preview</h3>
                <SaveDraftButton
                  title={selectedTemplate?.name || "New Course"}
                  description={selectedTemplate?.description}
                  format={(selectedTemplate?.format === "lab" || selectedTemplate?.format === "quiz") ? selectedTemplate.format : "lab"}
                  files={files}
                />
              </div>
              <div className="flex-1 overflow-hidden">
                <SandpackProvider
                  template="react"
                  files={files}
                  theme="light"
                >
                  <SandpackPreview
                    showOpenInCodeSandbox={false}
                    showRefreshButton={true}
                    style={{ height: "100%" }}
                  />
                </SandpackProvider>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CourseBuilder() {
  return (
    <CopilotKit runtimeUrl="/api/course-builder" agent="course-builder">
      <CourseBuilderContent />
    </CopilotKit>
  );
}
