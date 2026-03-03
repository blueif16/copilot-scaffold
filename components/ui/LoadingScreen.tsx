"use client";

import { motion } from "framer-motion";

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = "Loading…" }: LoadingScreenProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-paper gap-6">
      {/* Animated companion face */}
      <motion.div
        className="w-20 h-20 rounded-full border-4 border-ink bg-playful-mustard shadow-chunky flex items-center justify-center"
        animate={{
          scale: [1, 1.06, 1],
          rotate: [0, 3, -3, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <span className="font-mono text-lg text-ink select-none">◠‿◠</span>
      </motion.div>

      <motion.p
        className="font-body text-sm text-ink/50"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      >
        {message}
      </motion.p>
    </div>
  );
}
