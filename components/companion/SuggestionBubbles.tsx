"use client";

import { motion, AnimatePresence } from "framer-motion";

interface SuggestionBubblesProps {
  suggestions: string[] | null;
  visible: boolean;
  onTap: (question: string) => void;
}

export function SuggestionBubbles({
  suggestions,
  visible,
  onTap,
}: SuggestionBubblesProps) {
  if (!suggestions || suggestions.length === 0 || !visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="flex flex-wrap gap-2 mb-2 max-w-[260px] justify-center"
      >
        {suggestions.map((q, i) => (
          <motion.button
            key={q}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{
              delay: 0.4 + i * 0.1,
              type: "spring",
              stiffness: 350,
              damping: 24,
            }}
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onTap(q)}
            className="border-2 border-ink bg-playful-sage/60 hover:bg-playful-sage 
              rounded-xl px-3 py-1.5 font-body text-xs font-medium text-ink/80
              shadow-chunky-sm transition-colors cursor-pointer"
          >
            {q}
          </motion.button>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
