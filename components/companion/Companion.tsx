"use client";

import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ReactionPayload, BaseEmotion } from "@/lib/types";
import { SpeechBubble } from "./SpeechBubble";
import { SuggestionBubbles } from "./SuggestionBubbles";

// ── Emotion → face mapping ──────────────────────────────

const EMOTION_FACES: Record<BaseEmotion, { face: string; bg: string }> = {
  idle: { face: "◡‿◡", bg: "bg-playful-mustard" },
  excited: { face: "✧◡✧", bg: "bg-playful-peach" },
  curious: { face: "◔.◔", bg: "bg-playful-sky" },
  impressed: { face: "⊙▽⊙", bg: "bg-playful-sage" },
  celebrating: { face: "★▽★", bg: "bg-playful-peach" },
  thinking: { face: "⊙﹏⊙", bg: "bg-playful-lavender" },
  encouraging: { face: "◠‿◠", bg: "bg-playful-mustard" },
  watching: { face: "◉_◉", bg: "bg-playful-sky/70" },
};

// ── Animation keyframes per animation key ───────────────

const ANIMATION_VARIANTS: Record<string, object> = {
  bounce: {
    y: [0, -12, 0],
    transition: { duration: 0.4, ease: "easeOut" },
  },
  nod: {
    rotate: [0, -8, 6, -4, 0],
    transition: { duration: 0.5, ease: "easeInOut" },
  },
  tilt_head: {
    rotate: [0, 12, 12, 0],
    transition: { duration: 0.8, ease: "easeInOut" },
  },
  confetti: {
    scale: [1, 1.2, 0.95, 1.1, 1],
    rotate: [0, -5, 5, -3, 0],
    transition: { duration: 0.6, ease: "easeOut" },
  },
  wave: {
    rotate: [0, 14, -10, 12, -6, 0],
    transition: { duration: 0.8, ease: "easeInOut" },
  },
  point: {
    x: [0, -6, 0],
    transition: { duration: 0.5, ease: "easeOut" },
  },
  none: {},
  // Topic-specific extras
  shiver: {
    x: [0, -2, 2, -2, 2, -1, 1, 0],
    transition: { duration: 0.5, ease: "linear" },
  },
  melt: {
    y: [0, 2, 4, 2, 0],
    scaleY: [1, 0.96, 0.92, 0.96, 1],
    transition: { duration: 0.8, ease: "easeInOut" },
  },
};

// ── Props ───────────────────────────────────────────────

interface CompanionProps {
  reaction: ReactionPayload | null;
  onSuggestionTap: (question: string) => void;
  onCompanionTap: () => void;
}

export function Companion({
  reaction,
  onSuggestionTap,
  onCompanionTap,
}: CompanionProps) {
  const emotion = (reaction?.emotion ?? "idle") as BaseEmotion;
  const faceData = EMOTION_FACES[emotion] ?? EMOTION_FACES.idle;
  const animKey = reaction?.animation ?? "none";
  const animVariant = ANIMATION_VARIANTS[animKey] ?? ANIMATION_VARIANTS.none;

  const hasMessage = !!reaction?.message;
  const hasSuggestions =
    !!reaction?.suggestions && reaction.suggestions.length > 0;

  // Memoize tap handler
  const handleSuggestionTap = useCallback(
    (q: string) => onSuggestionTap(q),
    [onSuggestionTap],
  );

  return (
    <div className="fixed bottom-6 right-4 z-40 flex flex-col items-center">
      {/* Speech bubble */}
      <SpeechBubble message={reaction?.message ?? null} visible={hasMessage} />

      {/* Suggestion bubbles */}
      <SuggestionBubbles
        suggestions={reaction?.suggestions ?? null}
        visible={hasSuggestions && !hasMessage}
        onTap={handleSuggestionTap}
      />

      {/* Companion avatar */}
      <motion.button
        onClick={onCompanionTap}
        className="relative group cursor-pointer outline-none focus:outline-none"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        aria-label="Talk to companion"
      >
        {/* Glow ring on active reaction */}
        <AnimatePresence>
          {reaction && reaction.type !== "observation" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute -inset-2 rounded-full border-2 border-ink/20"
              style={{
                background:
                  "radial-gradient(circle, rgba(244,211,94,0.25), transparent 70%)",
              }}
            />
          )}
        </AnimatePresence>

        {/* Main avatar circle */}
        <motion.div
          key={`avatar-${emotion}`}
          animate={animVariant}
          className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-ink 
            ${faceData.bg} shadow-chunky flex items-center justify-center 
            transition-colors duration-300`}
        >
          {/* Face */}
          <AnimatePresence mode="wait">
            <motion.span
              key={emotion}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="font-mono text-base sm:text-lg text-ink select-none leading-none"
              aria-hidden
            >
              {faceData.face}
            </motion.span>
          </AnimatePresence>

          {/* Celebration confetti particles */}
          <AnimatePresence>
            {emotion === "celebrating" && (
              <>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <motion.div
                    key={`confetti-${i}`}
                    initial={{ opacity: 1, scale: 1 }}
                    animate={{
                      opacity: 0,
                      y: -(30 + Math.random() * 20),
                      x: (Math.random() - 0.5) * 50,
                      scale: 0.4,
                      rotate: Math.random() * 360,
                    }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 1 + Math.random() * 0.5,
                      delay: i * 0.08,
                      ease: "easeOut",
                    }}
                    className="absolute w-2 h-2 rounded-sm"
                    style={{
                      backgroundColor: [
                        "#F4D35E",
                        "#7EC8E3",
                        "#FFB088",
                        "#B5D99C",
                        "#C3AED6",
                        "#FF8C5A",
                      ][i],
                      top: "30%",
                      left: "50%",
                    }}
                  />
                ))}
              </>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Tap hint pulse — when idle with no reaction */}
        {!reaction && (
          <motion.div
            className="absolute -inset-1 rounded-full border-2 border-ink/10"
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.3, 0, 0.3],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}
      </motion.button>
    </div>
  );
}
