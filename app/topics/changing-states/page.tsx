"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CopilotKit } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";
import { TopicRunner } from "@/framework/TopicRunner";
import { ChangingStatesSimulation } from "@/components/simulations/ChangingStatesSimulation";
import { changingStatesConfig } from "@/lib/topics/changing-states/config";
import { getTopicSessionId, clearTopicSession } from "@/lib/session";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { ConnectionStatus } from "@/components/ui/ConnectionStatus";

function ChangingStatesContent() {
  // Generate or restore session ID for progress persistence
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setSessionId(getTopicSessionId("changing-states"));
    setMounted(true);
  }, []);

  // Wait for client-side mount before rendering CopilotKit
  // (threadId must be stable before first render)
  if (!mounted) {
    return <LoadingScreen message="Setting up the science lab…" />;
  }

  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      agent="chat-changing-states"
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
            Changing States
          </h1>

          <button
            onClick={() => {
              clearTopicSession("changing-states");
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
            config={changingStatesConfig}
            SimulationComponent={ChangingStatesSimulation}
          />
        </div>
      </main>
    </CopilotKit>
  );
}

export default function ChangingStatesPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingScreen message="Loading simulation…" />}>
        <ChangingStatesContent />
      </Suspense>
    </ErrorBoundary>
  );
}
