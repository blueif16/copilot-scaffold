"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CopilotKit } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";
import { TopicRunner } from "@/framework/TopicRunner";
import { GeneticsBasicsSimulation } from "@/components/simulations/GeneticsBasicsSimulation";
import { geneticsBasicsConfig } from "@/lib/config/topics/genetics-basics";
import { getTopicSessionId, clearTopicSession } from "@/lib/session";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { ConnectionStatus } from "@/components/ui/ConnectionStatus";

function GeneticsBasicsContent() {
  // Generate or restore session ID for progress persistence
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setSessionId(getTopicSessionId("genetics-basics"));
    setMounted(true);
  }, []);

  // Wait for client-side mount before rendering CopilotKit
  // (threadId must be stable before first render)
  if (!mounted) {
    return <LoadingScreen message="Setting up the genetics lab…" />;
  }

  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      agent="chat-genetics-basics"
      {...(sessionId ? { threadId: sessionId } : {})}
    >
      <ConnectionStatus runtimeUrl="/api/copilotkit" />
      <main className="h-screen flex flex-col">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between px-4 sm:px-6 pt-4 pb-2 relative z-10"
        >
          <Link
            href="/"
            className="text-sm font-body text-ink/50 hover:text-ink/80 transition-colors
              flex items-center gap-1"
          >
            <span>←</span>
            <span className="hidden sm:inline">Back</span>
          </Link>
          <h1 className="font-display text-lg font-bold">Genetics Basics</h1>
          <button
            onClick={() => {
              clearTopicSession("genetics-basics");
              window.location.reload();
            }}
            className="text-xs font-body text-ink/30 hover:text-ink/60 transition-colors"
            title="Start fresh"
          >
            ↻ Reset
          </button>
        </motion.div>

        {/* TopicRunner — manages simulation + companion + chat */}
        <TopicRunner
          config={geneticsBasicsConfig}
          SimulationComponent={GeneticsBasicsSimulation}
        />
      </main>
    </CopilotKit>
  );
}

export default function GeneticsBasicsPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingScreen message="Loading simulation…" />}>
        <GeneticsBasicsContent />
      </Suspense>
    </ErrorBoundary>
  );
}
