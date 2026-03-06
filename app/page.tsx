"use client";

import { motion } from "framer-motion";
import { TOPICS } from "@/lib/topics";
import { CompanionHub } from "@/components/home/CompanionHub";
import { TopicCarousel } from "@/components/home/TopicCarousel";
import { useLocale } from "@/contexts/LocaleContext";

export default function HomePage() {
  const { t, locale, setLocale } = useLocale();

  return (
    <main className="h-screen flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <header className="flex-shrink-0 px-6 sm:px-8 lg:px-12 pt-8 pb-2">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex items-center gap-3 justify-between"
        >
          <div className="flex items-center gap-3">
            <motion.img
              src="/assets/beaker.png"
              alt=""
              className="w-9 h-9 object-contain select-none"
              animate={{ rotate: [0, -8, 8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
              {t.appName}
            </h1>
          </div>
          <button
            onClick={() => setLocale(locale === "en" ? "zh" : "en")}
            className="px-3 py-1.5 text-sm font-medium text-ink/60 hover:text-ink transition-colors"
          >
            {locale === "en" ? "中文" : "EN"}
          </button>
        </motion.div>
      </header>

      {/* ── Companion Hub (center stage) ── */}
      <section className="flex-1 min-h-0 flex items-center justify-center px-6 py-4 sm:py-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.5, ease: "easeOut" }}
          className="w-full h-full"
        >
          <CompanionHub />
        </motion.div>
      </section>

      {/* ── Topic Carousel (bottom) ── */}
      <section className="flex-shrink-0 pb-6">
        <TopicCarousel topics={TOPICS} />
      </section>

      {/* ── Footer ── */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="flex-shrink-0 text-center pb-4"
      >
        <p className="font-body text-[10px] text-ink/20">
          {t.footer}
        </p>
      </motion.footer>
    </main>
  );
}
