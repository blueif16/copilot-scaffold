"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { TopicMeta } from "@/lib/types";

// ── Color map (mirrors TopicCard) ────────────────────────

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

// ── Carousel Card ────────────────────────────────────────

function CarouselCard({
  topic,
  index,
}: {
  topic: TopicMeta;
  index: number;
}) {
  const palette = COLOR_MAP[topic.color] ?? COLOR_MAP["playful-sky"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.08 + 0.3, duration: 0.5, ease: "easeOut" }}
      className="flex-shrink-0 w-[280px] snap-center"
    >
      <Link href={topic.route} className="block group">
        <div className="card-chunky overflow-hidden transition-all duration-150 group-hover:shadow-chunky-hover group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 group-active:shadow-none group-active:translate-x-1 group-active:translate-y-1">
          {/* Illustration */}
          <div
            className={`${palette.bg} relative flex items-center justify-center h-36 border-b-4 border-ink overflow-hidden`}
          >
            <div
              className={`absolute -top-4 -right-4 w-20 h-20 ${palette.accent} rounded-full opacity-40`}
            />
            <div
              className={`absolute -bottom-3 -left-3 w-14 h-14 ${palette.accent} rounded-full opacity-30`}
            />
            <motion.img
              src={palette.icon}
              alt=""
              className="w-16 h-16 object-contain select-none relative z-10"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            />
          </div>

          {/* Content */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`${palette.accent} border-2 border-ink px-2 py-0.5 text-[10px] font-bold font-body uppercase tracking-wide rounded-lg`}
              >
                Level {topic.level}
              </span>
              <span className="bg-white border-2 border-ink px-2 py-0.5 text-[10px] font-bold font-body rounded-lg">
                Ages {topic.ageRange[0]}–{topic.ageRange[1]}
              </span>
            </div>

            <h2 className="font-display text-xl font-bold leading-tight mb-1.5">
              {topic.title}
            </h2>

            <p className="font-body text-xs text-ink/70 leading-relaxed line-clamp-2">
              {topic.description}
            </p>

            <div className="mt-3 flex items-center gap-1.5 text-xs font-bold font-body text-ink/50 group-hover:text-ink transition-colors">
              <span>Start exploring</span>
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

// ── Coming Soon Card ─────────────────────────────────────

function ComingSoonCard({ delay }: { delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      className="flex-shrink-0 w-[280px] snap-center"
    >
      <div className="border-4 border-dashed border-ink/20 rounded-2xl h-full min-h-[290px] flex flex-col items-center justify-center p-6 text-center">
        <img
          src="/assets/microscope.png"
          alt=""
          className="w-14 h-14 object-contain mb-3 opacity-40"
        />
        <p className="font-display text-base font-bold text-ink/30">
          More coming soon
        </p>
        <p className="font-body text-xs text-ink/20 mt-1">
          Volcanoes, weather, ecosystems…
        </p>
      </div>
    </motion.div>
  );
}

// ── Carousel Component ───────────────────────────────────

interface TopicCarouselProps {
  topics: TopicMeta[];
}

export function TopicCarousel({ topics }: TopicCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, []);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = 300;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <div className="relative w-full">
      {/* Section label */}
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="flex items-center gap-3 mb-4 px-6 sm:px-8 lg:px-12"
      >
        <div className="w-3 h-3 bg-playful-peach border-2 border-ink rounded-sm rotate-45" />
        <h2 className="font-display text-lg font-bold">Pick a topic</h2>
        <div className="flex-1 h-[3px] bg-ink/10 rounded-full" />
      </motion.div>

      {/* Scroll container */}
      <div
        ref={scrollRef}
        className="flex gap-5 overflow-x-auto scroll-smooth snap-x snap-mandatory px-6 sm:px-8 lg:px-12 pb-4 -mb-4 scrollbar-none"
      >

        {topics.map((topic, i) => (
          <CarouselCard key={topic.id} topic={topic} index={i} />
        ))}
        <ComingSoonCard delay={topics.length * 0.08 + 0.3} />

        {/* End spacer */}
        <div className="flex-shrink-0 w-4" />
      </div>

      {/* Navigation arrows */}
      <AnimatedArrow
        direction="left"
        visible={canScrollLeft}
        onClick={() => scroll("left")}
      />
      <AnimatedArrow
        direction="right"
        visible={canScrollRight}
        onClick={() => scroll("right")}
      />
    </div>
  );
}

// ── Arrow Button ─────────────────────────────────────────

function AnimatedArrow({
  direction,
  visible,
  onClick,
}: {
  direction: "left" | "right";
  visible: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      initial={false}
      animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.8 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      disabled={!visible}
      className={`
        absolute top-1/2 -translate-y-1/2 z-10
        w-10 h-10 rounded-full border-[3px] border-ink bg-white shadow-chunky-sm
        flex items-center justify-center font-bold text-lg
        hover:shadow-chunky hover:-translate-y-[calc(50%+1px)] active:shadow-none active:translate-y-[calc(-50%+2px)]
        transition-all duration-150 disabled:pointer-events-none
        ${direction === "left" ? "left-1 sm:left-2" : "right-1 sm:right-2"}
      `}
    >
      {direction === "left" ? "←" : "→"}
    </motion.button>
  );
}
