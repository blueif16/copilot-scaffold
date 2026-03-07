"use client";

import { Suspense, useState, useEffect, useRef, type ComponentType } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { CopilotKit } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";
import { TopicRunner } from "@/framework/TopicRunner";
import { getTopicSessionId, clearTopicSession } from "@/lib/session";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { ConnectionStatus } from "@/components/ui/ConnectionStatus";
import { TOPICS } from "@/lib/topics";
import { useAuth } from "@/contexts/AuthContext";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import type { TopicConfig, SimulationProps, TopicMeta } from "@/lib/types";

// ── Color palette for mini cards ─────────────────────────

const STRIP_COLORS: Record<string, { bg: string; accent: string; icon: string }> = {
  "playful-sky":      { bg: "bg-playful-sky/20",      accent: "bg-playful-sky",      icon: "/assets/ice_cube_face.png" },
  "playful-peach":    { bg: "bg-playful-peach/20",    accent: "bg-playful-peach",    icon: "/assets/flame_face.png" },
  "playful-sage":     { bg: "bg-playful-sage/20",     accent: "bg-playful-sage",     icon: "/assets/plant_leaf.png" },
  "playful-lavender": { bg: "bg-playful-lavender/20", accent: "bg-playful-lavender", icon: "/assets/sparkle_star.png" },
  "playful-mustard":  { bg: "bg-playful-mustard/20",  accent: "bg-playful-mustard",  icon: "/assets/lightning_bolt.png" },
};

// ── Mini Topic Card (for sidebar) ────────────────────────

function MiniTopicCard({
  topic,
  isCurrent,
  index,
}: {
  topic: TopicMeta;
  isCurrent: boolean;
  index: number;
}) {
  const palette = STRIP_COLORS[topic.color] ?? STRIP_COLORS["playful-sky"];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ delay: index * 0.05, duration: 0.25, ease: "easeOut" }}
    >
      <Link
        href={topic.route}
        className={`block group ${
          isCurrent ? "pointer-events-none" : ""
        }`}
      >
        <div
          className={`
            border-[3px] border-ink rounded-xl overflow-hidden transition-all duration-150
            ${isCurrent
              ? "shadow-chunky-sm ring-2 ring-ink/20"
              : "shadow-chunky-sm hover:shadow-chunky hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
            }
          `}
        >
          {/* Icon strip */}
          <div
            className={`${palette.bg} relative flex items-center justify-center h-14 border-b-[3px] border-ink overflow-hidden`}
          >
            <div
              className={`absolute -top-2 -right-2 w-8 h-8 ${palette.accent} rounded-full opacity-40`}
            />
            <img
              src={palette.icon}
              alt=""
              className="w-8 h-8 object-contain select-none relative z-10"
            />
            {isCurrent && (
              <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-ink rounded-full z-20" />
            )}
          </div>

          {/* Text */}
          <div className="bg-white px-2.5 py-2">
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className={`${palette.accent} border-[2px] border-ink px-1.5 py-px text-[8px] font-bold font-body uppercase tracking-wide rounded-md`}
              >
                L{topic.level}
              </span>
              <span className="bg-white border-[2px] border-ink px-1.5 py-px text-[8px] font-bold font-body rounded-md">
                {topic.ageRange[0]}–{topic.ageRange[1]}
              </span>
            </div>
            <h3 className="font-display text-sm font-bold leading-tight">
              {topic.title}
            </h3>
            <p className="font-body text-[10px] text-ink/60 leading-snug mt-0.5 line-clamp-2">
              {topic.description}
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ── Props ───────────────────────────────────────────────

interface TopicPageLayoutProps<
  SimState extends Record<string, unknown>,
  E extends string = never,
  A extends string = never,
> {
  /** URL-safe slug, e.g. "changing-states" */
  topicSlug: string;
  /** Human-readable title shown on left strip, e.g. "Changing States" */
  title: string;
  /** Message shown while waiting for client mount */
  loadingMessage: string;
  /** Topic configuration (prompts, reactions, initial state, etc.) */
  config: TopicConfig<SimState, E, A>;
  /** The simulation React component for this topic */
  SimulationComponent: ComponentType<SimulationProps<SimState>>;
}

// ── Inner content (needs CopilotKit context) ────────────

function TopicPageContent<
  SimState extends Record<string, unknown>,
  E extends string = never,
  A extends string = never,
