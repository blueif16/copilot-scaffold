"use client";

import { useAgent as useV2Agent, UseAgentUpdate, useCopilotKit } from "@copilotkitnext/react";
import { randomUUID } from "@ag-ui/client";
import type { Message } from "@ag-ui/client";
import { useAgent } from "@/hooks/use-agent";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { LayoutMode } from "@/app/(chat)/page";
import { useVoiceInput } from "@/hooks/use-voice-input";

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
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
      )}
    </button>
  );
}

function ThumbUpButton() {
  const [active, setActive] = useState(false);
  return (
    <button
      className={cn(
        "rounded p-1 transition-colors",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
      onClick={() => setActive((v) => !v)}
      title="Good response"
      type="button"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>
    </button>
  );
}

interface ChatProps {
  onCanvasModeChange?: (mode: LayoutMode) => void;
}

export function Chat({ onCanvasModeChange }: ChatProps) {
  const { state, running } = useAgent();
  const { copilotkit } = useCopilotKit();
  const { agent: v2Agent } = useV2Agent({
    agentId: "orchestrator",
    updates: [UseAgentUpdate.OnMessagesChanged, UseAgentUpdate.OnRunStatusChanged],
  });
  const [messages, setMessages] = useState<Message[]>(v2Agent.messages);
  const [isLoading, setIsLoading] = useState<boolean>(v2Agent.isRunning);

  useEffect(() => {
    const { unsubscribe } = v2Agent.subscribe({
      onMessagesChanged: ({ messages: msgs }) => setMessages([...msgs]),
      onRunInitialized: () => setIsLoading(true),
      onRunFinalized: () => setIsLoading(false),
      onRunFailed: () => setIsLoading(false),
    });
    return unsubscribe;
  }, [v2Agent]);

  const visibleMessages = messages.filter(
    (msg: any) => (msg.role === "user" || msg.role === "assistant") && msg.content?.trim()
  );

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { isListening, toggleListening } = useVoiceInput({
    onTranscript: (text) => setInput((prev) => prev ? `${prev} ${text}` : text),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const text = input;
    setInput("");
    const toolsSnapshot = (copilotkit as any).runHandler?._tools ?? [];
    console.log(`[CHAT] runAgent called — tools count: ${toolsSnapshot.length} names: ${toolsSnapshot.map((t: any) => t.name).join(',')}`);
    v2Agent.addMessage({ id: randomUUID(), role: "user", content: text });
    copilotkit.runAgent({ agent: v2Agent });
  };

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-8">
          {visibleMessages?.length === 0 && (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <p>Send a message to get started.</p>
            </div>
          )}

          {(visibleMessages || []).filter((msg: any) => msg.content?.trim()).map((msg: any) => (
            <div
              key={msg.id}
              className={cn(
                "mb-4 flex",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === "user" ? (
                <div className="max-w-[80%] rounded-2xl bg-primary px-4 py-3 text-primary-foreground">
                  <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                </div>
              ) : (
                <div className="flex flex-col items-start">
                  <p className="whitespace-pre-wrap text-sm text-foreground">{msg.content}</p>
                  <div className="mt-1 flex items-center gap-0.5">
                    <CopyButton text={msg.content} />
                    <ThumbUpButton />
                  </div>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="mb-4 flex justify-start">
              <div className="rounded-2xl bg-muted px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-background">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-4">
          <input
            autoFocus
            className="flex-1 rounded-xl border bg-background px-4 py-3 text-sm outline-none ring-ring focus:ring-2"
            disabled={isLoading}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message..."
            value={input}
          />
          <button
            className={cn(
              "flex items-center justify-center rounded-xl border p-3 transition-colors",
              isListening
                ? "border-red-500 bg-red-50 text-red-500 dark:bg-red-950"
                : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            onClick={toggleListening}
            type="button"
            title={isListening ? "Stop recording" : "Voice input"}
            disabled={isLoading}
          >
            {isListening ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
            )}
          </button>
          {isLoading ? (
            <button
              className="flex items-center justify-center rounded-xl border bg-background p-3 text-foreground hover:bg-muted"
              onClick={() => v2Agent.abortRun()}
              type="button"
              title="Stop"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
            </button>
          ) : (
            <button
              className="flex items-center justify-center rounded-xl bg-primary p-3 text-primary-foreground disabled:opacity-50"
              disabled={!input.trim()}
              onClick={handleSend}
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* Dev: State viewer */}
      {process.env.NODE_ENV === "development" && (
        <details className="fixed bottom-20 right-4 z-50 max-h-96 max-w-sm overflow-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-300 shadow-lg">
          <summary className="cursor-pointer font-mono text-gray-400">
            Agent State
          </summary>
          <pre className="mt-2 font-mono">
            {state ? JSON.stringify(state, null, 2) : 'No state'}
          </pre>
        </details>
      )}
    </div>
  );
}