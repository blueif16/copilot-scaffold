"use client";

import { useCopilotChat } from "@copilotkit/react-core";
import { Role, TextMessage } from "@copilotkit/runtime-client-gql";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

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

export function ChatSidebar() {
  const {
    visibleMessages,
    appendMessage,
    stopGeneration,
    isLoading,
  } = useCopilotChat();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleMessages]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    const text = input;
    setInput("");
    appendMessage(new TextMessage({ role: Role.User, content: text }));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Agent badge */}
      <div className="px-4 py-2 border-b text-sm flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-blue-500" />
        Talking to: <strong>Orchestrator</strong>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {visibleMessages.length === 0 && (
          <div className="flex items-center justify-center text-muted-foreground text-sm h-full">
            <p>Send a message to get started.</p>
          </div>
        )}

        {visibleMessages.map((msg: any) => {
          // Skip empty content messages (tool calls without text)
          if (!msg.content?.trim() && !msg.generativeUI) return null;

          return (
            <div
              key={msg.id}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === "user" ? (
                <div className="max-w-[90%] rounded-2xl bg-primary px-3 py-2 text-primary-foreground">
                  <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                </div>
              ) : (
                <div className="flex flex-col items-start max-w-[90%]">
                  {msg.content?.trim() && (
                    <p className="whitespace-pre-wrap text-sm text-foreground">
                      {msg.content}
                    </p>
                  )}
                  {/* Render generative UI from tool calls */}
                  {msg.generativeUI?.()}
                  {msg.content?.trim() && (
                    <div className="mt-1">
                      <CopyButton text={msg.content} />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-muted px-3 py-2">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/40" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:300ms]" />
              </div>
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
            disabled={isLoading}
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
          {isLoading ? (
            <button
              className="flex items-center justify-center rounded-xl border bg-background p-2 text-foreground hover:bg-muted"
              onClick={stopGeneration}
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
