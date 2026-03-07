"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SandpackProvider, SandpackPreview } from "@codesandbox/sandpack-react";
import {
  CourseTemplate,
  ChatMessage,
  BuilderPhase,
} from "@/lib/types/course-builder";
import TemplateCard from "./TemplateCard";

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

export default function CourseBuilder() {
  const [phase, setPhase] = useState<BuilderPhase>("landing");
  const [selectedTemplate, setSelectedTemplate] = useState<CourseTemplate | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<Record<string, string>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleTemplateClick = useCallback((template: CourseTemplate) => {
    setSelectedTemplate(template);
    setPhase("chat");
    setMessages([
      {
        id: "1",
        role: "assistant",
        content: `Great choice! Let's build a ${template.name} lesson. What age group are you teaching?`,
        timestamp: new Date(),
      },
    ]);
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate AI response (will be replaced with actual API call in Slice 11)
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm working on that...",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  }, [input, isLoading]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  // Manual test trigger - simulates file update to test split pane transition
  const triggerSplitView = useCallback(() => {
    setFiles({
      "/App.tsx": `export default function App() {
  return (
    <div style={{ padding: 20 }}>
      <h1>Water Cycle Simulation</h1>
      <p>This is a placeholder preview</p>
    </div>
  );
}`,
    });
    setPhase("split");
  }, []);

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
                {/* Manual test button */}
                <button
                  onClick={triggerSplitView}
                  className="btn-chunky px-6 py-3 bg-peach text-sm"
                >
                  Test Split
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
                <button className="btn-chunky px-4 py-2 bg-sage text-sm">
                  Save Draft
                </button>
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
