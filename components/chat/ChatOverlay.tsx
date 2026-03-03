"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Message type for the local mock ─────────────────────

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatOverlayProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  onClose: () => void;
  isLoading: boolean;
}

export function ChatOverlay({
  messages,
  onSend,
  onClose,
  isLoading,
}: ChatOverlayProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debug logging
  useEffect(() => {
    console.log("[ChatOverlay] Received messages:", messages);
    console.log("[ChatOverlay] Message count:", messages.length);
  }, [messages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  // Focus input on open
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setInput("");
  }, [input, isLoading, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ type: "spring", stiffness: 350, damping: 30 }}
      className="fixed inset-x-3 bottom-3 top-auto z-50 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[380px]"
    >
      <div className="flex flex-col border-4 border-ink rounded-2xl bg-white shadow-chunky-lg overflow-hidden max-h-[70vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b-[3px] border-ink bg-playful-mustard/30">
          <span className="font-display text-base font-bold">
            Ask me anything!
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border-2 border-ink bg-white 
              flex items-center justify-center font-bold text-ink/70 
              hover:bg-ink hover:text-white transition-colors shadow-chunky-sm
              active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
            aria-label="Close chat"
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px] max-h-[45vh]"
        >
          {messages.length === 0 && (
            <p className="text-center text-sm text-ink/40 font-body mt-8">
              Ask a question about what you see!
            </p>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 font-body text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-playful-sky/40 border-2 border-ink/30 text-ink"
                      : "bg-playful-sage/30 border-2 border-ink/20 text-ink/90"
                  }`}
                >
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-playful-sage/20 border-2 border-ink/15 rounded-2xl px-4 py-3">
                <motion.div
                  className="flex gap-1.5"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                >
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full bg-ink/40"
                    />
                  ))}
                </motion.div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Input */}
        <div className="border-t-[3px] border-ink p-3 bg-paper/50">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a question…"
              disabled={isLoading}
              className="flex-1 border-2 border-ink rounded-xl px-3 py-2.5 font-body text-sm
                bg-white placeholder:text-ink/30 focus:outline-none focus:ring-2 
                focus:ring-playful-sky/50 disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="border-2 border-ink rounded-xl px-4 py-2.5 bg-playful-mustard 
                font-body text-sm font-bold shadow-chunky-sm
                hover:shadow-chunky hover:-translate-x-0.5 hover:-translate-y-0.5
                active:shadow-none active:translate-x-0.5 active:translate-y-0.5
                disabled:opacity-40 disabled:shadow-none disabled:translate-x-0 
                disabled:translate-y-0 transition-all"
            >
              Ask
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
