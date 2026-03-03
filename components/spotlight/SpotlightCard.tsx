"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { SpotlightConfig } from "@/lib/types";

interface SpotlightCardProps {
  config: SpotlightConfig;
  visible: boolean;
  onTap?: () => void;
}

export function SpotlightCard({ config, visible, onTap }: SpotlightCardProps) {
  const SpotlightContent = config.component;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: -20, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -20, scale: 0.95 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 25,
            mass: 0.8,
          }}
          className="fixed top-4 left-4 z-30 w-64 sm:w-72"
        >
          <button
            onClick={onTap}
            className="w-full text-left group cursor-pointer outline-none"
          >
            <div
              className="border-4 border-ink rounded-2xl bg-white shadow-chunky-lg 
                overflow-hidden transition-all duration-150
                group-hover:shadow-chunky-hover group-hover:-translate-x-0.5 group-hover:-translate-y-0.5
                group-active:shadow-chunky-sm group-active:translate-x-0.5 group-active:translate-y-0.5"
            >
              {/* Badge */}
              <div className="px-4 pt-3 pb-2 border-b-2 border-ink/10 bg-playful-lavender/20">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🔍</span>
                  <span className="font-display text-sm font-bold text-ink/70 uppercase tracking-wide">
                    Spotlight
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <SpotlightContent />
              </div>
            </div>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
