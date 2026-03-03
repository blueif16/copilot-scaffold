"use client";

import { motion, AnimatePresence } from "framer-motion";

interface SpeechBubbleProps {
  message: string | null;
  visible: boolean;
}

export function SpeechBubble({ message, visible }: SpeechBubbleProps) {
  return (
    <AnimatePresence mode="wait">
      {visible && message && (
        <motion.div
          key={message}
          initial={{ opacity: 0, y: 8, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 28, mass: 0.8 }}
          className="relative mb-2 max-w-[240px]"
        >
          {/* Bubble body */}
          <div className="border-[3px] border-ink bg-white rounded-2xl px-4 py-3 shadow-chunky-sm">
            <p className="font-body text-sm leading-relaxed text-ink/90">
              {message}
            </p>
          </div>

          {/* Tail pointing down toward companion */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
            <svg
              width="16"
              height="10"
              viewBox="0 0 16 10"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="block"
            >
              <path
                d="M0 0L8 10L16 0"
                fill="white"
                stroke="#1A1A1A"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              {/* White cover to hide top border overlap */}
              <rect x="0" y="0" width="16" height="3" fill="white" />
            </svg>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
