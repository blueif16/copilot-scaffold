"use client";

import { useCopilotChat } from "@copilotkit/react-core";
import { useAgent } from "@/hooks/use-agent";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export function Chat() {
  const { state, running } = useAgent();
  const {
    visibleMessages = [],
    appendMessage,
    stopGeneration,
    isLoading,
  } = useCopilotChat();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleMessages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const text = input;
    setInput("");
    appendMessage({ role: "user", content: text } as any);
  };

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-8">
          {visibleMessages.length === 0 && (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <p>Send a message to get started.</p>
            </div>
          )}

          {visibleMessages.map((msg: any) => (
            <div
              key={msg.id}
              className={cn(
                "mb-4 flex",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
              </div>
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
      <div className="sticky bottom-0 border-t bg-background">
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
          {isLoading ? (
            <button
              className="rounded-xl bg-destructive px-4 py-3 text-sm font-medium text-destructive-foreground"
              onClick={stopGeneration}
              type="button"
            >
              Stop
            </button>
          ) : (
            <button
              className="rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
              disabled={!input.trim()}
              onClick={handleSend}
              type="button"
            >
              Send
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
            {JSON.stringify(state, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
