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
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-3">
            <img
              src="/assets/speech_tail.png"
              alt=""
              className="w-full h-full object-contain"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
