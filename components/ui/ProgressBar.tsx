"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

interface ProgressMilestone {
  icon: string;
  text: string;
}

interface ProgressBarProps {
  progress: Record<string, unknown>;
  calculateProgress: (progress: Record<string, unknown>) => number;
  milestones: Record<number, ProgressMilestone>;
}

export function ProgressBar({
  progress,
  calculateProgress,
  milestones,
}: ProgressBarProps) {
  const percentage = useMemo(
    () => calculateProgress(progress),
    [progress, calculateProgress]
  );

  // Find the current milestone (highest threshold <= current percentage)
  const currentMilestone = useMemo(() => {
    const thresholds = Object.keys(milestones)
      .map(Number)
      .sort((a, b) => a - b);

    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (percentage >= thresholds[i]) {
        return milestones[thresholds[i]];
      }
    }

    return milestones[0] || { icon: "🔬", text: "Start exploring..." };
  }, [percentage, milestones]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute bottom-4 left-4 right-4 z-20"
    >
      <div
        className="border-4 border-ink rounded-2xl bg-paper shadow-chunky
          overflow-hidden transition-all duration-150"
      >
        <div className="p-4">
          {/* Milestone text */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">{currentMilestone.icon}</span>
            <span className="text-sm font-body text-ink/70">
              {currentMilestone.text}
            </span>
          </div>

          {/* Progress bar */}
          <div className="relative h-3 bg-ink/5 rounded-full overflow-hidden border-2 border-ink/10">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-playful-sky via-playful-lavender to-playful-peach rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
            />
          </div>

          {/* Percentage text */}
          <div className="mt-2 text-right">
            <span className="text-xs font-body text-ink/50">
              {Math.round(percentage)}% complete
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
