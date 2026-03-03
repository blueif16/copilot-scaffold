"use client";

import { motion } from "framer-motion";
import { TOPICS } from "@/lib/topics";
import { TopicCard } from "@/components/TopicCard";

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-12 sm:px-8 lg:px-12">
      {/* Header */}
      <header className="max-w-4xl mx-auto mb-12">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h1 className="font-display text-5xl sm:text-6xl font-bold tracking-tight">
            Omniscience
          </h1>
          <p className="mt-3 font-body text-lg text-ink/60 max-w-lg">
            Pick a topic, start exploring. Your AI companion watches what you do
            and helps you discover the science behind it.
          </p>
        </motion.div>
      </header>

      {/* Topic Grid */}
      <section className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {TOPICS.map((topic, i) => (
            <TopicCard key={topic.id} topic={topic} index={i} />
          ))}

          {/* Coming Soon placeholder */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: TOPICS.length * 0.1 + 0.2,
              duration: 0.5,
              ease: "easeOut",
            }}
          >
            <div className="border-4 border-dashed border-ink/20 rounded-2xl h-full min-h-[320px] flex flex-col items-center justify-center p-6 text-center">
              <span className="text-4xl mb-3 opacity-40">🔬</span>
              <p className="font-display text-lg font-bold text-ink/30">
                More topics coming soon
              </p>
              <p className="font-body text-sm text-ink/20 mt-1">
                Volcanoes, weather, ecosystems…
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer hint */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.6 }}
        className="max-w-4xl mx-auto mt-16 text-center"
      >
        <p className="font-body text-xs text-ink/25">
          Built with CopilotKit + LangGraph · Ages 6–12
        </p>
      </motion.footer>
    </main>
  );
}