>({
  topicSlug,
  title,
  loadingMessage,
  config,
  SimulationComponent,
}: TopicPageLayoutProps<SimState, E, A>) {
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [mounted, setMounted] = useState(false);
  const [stripOpen, setStripOpen] = useState(false);
  const { user } = useAuth();
  const sessionStartTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    setSessionId(getTopicSessionId(topicSlug));
    setMounted(true);
    sessionStartTimeRef.current = Date.now();
  }, [topicSlug]);

  // Track session end on unmount
  useEffect(() => {
    return () => {
      // Only send session end for authenticated students
      if (!user?.id) return;

      const durationMinutes = Math.round((Date.now() - sessionStartTimeRef.current) / 60000);

      // Only track sessions longer than 1 minute
      if (durationMinutes < 1) return;

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8123";

      // Use sendBeacon for reliable delivery on page unload
      const supabase = createSupabaseBrowser();
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.access_token) return;

        const payload = JSON.stringify({
          topic: title,
          duration_minutes: durationMinutes,
          session_summary: `Completed ${title} session`
        });

        // Try fetch first (works during normal navigation)
        fetch(`${backendUrl}/api/sessions/${user.id}/end`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: payload,
          keepalive: true
        }).catch(() => {
          // Fallback to sendBeacon if fetch fails
          const blob = new Blob([payload], { type: 'application/json' });
          navigator.sendBeacon(`${backendUrl}/api/sessions/${user.id}/end`, blob);
        });
      });
    };
  }, [user?.id, topicSlug, title]);

  // Close strip on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setStripOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Wait for client-side mount before rendering CopilotKit
  // (threadId must be stable before first render)
  if (!mounted) {
    return <LoadingScreen message={loadingMessage} />;
  }

  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      agent={`chat-${topicSlug}`}
      {...(sessionId ? { threadId: sessionId } : {})}
    >
      <ConnectionStatus runtimeUrl="/api/copilotkit" />
      <main className="h-screen overflow-hidden flex flex-row bg-ink/[0.06]">
        {/* ── Left strip: collapsed = back · title · reset │ expanded = topic cards ── */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0, width: stripOpen ? 280 : 48 }}
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
          className="relative flex flex-col shrink-0 z-20 overflow-hidden"
        >
          {/* Collapsed strip */}
          <div
            className={`flex flex-col items-center justify-between py-5 px-3 h-full transition-opacity duration-200 ${
              stripOpen ? "opacity-0 pointer-events-none absolute inset-0" : "opacity-100"
            }`}
          >
            <Link
              href="/"
              className="text-sm font-body text-ink/40 hover:text-ink/70 transition-colors"
              title="Back to topics"
            >
              ←
            </Link>

            <button
              onClick={() => setStripOpen(true)}
              className="font-display text-xs font-bold text-ink/30 hover:text-ink/60 tracking-widest uppercase
                [writing-mode:vertical-lr] rotate-180 select-none cursor-pointer transition-colors"
              title="Browse all topics"
            >
              {title}
            </button>

            <button
              onClick={() => {
                clearTopicSession(topicSlug);
                window.location.reload();
              }}
              className="text-sm font-body text-ink/30 hover:text-ink/60 transition-colors"
              title="Start fresh"
            >
              ↻
            </button>
          </div>

          {/* Expanded strip — vertical topic cards */}
          <AnimatePresence>
            {stripOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 flex flex-col h-full"
              >
                {/* Header row */}
                <div className="flex items-center justify-between px-3 pt-4 pb-2 shrink-0">
                  <Link
                    href="/"
                    className="text-xs font-body text-ink/40 hover:text-ink/70 transition-colors"
                    title="Back to home"
                  >
                    ← Home
                  </Link>
                  <button
                    onClick={() => setStripOpen(false)}
                    className="text-sm font-body text-ink/40 hover:text-ink/70 transition-colors"
                    title="Close panel"
                  >
                    ✕
                  </button>
                </div>

                {/* Section label */}
                <div className="flex items-center gap-2 px-3 mb-3">
                  <div className="w-2 h-2 bg-playful-peach border-[2px] border-ink rounded-sm rotate-45" />
                  <span className="font-display text-xs font-bold">Topics</span>
                  <div className="flex-1 h-[2px] bg-ink/10 rounded-full" />
                </div>

                {/* Cards scroll area */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4 space-y-3 scrollbar-none">
                  {TOPICS.map((topic, i) => (
                    <MiniTopicCard
                      key={topic.id}
                      topic={topic}
                      isCurrent={topic.id === topicSlug}
                      index={i}
                    />
                  ))}

                  {/* Coming soon placeholder */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: TOPICS.length * 0.05 + 0.15 }}
                    className="border-[3px] border-dashed border-ink/20 rounded-xl px-3 py-4 text-center"
                  >
                    <p className="font-display text-[11px] font-bold text-ink/30">
                      More coming soon
                    </p>
                    <p className="font-body text-[9px] text-ink/20 mt-0.5">
                      Volcanoes, weather…
                    </p>
                  </motion.div>
                </div>

                {/* Reset at bottom */}
                <div className="shrink-0 border-t-[2px] border-ink/10 px-3 py-3">
                  <button
                    onClick={() => {
                      clearTopicSession(topicSlug);
                      window.location.reload();
                    }}
                    className="w-full text-xs font-body text-ink/40 hover:text-ink/70 transition-colors text-center"
                  >
                    ↻ Reset session
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Click-away overlay when strip is open */}
        <AnimatePresence>
          {stripOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-10"
              onClick={() => setStripOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* TopicRunner — manages simulation + companion + chat */}
        <div className="flex-1 min-w-0 h-full">
          <TopicRunner
            config={config}
            SimulationComponent={SimulationComponent}
            stripOpen={stripOpen}
          />
        </div>
      </main>
    </CopilotKit>
  );
}

// ── Main export (wraps with ErrorBoundary + Suspense) ───

export function TopicPageLayout<
  SimState extends Record<string, unknown>,
  E extends string = never,
  A extends string = never,
>(props: TopicPageLayoutProps<SimState, E, A>) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingScreen message="Loading simulation…" />}>
        <TopicPageContent {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}
