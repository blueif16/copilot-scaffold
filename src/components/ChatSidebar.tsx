"use client";

import { useAgent, UseAgentUpdate, useCopilotKit } from "@copilotkitnext/react";
import { randomUUID } from "@ag-ui/client";
import type { Message } from "@ag-ui/client";
import { useState, useRef, useEffect, useCallback } from "react";
import Markdown from "react-markdown";
import { cn } from "@/lib/utils";
import type { LayoutMode } from "@/app/(chat)/page";
import { useVoiceInput } from "@/hooks/use-voice-input";

interface ParsedMessage {
  thinking: string | null;
  text: string;
  isThinkingComplete: boolean;
}

function parseMessage(content: string): ParsedMessage {
  const openIdx = content.indexOf("<think>");
  const closeIdx = content.indexOf("</think>");
  if (openIdx === -1) return { thinking: null, text: content.trim(), isThinkingComplete: false };
  if (closeIdx === -1) {
    return { thinking: content.slice(openIdx + 7).trim(), text: "", isThinkingComplete: false };
  }
  return {
    thinking: content.slice(openIdx + 7, closeIdx).trim(),
    text: content.slice(closeIdx + 8).trim(),
    isThinkingComplete: true,
  };
}

function ThinkingBlock({ thinking, isComplete, isStreaming }: { thinking: string; isComplete: boolean; isStreaming: boolean }) {
  const [open, setOpen] = useState(true);
  const [userToggled, setUserToggled] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isComplete && !userToggled) {
      const t = setTimeout(() => setOpen(false), 600);
      return () => clearTimeout(t);
    }
  }, [isComplete, userToggled]);

  useEffect(() => {
    if (open && contentRef.current && !isComplete) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [thinking, open, isComplete]);

  return (
    <div className="mb-2 rounded-lg border border-border/50 bg-muted/30 text-xs">
      <button
        className="flex w-full items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => { setUserToggled(true); setOpen((o) => !o); }}
        type="button"
      >
        {!isComplete && isStreaming ? (
          <span className="flex gap-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
          </span>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        )}
        <span className="font-medium">{!isComplete && isStreaming ? "Thinking…" : "Thought process"}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-auto transition-transform" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}><path d="M6 9l6 6 6-6"/></svg>
      </button>
      {open && (
        <div ref={contentRef} className="max-h-48 overflow-y-auto px-3 pb-2 font-mono whitespace-pre-wrap text-muted-foreground/80 leading-relaxed [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {thinking}
        </div>
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      title="Copy"
      type="button"
    >
      {copied ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
      )}
    </button>
  );
}

interface ChatSidebarProps {
  layoutMode: LayoutMode;
  onLayoutModeChange: (mode: LayoutMode) => void;
}

export function ChatSidebar({ layoutMode, onLayoutModeChange }: ChatSidebarProps) {
  const { copilotkit } = useCopilotKit();
  const { agent } = useAgent({
    agentId: "orchestrator",
    updates: [UseAgentUpdate.OnMessagesChanged, UseAgentUpdate.OnRunStatusChanged, UseAgentUpdate.OnStateChanged],
  });

  const [messages, setMessages] = useState<Message[]>(agent.messages);
  const [isRunning, setIsRunning] = useState<boolean>(agent.isRunning);
  const [focusedAgent, setFocusedAgent] = useState<string | null>((agent.state as any)?.focused_agent ?? null);

  useEffect(() => {
    // Sync state on mount — events may fire before this effect runs
    setMessages([...agent.messages]);
    setIsRunning(agent.isRunning);
    setFocusedAgent((agent.state as any)?.focused_agent ?? null);

    const { unsubscribe } = agent.subscribe({
      onMessagesChanged: ({ messages: msgs }) => setMessages([...msgs]),
      onRunInitialized: () => setIsRunning(true),
      onRunFinalized: () => setIsRunning(false),
      onRunFailed: () => setIsRunning(false),
      onStateChanged: ({ state: s }) => setFocusedAgent((s as any)?.focused_agent ?? null),
    });
    return unsubscribe;
  }, [agent]);

  // Track layout mode transitions
  useEffect(() => {
    if (messages.length > 0 && layoutMode === "initial") {
      onLayoutModeChange("chatting");
    }
  }, [messages.length, layoutMode, onLayoutModeChange]);

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { isListening, toggleListening } = useVoiceInput({
    onTranscript: (text) => setInput((prev) => prev ? `${prev} ${text}` : text),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isRunning) return;
    const text = input;
    setInput("");
    const tools = (copilotkit as any).runHandler?._tools ?? [];
    console.log(`[SIDEBAR] runAgent called — tools count: ${tools.length} names: ${tools.map((t: any) => t.name).join(',')}`);
    agent.addMessage({ id: randomUUID(), role: "user", content: text });
    copilotkit.runAgent({ agent });
  }, [input, isRunning, agent, copilotkit]);

  const visibleMessages = messages.filter(
    (msg: any) => (msg.role === "user" || msg.role === "assistant") && msg.content?.trim()
  );

  return (
    <div className="flex flex-col h-full">
      {/* Agent badge */}
      <div className="px-4 py-2 border-b text-sm flex items-center gap-2">
        <span className={cn("w-2 h-2 rounded-full", focusedAgent ? "bg-green-500" : "bg-blue-500")} />
        Talking to: <strong>{focusedAgent ? focusedAgent.replace(/_/g, " ") : "Orchestrator"}</strong>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {visibleMessages.length === 0 && (
          <div className="flex items-center justify-center text-muted-foreground text-sm h-full">
            <p>Send a message to get started.</p>
          </div>
        )}

        {visibleMessages.map((msg: any, i: number) => {
          if (msg.role === "user") {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[90%] rounded-2xl bg-primary px-3 py-2 text-primary-foreground">
                  <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                </div>
              </div>
            );
          }
          const isLastMsg = i === visibleMessages.length - 1;
          const { thinking, text, isThinkingComplete } = parseMessage(msg.content);
          return (
            <div key={msg.id} className="flex justify-start">
              <div className="flex flex-col items-start max-w-[90%]">
                {thinking !== null && (
                  <ThinkingBlock
                    thinking={thinking}
                    isComplete={isThinkingComplete}
                    isStreaming={isLastMsg && isRunning}
                  />
                )}
                {text && (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
                    <Markdown>{text}</Markdown>
                  </div>
                )}
                {!text && isThinkingComplete && isLastMsg && isRunning && (
                  <span className="inline-block h-4 w-0.5 animate-pulse bg-foreground" />
                )}
                {text && (
                  <div className="mt-1">
                    <CopyButton text={text} />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isRunning && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl bg-muted px-3 py-2">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/40" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:300ms]" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t">
        <div className="flex items-center gap-2">
          <input
            autoFocus
            className="flex-1 rounded-xl border bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
            disabled={isRunning}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask something..."
            value={input}
          />
          <button
            className={cn(
              "flex items-center justify-center rounded-xl border p-2 transition-colors",
              isListening
                ? "border-red-500 bg-red-50 text-red-500 dark:bg-red-950"
                : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            onClick={toggleListening}
            type="button"
            title={isListening ? "Stop recording" : "Voice input"}
            disabled={isRunning}
          >
            {isListening ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
            )}
          </button>
          {isRunning ? (
            <button
              className="flex items-center justify-center rounded-xl border bg-background p-2 text-foreground hover:bg-muted"
              onClick={() => agent.abortRun()}
              type="button"
              title="Stop"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
            </button>
          ) : (
            <button
              className="flex items-center justify-center rounded-xl bg-primary p-2 text-primary-foreground disabled:opacity-50"
              disabled={!input.trim()}
              onClick={handleSend}
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
