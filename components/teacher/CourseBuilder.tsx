"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SandpackProvider,
  SandpackPreview,
} from "@codesandbox/sandpack-react";
import { CopilotKit } from "@copilotkit/react-core";
import { useCoAgent } from "@copilotkit/react-core";
import { useCopilotChat } from "@copilotkit/react-core";
import { Role, TextMessage } from "@copilotkit/runtime-client-gql";
import {
  CourseTemplate,
  ChatMessage,
  BuilderPhase,
  CourseFormat,
  CourseBuilderAgentState,
} from "@/lib/types/course-builder";
import SaveDraftButton from "@/components/teacher/SaveDraftButton";

// ── Format Templates ────────────────────────────────────

const TEMPLATES: CourseTemplate[] = [
  {
    id: "lab",
    name: "Lab Simulation",
    format: "lab",
    description: "Interactive simulation with controls and visual feedback",
    icon: "🧪",
    systemPromptContext:
      "The teacher wants to create an interactive LAB SIMULATION. Focus on visual simulations, sliders, drag-and-drop, and animated state changes.",
  },
  {
    id: "quiz",
    name: "Quiz",
    format: "quiz",
    description: "Questions with instant feedback and scoring",
    icon: "📝",
    systemPromptContext:
      "The teacher wants to create an interactive QUIZ. Focus on question sequencing, answer validation, scoring, progress tracking, and encouraging feedback.",
  },
  {
    id: "dialogue",
    name: "Dialogue",
    format: "dialogue",
    description: "Story-driven learning with branching choices",
    icon: "💬",
    systemPromptContext:
      "The teacher wants to create an interactive DIALOGUE / STORY experience. Focus on character interactions, branching choices, and narrative-driven learning.",
  },
];

// ── Inner Content (inside CopilotKit provider) ──────────

