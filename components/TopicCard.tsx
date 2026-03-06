"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { TopicMeta } from "@/lib/types";
import { useLocale } from "@/contexts/LocaleContext";

const LEVEL_LABELS: Record<number, string> = {
  1: "Beginner",
  2: "Explorer",
  3: "Scientist",
};

const COLOR_MAP: Record<string, { bg: string; accent: string; icon: string }> = {
  "playful-sky": {
    bg: "bg-playful-sky/20",
    accent: "bg-playful-sky",
    icon: "/assets/ice_cube_face.png",
  },
  "playful-peach": {
    bg: "bg-playful-peach/20",
    accent: "bg-playful-peach",
    icon: "/assets/flame_face.png",
  },
  "playful-sage": {
    bg: "bg-playful-sage/20",
    accent: "bg-playful-sage",
    icon: "/assets/plant_leaf.png",
  },
  "playful-lavender": {
    bg: "bg-playful-lavender/20",
    accent: "bg-playful-lavender",
    icon: "/assets/sparkle_star.png",
  },
  "playful-mustard": {
    bg: "bg-playful-mustard/20",
    accent: "bg-playful-mustard",
    icon: "/assets/lightning_bolt.png",
  },
};

interface TopicCardProps {
  topic: TopicMeta;
  index: number;
}

export function TopicCard({ topic, index }: TopicCardProps) {
  const palette = COLOR_MAP[topic.color] ?? COLOR_MAP["playful-sky"];
  const { t } = useLocale();

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 + 0.2, duration: 0.5, ease: "easeOut" }}
    >
      <Link href={topic.route} className="block group">
        <div className="card-chunky overflow-hidden transition-all duration-150 group-hover:shadow-chunky-hover group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 group-active:shadow-none group-active:translate-x-1 group-active:translate-y-1">
          {/* Illustration area */}
          <div
            className={`${palette.bg} relative flex items-center justify-center h-48 border-b-4 border-ink overflow-hidden`}
          >
            {/* Decorative circles */}
            <div
              className={`absolute -top-6 -right-6 w-24 h-24 ${palette.accent} rounded-full opacity-40`}
            />
            <div
              className={`absolute -bottom-4 -left-4 w-16 h-16 ${palette.accent} rounded-full opacity-30`}
            />
            <img
              src={palette.icon}
              alt=""
              className="w-20 h-20 object-contain select-none relative z-10"
            />
          </div>

          {/* Content */}
          <div className="p-5">
            {/* Badges row */}
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`${palette.accent} border-2 border-ink px-2.5 py-0.5 text-xs font-bold font-body uppercase tracking-wide rounded-lg`}
              >
                {t.level} {topic.level}
              </span>
              <span className="bg-white border-2 border-ink px-2.5 py-0.5 text-xs font-bold font-body rounded-lg">
                {t.ages} {topic.ageRange[0]}–{topic.ageRange[1]}
              </span>
            </div>

            {/* Title */}
            <h2 className="font-display text-2xl font-bold leading-tight mb-2">
              {topic.title}
            </h2>

            {/* Description */}
            <p className="font-body text-sm text-ink/70 leading-relaxed">
              {topic.description}
            </p>

            {/* CTA hint */}
            <div className="mt-4 flex items-center gap-1.5 text-sm font-bold font-body text-ink/50 group-hover:text-ink transition-colors">
              <span>{t.startExploring}</span>
              <span className="inline-block transition-transform group-hover:translate-x-1">
                →
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
