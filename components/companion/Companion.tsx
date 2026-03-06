"use client";

import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ReactionPayload, BaseEmotion } from "@/lib/types";
import { SpeechBubble } from "./SpeechBubble";
import { SuggestionBubbles } from "./SuggestionBubbles";

// ── Emotion → face mapping ──────────────────────────────

const EMOTION_FACES: Record<BaseEmotion, { face: string; bg: string }> = {
  idle: { face: "/assets/face_happy.png", bg: "bg-playful-mustard" },
  excited: { face: "/assets/face_excited.png", bg: "bg-playful-peach" },
  curious: { face: "/assets/face_curious.png", bg: "bg-playful-sky" },
  impressed: { face: "/assets/face_impressed.png", bg: "bg-playful-sage" },
  celebrating: { face: "/assets/face_celebrating.png", bg: "bg-playful-peach" },
  thinking: { face: "/assets/face_thinking.png", bg: "bg-playful-lavender" },
  encouraging: { face: "/assets/face_encouraging.png", bg: "bg-playful-mustard" },
  watching: { face: "/assets/face_watching.png", bg: "bg-playful-sky/70" },
};

// ── Animation keyframes per animation key ───────────────

const ANIMATION_VARIANTS: Record<string, Record<string, unknown>> = {
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
  progress?: number; // 0-100 percentage
  progressColor?: string; // Color for the progress ring
}

export function Companion({
  reaction,
  onSuggestionTap,
  onCompanionTap,
  progress = 0,
  progressColor,
}: CompanionProps) {
  const emotion = (reaction?.emotion ?? "idle") as BaseEmotion;
  const faceData = EMOTION_FACES[emotion] ?? EMOTION_FACES.idle;
  const animKey = reaction?.animation ?? "none";
  const animVariant = (ANIMATION_VARIANTS[animKey] ?? ANIMATION_VARIANTS.none) as Record<string, unknown> | undefined;

  const hasMessage = !!reaction?.message;
  const hasSuggestions =
    !!reaction?.suggestions && reaction.suggestions.length > 0;

  // Memoize tap handler
  const handleSuggestionTap = useCallback(
    (q: string) => onSuggestionTap(q),
    [onSuggestionTap],
  );

  // Calculate circular progress
  const radius = 44; // Slightly larger than avatar (20/2 + padding)
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress / 100);

  // Determine progress color based on percentage
  const ringColor = progressColor ||
    (progress >= 100 ? "#F4D35E" : // mustard/gold
     progress >= 66 ? "#EE9B9B" :  // peach
     progress >= 33 ? "#C5A3D9" :  // lavender
     "#A8DADC");                    // sky

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
        {/* Circular progress ring - always visible */}
        <svg
          className="absolute inset-0 w-full h-full -rotate-90"
          style={{ width: "120px", height: "120px" }}
        >
          {/* Background circle */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="rgba(0,0,0,0.1)"
            strokeWidth="6"
          />
          {/* Progress circle */}
          <motion.circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
          />
        </svg>

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
          animate={animVariant as any}
          className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-ink
            ${faceData.bg} shadow-chunky flex items-center justify-center
            transition-colors duration-300`}
        >
          {/* Face */}
          <AnimatePresence mode="wait">
            <motion.img
              key={emotion}
              src={faceData.face}
              alt=""
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="w-12 h-12 sm:w-14 sm:h-14 object-contain select-none"
            />
          </AnimatePresence>

          {/* Celebration confetti particles */}
          <AnimatePresence>
            {emotion === "celebrating" && (
              <>
                {[0, 1, 2].map((i) => (
                  <motion.img
                    key={`confetti-${i}`}
                    src={["/assets/confetti_yellow.png", "/assets/confetti_blue.png", "/assets/confetti_peach.png"][i]}
                    alt=""
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
                    className="absolute w-4 h-4 object-contain"
                    style={{
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
