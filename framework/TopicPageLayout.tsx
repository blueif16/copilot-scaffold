"use client";

import { Suspense, useState, useEffect, type ComponentType } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CopilotKit } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";
import { TopicRunner } from "@/framework/TopicRunner";
import { getTopicSessionId, clearTopicSession } from "@/lib/session";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { ConnectionStatus } from "@/components/ui/ConnectionStatus";
import type { TopicConfig, SimulationProps } from "@/lib/types";

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

  useEffect(() => {
    setSessionId(getTopicSessionId(topicSlug));
    setMounted(true);
  }, [topicSlug]);

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
        {/* Left edge strip: back · title · reset */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col items-center justify-between py-5 px-3 sm:px-4 shrink-0 z-10"
        >
          <Link
            href="/"
            className="text-sm font-body text-ink/40 hover:text-ink/70 transition-colors"
            title="Back to topics"
          >
            ←
          </Link>

          <h1
            className="font-display text-xs font-bold text-ink/30 tracking-widest uppercase
              [writing-mode:vertical-lr] rotate-180 select-none"
          >
            {title}
          </h1>

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
        </motion.div>

        {/* TopicRunner — manages simulation + companion + chat */}
        <div className="flex-1 min-w-0 h-full">
          <TopicRunner
            config={config}
            SimulationComponent={SimulationComponent}
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
