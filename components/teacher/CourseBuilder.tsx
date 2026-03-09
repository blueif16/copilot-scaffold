"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SandpackProvider,
  SandpackPreview,
  SandpackCodeEditor,
  useSandpack,
} from "@codesandbox/sandpack-react";
import { CopilotKit } from "@copilotkit/react-core";
import { useCoAgent } from "@copilotkit/react-core";
import { useCopilotChatInternal } from "@copilotkit/react-core";
import { useCopilotReadable } from "@copilotkit/react-core";
import { useCopilotAction } from "@copilotkit/react-core";
import type { CatchAllActionRenderProps } from "@copilotkit/react-core";
import { Role, TextMessage } from "@copilotkit/runtime-client-gql";
import {
  CourseTemplate,
  ChatMessage,
  CourseBuilderAgentState,
  UploadedImage,
  CourseBuilderConversation,
} from "@/lib/types/course-builder";
import SaveDraftButton from "@/components/teacher/SaveDraftButton";
import { getTemplateFiles } from "@/lib/templates";
import Markdown from "react-markdown";

// ── Helpers ─────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "夜深了";
  if (hour < 12) return "早上好";
  if (hour < 18) return "下午好";
  return "晚上好";
}

// ── Image helpers ───────────────────────────────────────

const MAX_IMAGE_DIMENSION = 1024;
const JPEG_QUALITY = 0.75;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB before resize

/** Resize image on a canvas and return compressed base64 (no data: prefix). */
function resizeAndCompressImage(
  file: File
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return reject(new Error("图片文件过大，请选择小于5MB的图片"));
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
          const ratio = Math.min(
            MAX_IMAGE_DIMENSION / width,
            MAX_IMAGE_DIMENSION / height
          );
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
        const base64 = dataUrl.split(",")[1];
        resolve({ base64, mimeType: "image/jpeg" });
      };
      img.onerror = () => reject(new Error("无法加载图片"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("无法读取文件"));
    reader.readAsDataURL(file);
  });
}

// ── Format card SVG icons ───────────────────────────────

function LabIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v8.5L6 22a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3l-6-9.5V4" />
      <path d="M10 4h12" />
      <path d="M10 19h12" />
      <circle cx="14" cy="22" r="1" fill="currentColor" stroke="none" />
      <circle cx="19" cy="21" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

function QuizIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="3" width="22" height="26" rx="2" />
      <path d="M10 10h12" />
      <path d="M10 15h12" />
      <path d="M10 20h8" />
      <path d="M22 19l2 2 4-4" />
    </svg>
  );
}

function DialogueIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10l-4 4v-4V8a2 2 0 0 1 2-2z" />
      <path d="M22 14h2a2 2 0 0 1 2 2v8l-4-4h-6a2 2 0 0 1-2-2v-2" />
    </svg>
  );
}

const FORMAT_ICONS: Record<string, () => JSX.Element> = {
  lab: LabIcon,
  quiz: QuizIcon,
  dialogue: DialogueIcon,
};

// ── Format Templates ────────────────────────────────────

const TEMPLATES: CourseTemplate[] = [
  {
    id: "lab",
    name: "实验模拟",
    format: "lab",
    description: "交互式模拟，操控变量观察变化",
    icon: "lab",
    systemPromptContext:
      "老师想创建一个交互式实验模拟。重点是可视化模拟、滑块、拖放操作和动画状态变化。",
  },
  {
    id: "quiz",
    name: "练习测验",
    format: "quiz",
    description: "即时反馈和评分的练习题",
    icon: "quiz",
    systemPromptContext:
      "老师想创建一个交互式测验。重点是题目顺序、答案验证、评分、进度跟踪和鼓励性反馈。",
  },
  {
    id: "dialogue",
    name: "对话故事",
    format: "dialogue",
    description: "故事驱动的学习与分支选择",
    icon: "dialogue",
    systemPromptContext:
      "老师想创建一个交互式对话/故事体验。重点是角色互动、分支选择和叙事驱动的学习。",
  },
];