function CourseBuilderContent() {
  const [phase, setPhase] = useState<BuilderPhase>("landing");
  const [selectedTemplate, setSelectedTemplate] =
    useState<CourseTemplate | null>(null);
  const [input, setInput] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── CopilotKit hooks ──────────────────────────────────

  // Chat messages (conversational)
  const { visibleMessages, appendMessage, isLoading } = useCopilotChat();

  // Agent state (reactive file sync from backend)
  const { state: agentState } = useCoAgent<CourseBuilderAgentState>({
    name: "course-builder",
    initialState: { files: {} },
  });

  // Derived: files from agent state
  const files = agentState?.files || {};
  const hasFiles = Object.keys(files).length > 0;

  // Log state changes
  useEffect(() => {
    console.log("[Frontend:useCoAgent] State updated:", {
      fileCount: Object.keys(files).length,
      filePaths: Object.keys(files),
      totalSize: Object.values(files).reduce((sum, content) => sum + content.length, 0),
      timestamp: new Date().toISOString(),
    });
  }, [files]);

  // Convert CopilotKit messages to display format
  const messages: ChatMessage[] = (visibleMessages || [])
    .filter((msg: any) => {
      // Only show text messages with content
      return (
        msg &&
        typeof (msg as any).content === "string" &&
        (msg as any).content.trim() !== ""
      );
    })
    .map((msg: any) => ({
      id: msg.id,
      role: msg.role === Role.User ? ("user" as const) : ("assistant" as const),
      content: msg.content,
      timestamp: new Date(msg.createdAt || Date.now()),
    }));

  // ── Effects ───────────────────────────────────────────

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Transition to split when files appear
  useEffect(() => {
    if (hasFiles && phase === "chat") {
      console.log("[Frontend:phase] Transitioning chat → split (files detected)");
      setPhase("split");
    }
  }, [hasFiles, phase]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height =
        Math.min(inputRef.current.scrollHeight, 150) + "px";
    }
  }, [input]);

  // ── Handlers ──────────────────────────────────────────

  const handleFormatSelect = useCallback(
    (template: CourseTemplate) => {
      setSelectedTemplate(template);
      setPhase("chat");
      // Send format context as first assistant message
      appendMessage(
        new TextMessage({
          content: `Great, let's build a **${template.name}** lesson! What subject or topic do you want to teach, and what age group is it for?`,
          role: Role.Assistant,
        })
      );
    },
    [appendMessage]
  );

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isLoading) return;

    // If on landing and user types, transition to chat first
    if (phase === "landing") {
      setPhase("chat");
    }

    // Prepend format context on first user message if a template was selected
    const prefix =
      selectedTemplate && messages.filter((m) => m.role === "user").length === 0
        ? `[Format: ${selectedTemplate.format}] `
        : "";

    const finalMessage = prefix + text;
    console.log("[Frontend:handleSend] Sending message:", {
      content: finalMessage,
      phase,
      hasTemplate: !!selectedTemplate,
      timestamp: new Date().toISOString(),
    });

    appendMessage(
      new TextMessage({
        content: finalMessage,
        role: Role.User,
      })
    );
    setInput("");

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  }, [input, isLoading, phase, selectedTemplate, messages, appendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // ── Render helpers ────────────────────────────────────

  const renderMessages = (compact = false) => (
    <div className={`flex-1 overflow-y-auto ${compact ? "px-4 py-3" : "px-6 py-4"}`}>
      {messages.length === 0 && phase !== "landing" && (
        <div className="flex items-center justify-center h-full text-ink/30 font-body text-sm">
          Start typing to describe your lesson...
        </div>
      )}
      {messages.map((message) => (
        <div
          key={message.id}
          className={`mb-4 ${message.role === "user" ? "flex justify-end" : "flex justify-start"}`}
        >
          <div
            className={`max-w-[85%] px-4 py-3 rounded-2xl font-body text-sm leading-relaxed ${
              message.role === "user"
                ? "bg-ink text-white rounded-br-md"
                : "bg-ink/[0.04] text-ink rounded-bl-md"
            }`}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        </div>
      ))}
      {isLoading && (
        <div className="flex justify-start mb-4">
          <div className="bg-ink/[0.04] px-4 py-3 rounded-2xl rounded-bl-md">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-ink/30 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-ink/30 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-ink/30 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );

  const renderInputBar = () => (
    <div className="border-t border-ink/10 bg-white p-3">
      <div className="flex items-end gap-2 max-w-3xl mx-auto">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe your lesson..."
          rows={1}
          className="flex-1 resize-none px-4 py-2.5 rounded-xl border border-ink/15 font-body text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:border-ink/30 focus:ring-1 focus:ring-ink/10 transition-colors bg-ink/[0.02]"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-ink text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-ink/80 transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="translate-y-[-1px]"
          >
            <path
              d="M8 14V2M8 2L3 7M8 2L13 7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );

  // ── Landing Phase ─────────────────────────────────────

  if (phase === "landing") {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col bg-white rounded-xl border border-ink/10 overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <h1 className="font-display text-3xl font-semibold text-ink mb-2">
              Create a lesson
            </h1>
            <p className="font-body text-ink/50 text-sm">
              Pick a format, then describe what you want to teach
            </p>
          </motion.div>

          {/* Format pills */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex gap-3 mb-10"
          >
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => handleFormatSelect(t)}
                className="group flex items-center gap-2.5 px-5 py-3 rounded-xl border border-ink/12 hover:border-ink/25 hover:bg-ink/[0.02] transition-all font-body text-sm text-ink"
              >
                <span className="text-lg">{t.icon}</span>
                <div className="text-left">
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-ink/40">{t.description}</div>
                </div>
              </button>
            ))}
          </motion.div>

          {/* Input */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-2xl"
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Or just describe your lesson idea..."
                rows={1}
                className="flex-1 resize-none px-4 py-3 rounded-xl border border-ink/15 font-body text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:border-ink/30 focus:ring-1 focus:ring-ink/10 transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-ink text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-ink/80 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M8 14V2M8 2L3 7M8 2L13 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Chat Phase (full screen chat) ─────────────────────

  if (phase === "chat") {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col bg-white rounded-xl border border-ink/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-ink/10">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setPhase("landing");
                setSelectedTemplate(null);
              }}
              className="text-ink/40 hover:text-ink transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M15 18L9 12L15 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <h2 className="font-display text-lg font-medium text-ink">
              {selectedTemplate
                ? `${selectedTemplate.icon} ${selectedTemplate.name}`
                : "New Lesson"}
            </h2>
          </div>
          {selectedTemplate && (
            <span className="px-2.5 py-1 rounded-full bg-ink/[0.06] text-xs font-body text-ink/50">
              {selectedTemplate.format}
            </span>
          )}
        </div>

        {/* Messages */}
        {renderMessages()}

        {/* Input */}
        {renderInputBar()}
      </div>
    );
  }

  // ── Split Phase (chat + Sandpack) ─────────────────────

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-white rounded-xl border border-ink/10 overflow-hidden">
      {/* Left: Chat */}
      <div className="w-[420px] min-w-[360px] flex flex-col border-r border-ink/10">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-ink/10">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-base font-medium text-ink">
              {selectedTemplate
                ? `${selectedTemplate.icon} ${selectedTemplate.name}`
                : "New Lesson"}
            </h2>
          </div>
        </div>

        {renderMessages(true)}
        {renderInputBar()}
      </div>

      {/* Right: Preview */}
      <div className="flex-1 flex flex-col bg-[#FAFAFA]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-ink/10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="font-body text-sm text-ink/60">Live Preview</span>
          </div>
          <SaveDraftButton
            title={selectedTemplate?.name || "New Course"}
            description={selectedTemplate?.description}
            format={selectedTemplate?.format || "lab"}
            files={files}
          />
        </div>
        <div className="flex-1 overflow-hidden">
          {hasFiles ? (
            <SandpackProvider
              template="react"
              files={files}
              theme="light"
              options={{
                externalResources: [
                  "https://cdn.jsdelivr.net/npm/framer-motion@11/dist/framer-motion.js",
                ],
              }}
            >
              <SandpackPreview
                showOpenInCodeSandbox={false}
                showRefreshButton={true}
                style={{ height: "100%" }}
              />
            </SandpackProvider>
          ) : (
            <div className="flex items-center justify-center h-full text-ink/20 font-body text-sm">
              Preview will appear when the agent writes code...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Wrapper with CopilotKit Provider ────────────────────

export default function CourseBuilder() {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit" agent="course-builder">
      <CourseBuilderContent />
    </CopilotKit>
  );
}
