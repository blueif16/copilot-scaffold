"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CopilotKit } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";
import { TopicRunner } from "@/framework/TopicRunner";
import { ElectricCircuitsSimulation } from "@/components/simulations/ElectricCircuitsSimulation";
import { electricCircuitsConfig } from "@/lib/config/topics/electric-circuits";
import { getTopicSessionId, clearTopicSession } from "@/lib/session";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { ConnectionStatus } from "@/components/ui/ConnectionStatus";

function ElectricCircuitsContent() {
  // Generate or restore session ID for progress persistence
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setSessionId(getTopicSessionId("electric-circuits"));
    setMounted(true);
  }, []);

  // Wait for client-side mount before rendering CopilotKit
  // (threadId must be stable before first render)
  if (!mounted) {
    return <LoadingScreen message="Setting up the circuit lab…" />;
  }

  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      agent="chat-electric-circuits"
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
          <h1 className="font-display text-lg font-bold">Electric Circuits</h1>
          <button
            onClick={() => {
              clearTopicSession("electric-circuits");
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
          config={electricCircuitsConfig}
          SimulationComponent={ElectricCircuitsSimulation}
        />
      </main>
    </CopilotKit>
  );
}

export default function ElectricCircuitsPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingScreen message="Loading simulation…" />}>
        <ElectricCircuitsContent />
      </Suspense>
    </ErrorBoundary>
  );
}