// ── Message components (stable refs — no re-mount) ──────

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  // Extract image indicator from message content
  const imageMatch = message.content.match(/^\[已上传图片: ([^\]]+)\]\s*/);
  const hasImage = !!imageMatch;
  const imageName = imageMatch?.[1];
  const textContent = hasImage ? message.content.replace(/^\[已上传图片: [^\]]+\]\s*/, "") : message.content;

  return (
    <div className={`mb-6 ${isUser ? "flex justify-end" : ""}`}>
      <div
        className={`text-[15px] leading-[1.72] font-body ${
          isUser
            ? "max-w-[85%] px-4 py-3 bg-[#3D3929] text-[#F5F0E8] rounded-2xl rounded-br-sm"
            : "text-ink"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{textContent}</p>
        ) : (
          <div className="prose prose-sm max-w-none">
            <Markdown
              components={{
                p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                code: ({ inline, children, ...props }: any) =>
                  inline ? (
                    <code className="px-1.5 py-0.5 rounded bg-ink/[0.06] text-[13px] font-mono" {...props}>
                      {children}
                    </code>
                  ) : (
                    <code className="block px-3 py-2 rounded bg-ink/[0.06] text-[13px] font-mono overflow-x-auto" {...props}>
                      {children}
                    </code>
                  ),
                ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
                h1: ({ children }) => <h1 className="text-xl font-semibold mb-2 mt-4 first:mt-0">{children}</h1>,
                h2: ({ children }) => <h2 className="text-lg font-semibold mb-2 mt-3 first:mt-0">{children}</h2>,
                h3: ({ children }) => <h3 className="text-base font-semibold mb-2 mt-3 first:mt-0">{children}</h3>,
              }}
            >
              {textContent}
            </Markdown>
          </div>
        )}
      </div>
    </div>
  );
}

function ImageMessageBubble({ imageName, imageData }: { imageName: string; imageData?: UploadedImage }) {
  return (
    <div className="mb-6 flex justify-end">
      <div className="max-w-[85%] bg-[#3D3929] text-[#F5F0E8] rounded-2xl rounded-br-sm overflow-hidden">
        {imageData ? (
          <div className="flex flex-col">
            <img
              src={`data:${imageData.mimeType};base64,${imageData.base64}`}
              alt={imageName}
              className="w-full max-w-[320px] h-auto object-contain"
            />
            <div className="px-4 py-2 flex items-center gap-2 bg-[#3D3929]/80">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              <span className="text-[12px] opacity-75">{imageName}</span>
            </div>
          </div>
        ) : (
          <div className="px-4 py-3 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <span className="text-[13px] opacity-90">{imageName}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-1.5 py-2">
        <span className="w-[5px] h-[5px] bg-ink/25 rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-[5px] h-[5px] bg-ink/25 rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-[5px] h-[5px] bg-ink/25 rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}

// ── Tool Call Names ─────────────────────────────────────

// ── Sandpack Refresh Button (must be inside SandpackProvider) ──

function SandpackRefreshButton() {
  const { dispatch } = useSandpack();
  return (
    <button
      onClick={() => dispatch({ type: "refresh" })}
      title="刷新预览"
      className="w-7 h-7 flex items-center justify-center rounded-md text-ink/30 hover:text-ink/60 hover:bg-ink/[0.05] transition-colors"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2v6h-6" />
        <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
        <path d="M3 22v-6h6" />
        <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      </svg>
    </button>
  );
}

const TOOL_LABELS: Record<string, { label: string; icon: string }> = {
  read_file:   { label: "读取文件",   icon: "F" },
  write_file:  { label: "写入文件",   icon: "F" },
  update_file: { label: "更新文件",   icon: "F" },
  list_files:  { label: "列出文件",   icon: "☰" },
  delete_file: { label: "删除文件",   icon: "F" },
};

function ToolCallBubble({ name, args, status }: { name: string; args: any; status: string }) {
  const tool = TOOL_LABELS[name] || { label: name, icon: "⚙" };
  const path = args?.path as string | undefined;
  const isComplete = status === "complete";
  const [expanded, setExpanded] = useState(false);

  let summary = tool.label;
  if (path) summary += ` ${path}`;

  return (
    <div className="mb-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left group"
      >
        <span className={`w-5 h-5 flex items-center justify-center rounded text-[11px] font-bold flex-shrink-0 ${
          isComplete
            ? "bg-ink/[0.06] text-ink/40"
            : "bg-playful-blue/10 text-playful-blue animate-pulse"
        }`}>
          {tool.icon}
        </span>
        <span className="text-[13px] font-body text-ink/50 group-hover:text-ink/70 transition-colors">
          {summary}
        </span>
        {isComplete && (
          <span className="text-[11px] font-body px-1.5 py-0.5 rounded bg-ink/[0.04] text-ink/30">
            {expanded ? "收起" : "结果"}
          </span>
        )}
        {!isComplete && (
          <span className="text-[11px] font-body text-ink/25 animate-pulse">...</span>
        )}
      </button>
      {expanded && isComplete && (
        <div className="mt-1.5 ml-7 px-3 py-2 rounded-lg bg-ink/[0.02] border border-ink/[0.06] text-[12px] font-mono text-ink/40 max-h-[200px] overflow-auto whitespace-pre-wrap">
          {JSON.stringify(args, null, 2)}
        </div>
      )}
    </div>
  );
}

// ── Input Box (Claude-style, stable ref) ────────────────

function InputBox({
  inputRef,
  value,
  onChange,
  onKeyDown,
  onSend,
  isLoading,
  placeholder = "描述你想创建的课程...",
  pendingImage,
  onImageSelect,
  onImageRemove,
}: {
  inputRef: React.RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (val: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onSend: () => void;
  isLoading: boolean;
  placeholder?: string;
  pendingImage?: UploadedImage | null;
  onImageSelect?: (file: File) => void;
  onImageRemove?: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("image/") && onImageSelect) {
        onImageSelect(file);
      }
    },
    [onImageSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const file = Array.from(e.clipboardData.items)
        .find((item) => item.type.startsWith("image/"))
        ?.getAsFile();
      if (file && onImageSelect) {
        e.preventDefault();
        onImageSelect(file);
      }
    },
    [onImageSelect]
  );

  return (
    <div className="w-full max-w-[680px] mx-auto">
      <div
        className={`rounded-2xl border shadow-[0_1px_6px_rgba(0,0,0,0.04)] bg-white overflow-hidden transition-all focus-within:shadow-[0_1px_12px_rgba(0,0,0,0.07)] focus-within:border-ink/[0.18] ${
          isDragging
            ? "border-playful-blue/50 bg-playful-blue/[0.02]"
            : "border-ink/[0.12]"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {/* Image preview strip */}
        {pendingImage && (
          <div className="px-4 pt-3 pb-1">
            <div className="inline-flex items-center gap-2 px-2 py-1.5 rounded-lg bg-ink/[0.03] border border-ink/[0.06]">
              <img
                src={`data:${pendingImage.mimeType};base64,${pendingImage.base64}`}
                alt="Preview"
                className="w-10 h-10 rounded object-cover"
              />
              <span className="text-[12px] font-body text-ink/50 max-w-[140px] truncate">
                {pendingImage.filename}
              </span>
              <button
                onClick={onImageRemove}
                className="w-5 h-5 flex items-center justify-center rounded text-ink/30 hover:text-ink/60 hover:bg-ink/[0.06] transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        )}
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          rows={1}
          style={{ overflow: "hidden" }}
          className="w-full resize-none px-5 pt-4 pb-2 font-body text-[15px] text-ink placeholder:text-ink/35 focus:outline-none bg-transparent leading-relaxed"
        />
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && onImageSelect) onImageSelect(file);
            e.target.value = ""; // reset so same file can be re-selected
          }}
        />
        <div className="flex items-center justify-between px-4 pb-3 pt-0.5">
          <div className="flex items-center gap-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              title="上传图片（教材、试卷、手写笔记等）"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-ink/25 hover:text-ink/45 hover:bg-ink/[0.04] transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-body text-ink/35 select-none">Gemini 2.5 Flash</span>
            {isLoading ? (
              <div className="w-8 h-8 flex items-center justify-center">
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" className="opacity-15" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-ink/40" />
                </svg>
              </div>
            ) : (
              <AnimatePresence>
                {(value.trim() || pendingImage) && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.12 }}
                    onClick={onSend}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-ink text-white hover:bg-ink/85 active:scale-95 transition-all"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M8 14V2M8 2L3 7M8 2L13 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </motion.button>
                )}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Inner Content (inside CopilotKit provider) ──────────

type CourseBuilderPhase = "landing" | "chat";

interface CourseBuilderContentProps {
  threadId: string;
  currentConversationId: string | null;
  initialPhase: CourseBuilderPhase;
  onSessionStart: (session: {
    threadId: string;
    conversationId: string | null;
    phase: CourseBuilderPhase;
  }) => void;
  onConversationChange: (conversationId: string | null) => void;
}

function ConversationSidebar({
  isLoading,
  conversations,
  currentConversationId,
  onCreateConversation,
  onLoadConversation,
  onDeleteConversation,
}: {
  isLoading: boolean;
  conversations: CourseBuilderConversation[];
  currentConversationId: string | null;
  onCreateConversation: () => void | Promise<void>;
  onLoadConversation: (conversation: CourseBuilderConversation) => void | Promise<void>;
  onDeleteConversation: (conversationId: string) => void | Promise<void>;
}) {
  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 px-4 py-3 border-b border-ink/[0.06]">
        <button
          onClick={onCreateConversation}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-ink text-white hover:bg-ink/85 transition-colors text-[13px] font-medium"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          新对话
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-ink/30 text-[13px]">
            加载中...
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-ink/30 text-[13px]">
            暂无历史对话
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={`group mb-1 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                currentConversationId === conv.id
                  ? "bg-ink/[0.06]"
                  : "hover:bg-ink/[0.03]"
              }`}
              onClick={() => onLoadConversation(conv)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-ink truncate">
                    {conv.title || "未命名对话"}
                  </div>
                  <div className="text-[11px] text-ink/40 mt-0.5">
                    {new Date(conv.updated_at).toLocaleDateString("zh-CN", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void onDeleteConversation(conv.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded text-ink/30 hover:text-ink/60 hover:bg-ink/[0.06] transition-all"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CourseBuilderContent({
  threadId,
  currentConversationId,
  initialPhase,
  onSessionStart,
  onConversationChange,
}: CourseBuilderContentProps) {
  const [phase, setPhase] = useState<CourseBuilderPhase>(initialPhase);
  const [selectedTemplate, setSelectedTemplate] =
    useState<CourseTemplate | null>(null);
  const [input, setInput] = useState("");
  const [greeting] = useState(getGreeting);

  // Artifact panel
  const [showPreview, setShowPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState<"preview" | "code">("preview");

  // Image upload
  const [pendingImage, setPendingImage] = useState<UploadedImage | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  // Conversation history
  const [showHistory, setShowHistory] = useState(false);
  const [conversations, setConversations] = useState<CourseBuilderConversation[]>([]);
  const createConversationPromiseRef = useRef<Promise<string | null> | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── CopilotKit ────────────────────────────────────────

  const { messages: visibleMessages, appendMessage, isLoading } =
    useCopilotChatInternal();

  const { state: agentState, setState: setAgentState } = useCoAgent<CourseBuilderAgentState>({
    name: "course-builder",
    initialState: { files: {}, uploaded_images: [] },
  });

  // Track file changes for debugging
  useEffect(() => {
    const fileCount = Object.keys(agentState?.files || {}).length;
    const fileList = Object.keys(agentState?.files || {});
    const totalSize = Object.values(agentState?.files || {}).reduce((sum, content) => sum + content.length, 0);
    console.log('[CourseBuilder] Agent state updated:', {
      fileCount,
      files: fileList,
      totalSize
    });
  }, [agentState?.files]);

  useCopilotReadable({
    description: "Selected course format",
    value: selectedTemplate
      ? {
          format: selectedTemplate.format,
          name: selectedTemplate.name,
          context: selectedTemplate.systemPromptContext,
        }
      : null,
  });

  // ── Catch-all tool call renderer (renders inline in chat) ──
  useCopilotAction({
    name: "*",
    render: ({ name, args, status }: CatchAllActionRenderProps<[]>) => (
      <ToolCallBubble name={name} args={args} status={status} />
    ),
  });

  const files = agentState?.files || {};
  const hasFiles = Object.keys(files).length > 0;

  const messages: ChatMessage[] = (visibleMessages || [])
    .filter(
      (msg: any) =>
        msg &&
        typeof (msg as any).content === "string" &&
        (msg as any).content.trim() !== ""
    )
    .map((msg: any) => ({
      id: msg.id,
      role: msg.role === Role.User ? ("user" as const) : ("assistant" as const),
      content: msg.content,
      timestamp: new Date(msg.createdAt || Date.now()),
    }));

  // Track uploaded images by message ID for preview
  const [imageMessageMap, setImageMessageMap] = useState<Record<string, UploadedImage>>({});

  // Separate image messages from text messages
  const renderMessages = () => {
    return messages.map((message) => {
      const imageMatch = message.content.match(/^\[已上传图片: ([^\]]+)\]$/);
      if (imageMatch && message.role === "user") {
        const imageData = imageMessageMap[message.id];
        return <ImageMessageBubble key={message.id} imageName={imageMatch[1]} imageData={imageData} />;
      }
      return <MessageBubble key={message.id} message={message} />;
    });
  };

  // ── Effects ───────────────────────────────────────────

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // ── Sandpack key — bump when a response cycle ends so preview picks up all edits ──
  const [sandpackVersion, setSandpackVersion] = useState(0);
  const wasLoadingRef = useRef(false);
  useEffect(() => {
    if (wasLoadingRef.current && !isLoading) {
      setSandpackVersion((v) => v + 1);
    }
    wasLoadingRef.current = isLoading;
  }, [isLoading]);
  const sandpackKey = `${Object.keys(files).sort().join(',')}_v${sandpackVersion}`;

  // Open preview panel after first agent response completes (not on scaffold injection)
  useEffect(() => {
    if (sandpackVersion > 0 && hasFiles && !showPreview) setShowPreview(true);
  }, [sandpackVersion, hasFiles, showPreview]);

  // ── Conversation Management ───────────────────────────

  const loadConversations = async () => {
    setIsLoadingConversations(true);
    try {
      const response = await fetch("/api/course-builder/conversations");
      if (!response.ok) {
        const errorText = await response.text();
        console.error("[CourseBuilder] Failed to load conversations:", response.status, errorText);
        return;
      }

      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error("[CourseBuilder] Failed to load conversations:", error);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const createNewConversation = async () => {
    try {
      const response = await fetch("/api/course-builder/conversations/new", {
        method: "POST",
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[CourseBuilder] Failed to start new conversation:", response.status, errorText);
        return;
      }

      const data = await response.json();
      const newThreadId = data.thread_id;

      if (!newThreadId) {
        console.error("[CourseBuilder] Failed to start new conversation: missing thread_id");
        return;
      }

      onConversationChange(null);
      onSessionStart({
        threadId: newThreadId,
        conversationId: null,
        phase: "landing",
      });
    } catch (error) {
      console.error("[CourseBuilder] Failed to start new conversation:", error);
    }
  };

  const saveConversation = async (title?: string) => {
    if (messages.length === 0) return;

    let conversationId = currentConversationId;

    if (!conversationId) {
      try {
        if (!createConversationPromiseRef.current) {
          createConversationPromiseRef.current = (async () => {
            const response = await fetch("/api/course-builder/conversations", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                thread_id: threadId,
                title: title || generateConversationTitle(),
              }),
            });

            if (!response.ok) {
              const errorText = await response.text();
              console.error("[CourseBuilder] Failed to create conversation:", response.status, errorText);
              return null;
            }

            const data = await response.json();
            const newConversationId = data.conversation?.id ?? null;

            if (newConversationId) {
              onConversationChange(newConversationId);
              await loadConversations();
            }

            return newConversationId;
          })().finally(() => {
            createConversationPromiseRef.current = null;
          });
        }

        conversationId = await createConversationPromiseRef.current;
      } catch (error) {
        console.error("[CourseBuilder] Failed to save conversation:", error);
        return;
      }
    }

    if (conversationId) {
      await saveMessages(conversationId);
    }
  };

  const saveMessages = async (conversationId: string) => {
    if (messages.length === 0) return;

    try {
      const response = await fetch(`/api/course-builder/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[CourseBuilder] Failed to save messages:", response.status, errorText);
      }
    } catch (error) {
      console.error("[CourseBuilder] Failed to save messages:", error);
    }
  };

  const loadConversation = async (conversation: CourseBuilderConversation) => {
    onConversationChange(conversation.id);
    onSessionStart({
      threadId: conversation.thread_id,
      conversationId: conversation.id,
      phase: "chat",
    });
  };

  const deleteConversation = async (conversationId: string) => {
    if (!confirm("确定要删除这个对话吗？")) return;

    try {
      const response = await fetch(`/api/course-builder/conversations/${conversationId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await loadConversations();
        if (currentConversationId === conversationId) {
          await createNewConversation();
        }
      } else {
        const errorText = await response.text();
        console.error("[CourseBuilder] Failed to delete conversation:", response.status, errorText);
      }
    } catch (error) {
      console.error("[CourseBuilder] Failed to delete conversation:", error);
    }
  };

  const generateConversationTitle = () => {
    const firstUserMessage = messages.find(m => m.role === "user");
    if (firstUserMessage) {
      const content = firstUserMessage.content.slice(0, 50);
      return content.length < firstUserMessage.content.length ? `${content}...` : content;
    }
    return selectedTemplate ? `${selectedTemplate.name} 课程` : "新对话";
  };

  // Auto-save conversation when messages change
  useEffect(() => {
    if (messages.length > 0 && phase === "chat") {
      const timer = setTimeout(() => {
        saveConversation();
      }, 2000); // Debounce 2s
      return () => clearTimeout(timer);
    }
  }, [messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────

  const handleFormatSelect = useCallback((template: CourseTemplate) => {
    setSelectedTemplate(template);
    // Seed agent state with bare scaffold — agent will write_file to replace it
    const templateFiles = getTemplateFiles(template.format);
    setAgentState({ files: templateFiles, uploaded_images: [] });
    // Don't show preview yet — scaffold is just a placeholder
    // Preview opens automatically when hasFiles updates after agent writes real content
    setPhase("chat");
  }, [setAgentState]);

  const handleImageSelect = useCallback(async (file: File) => {
    setImageError(null);
    try {
      const { base64, mimeType } = await resizeAndCompressImage(file);
      setPendingImage({
        id: `img_${Date.now()}`,
        base64,
        mimeType,
        filename: file.name,
      });
    } catch (err: any) {
      setImageError(err.message || "图片处理失败");
      setTimeout(() => setImageError(null), 3000);
    }
  }, []);

  const handleImageRemove = useCallback(() => {
    setPendingImage(null);
  }, []);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text && !pendingImage) return;
    if (isLoading) return;
    if (phase === "landing") setPhase("chat");

    // If there's a pending image, push it into agent state
    if (pendingImage) {
      setAgentState({
        ...agentState,
        uploaded_images: [pendingImage],
      });

      // Send image as separate message and store the image data
      const imageMessage = new TextMessage({
        content: `[已上传图片: ${pendingImage.filename}]`,
        role: Role.User
      });

      // Store image data mapped to message ID for preview
      setImageMessageMap(prev => ({
        ...prev,
        [imageMessage.id]: pendingImage
      }));

      appendMessage(imageMessage);
    }

    // Send text message if there's text
    if (text) {
      appendMessage(new TextMessage({ content: text, role: Role.User }));
    }

    setInput("");
    setPendingImage(null);
  }, [input, isLoading, phase, appendMessage, pendingImage, agentState, setAgentState]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Shared input props to pass to InputBox
  const inputProps = {
    inputRef,
    value: input,
    onChange: setInput,
    onKeyDown: handleKeyDown,
    onSend: handleSend,
    isLoading,
    pendingImage,
    onImageSelect: handleImageSelect,
    onImageRemove: handleImageRemove,
  };

  // ════════════════════════════════════════════════════════
  // LANDING
  // ════════════════════════════════════════════════════════

  if (phase === "landing") {
    return (
      <div className="h-full flex flex-col">
        {/* Top bar — just title, like Claude's breadcrumb */}
        <div className="shrink-0 h-11 flex items-center justify-between px-5">
          <span className="font-body text-[13.5px] text-ink/50">课程生成器</span>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-ink/[0.08] hover:border-ink/[0.16] text-ink/45 hover:text-ink/65 transition-all text-[12px] font-body font-medium"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            历史对话
          </button>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* History sidebar */}
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 280, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="border-r border-ink/[0.06] bg-white overflow-hidden"
              >
                <ConversationSidebar
                  isLoading={isLoadingConversations}
                  conversations={conversations}
                  currentConversationId={currentConversationId}
                  onCreateConversation={createNewConversation}
                  onLoadConversation={loadConversation}
                  onDeleteConversation={deleteConversation}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Centered content */}
          <div className="flex-1 flex flex-col items-center min-h-0">
          <div className="flex-1 min-h-0" />

          {/* Greeting */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-3 mb-8"
          >
            <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="2.5" fill="#C4704B" />
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                <line
                  key={angle}
                  x1="18" y1="18"
                  x2={18 + 13 * Math.cos((angle * Math.PI) / 180)}
                  y2={18 + 13 * Math.sin((angle * Math.PI) / 180)}
                  stroke="#C4704B" strokeWidth="1.8" strokeLinecap="round"
                />
              ))}
            </svg>
            <h1 className="font-display text-[28px] font-normal text-ink tracking-[-0.01em]">
              {greeting}，老师
            </h1>
          </motion.div>

          {/* Input */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.35 }}
            className="w-full px-6 mb-8"
          >
            <InputBox {...inputProps} />
          </motion.div>

          {/* Format cards */}
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.35 }}
            className="w-full max-w-[680px] mx-auto px-6"
          >
            <p className="font-body text-[13px] text-ink/40 mb-3.5">
              选择格式，快速开始
            </p>
            <div className="flex gap-3">
              {TEMPLATES.map((t, i) => {
                const Icon = FORMAT_ICONS[t.format];
                return (
                  <motion.button
                    key={t.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.22 + i * 0.05, duration: 0.3 }}
                    onClick={() => handleFormatSelect(t)}
                    className="flex-1 text-left px-4 pt-4 pb-3.5 rounded-xl border border-ink/[0.09] hover:border-ink/[0.18] hover:shadow-[0_1px_6px_rgba(0,0,0,0.04)] transition-all duration-200 group"
                  >
                    <div className="text-ink/35 group-hover:text-ink/55 transition-colors mb-2.5">
                      <Icon />
                    </div>
                    <div className="font-body font-medium text-[13.5px] text-ink mb-0.5">
                      {t.name}
                    </div>
                    <div className="font-body text-[12px] text-ink/40 leading-snug">
                      {t.description}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          <div className="flex-[1.4] min-h-0" />
        </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  // CHAT
  // ════════════════════════════════════════════════════════

  return (
    <div className="h-full flex">
      {/* History sidebar */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="border-r border-ink/[0.06] bg-white overflow-hidden"
          >
            <ConversationSidebar
              isLoading={isLoadingConversations}
              conversations={conversations}
              currentConversationId={currentConversationId}
              onCreateConversation={createNewConversation}
              onLoadConversation={loadConversation}
              onDeleteConversation={deleteConversation}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar — breadcrumb title */}
        <div className="shrink-0 h-11 flex items-center justify-between px-5">
          <div className="flex items-center gap-1.5 text-[13.5px] font-body">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="mr-2 w-6 h-6 flex items-center justify-center rounded text-ink/30 hover:text-ink/60 hover:bg-ink/[0.05] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
            </button>
            <span className="text-ink/40">课程生成器</span>
            <span className="text-ink/25">/</span>
            <span className="text-ink/70">
              {selectedTemplate ? selectedTemplate.name : "新课程"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {hasFiles && !showPreview && (
              <button
                onClick={() => setShowPreview(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-ink/[0.08] hover:border-ink/[0.16] text-ink/45 hover:text-ink/65 transition-all text-[12px] font-body font-medium"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M12 3V21" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                预览
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-[680px] mx-auto px-6 py-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full pt-32">
                <p className="text-ink/20 font-body text-sm">描述你想创建的课程...</p>
              </div>
            ) : (
              <>
                {renderMessages()}
                {isLoading && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="shrink-0 px-6 pb-4 pt-2">
          <InputBox {...inputProps} placeholder="回复..." />
          <div className="text-center mt-2">
            {imageError ? (
              <span className="text-[11px] font-body text-red-500">
                {imageError}
              </span>
            ) : (
              <span className="text-[11px] font-body text-ink/25">
                AI 生成的内容可能存在错误，请仔细检查。支持拖放或粘贴图片。
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Artifact panel */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "55%", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="flex flex-col border-l border-ink/[0.06] bg-white overflow-hidden"
          >
            {hasFiles ? (
              <div className="flex-1 flex flex-col min-h-0">
              <SandpackProvider
                key={sandpackKey}
                template="react"
                files={files}
                theme="light"
                customSetup={{
                  dependencies: {
                    "framer-motion": "^11.0.0",
                  },
                }}
                options={{
                  activeFile: "/App.js",
                }}
              >
                {/* Toolbar — inside SandpackProvider so refresh button has context */}
                <div className="shrink-0 flex items-center justify-between pl-1 pr-2 py-1.5 border-b border-ink/[0.06]">
                  <div className="flex items-center">
                    <button
                      onClick={() => setPreviewMode("preview")}
                      className={`px-3.5 py-1.5 text-[12.5px] font-body font-medium rounded-md transition-colors ${
                        previewMode === "preview" ? "text-ink bg-ink/[0.06]" : "text-ink/40 hover:text-ink/60"
                      }`}
                    >
                      预览
                    </button>
                    <button
                      onClick={() => setPreviewMode("code")}
                      className={`px-3.5 py-1.5 text-[12.5px] font-body font-medium rounded-md transition-colors ${
                        previewMode === "code" ? "text-ink bg-ink/[0.06]" : "text-ink/40 hover:text-ink/60"
                      }`}
                    >
                      代码
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <SandpackRefreshButton />
                    <SaveDraftButton
                      title={selectedTemplate?.name || "新课程"}
                      description={selectedTemplate?.description}
                      format={selectedTemplate?.format || "lab"}
                      files={files}
                    />
                    <button
                      onClick={() => setShowPreview(false)}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-ink/30 hover:text-ink/60 hover:bg-ink/[0.05] transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                </div>
                {/* Content area */}
                <div className="flex-1 min-h-0" style={{ position: "relative" }}>
                  <div style={{
                    position: "absolute", inset: 0,
                    visibility: previewMode === "preview" ? "visible" : "hidden",
                  }}>
                    <SandpackPreview showOpenInCodeSandbox={false} showRefreshButton={false} style={{ height: "100%" }} />
                  </div>
                  <div style={{
                    position: "absolute", inset: 0,
                    visibility: previewMode === "code" ? "visible" : "hidden",
                  }}>
                    <SandpackCodeEditor showTabs showLineNumbers showInlineErrors wrapContent={false} style={{ height: "100%" }} />
                  </div>
                </div>
              </SandpackProvider>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-ink/20 font-body text-sm">
                代码生成后预览将在这里显示...
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Wrapper ─────────────────────────────────────────────

export default function CourseBuilder() {
  const [session, setSession] = useState<{
    threadId: string;
    conversationId: string | null;
    phase: CourseBuilderPhase;
  }>(() => {
    const savedThreadId =
      typeof window !== "undefined"
        ? localStorage.getItem("course_builder_thread_id")
        : null;

    return {
      threadId: savedThreadId || crypto.randomUUID(),
      conversationId: null,
      phase: "landing",
    };
  });
  const [sessionKey, setSessionKey] = useState(0);

  const handleSessionStart = useCallback((nextSession: {
    threadId: string;
    conversationId: string | null;
    phase: CourseBuilderPhase;
  }) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("course_builder_thread_id", nextSession.threadId);
    }

    setSession(nextSession);
    setSessionKey((value) => value + 1);
  }, []);

  const handleConversationChange = useCallback((conversationId: string | null) => {
    setSession((prev) => {
      if (prev.conversationId === conversationId) {
        return prev;
      }

      return {
        ...prev,
        conversationId,
      };
    });
  }, []);

  return (
    <CopilotKit
      key={`${session.threadId}:${sessionKey}`}
      runtimeUrl="/api/copilotkit"
      agent="course-builder"
      threadId={session.threadId}
    >
      <CourseBuilderContent
        threadId={session.threadId}
        currentConversationId={session.conversationId}
        initialPhase={session.phase}
        onSessionStart={handleSessionStart}
        onConversationChange={handleConversationChange}
      />
    </CopilotKit>
  );
}
