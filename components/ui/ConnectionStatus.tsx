"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ConnectionStatusProps {
  runtimeUrl: string;
}

/**
 * Shows a non-intrusive banner if the CopilotKit backend is unreachable.
 * Auto-hides when connection is restored.
 */
export function ConnectionStatus({ runtimeUrl }: ConnectionStatusProps) {
  const [status, setStatus] = useState<"checking" | "ok" | "error">("checking");

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        // Quick health check — the copilotkit endpoint returns 405 on GET
        // but that still means the server is reachable
        const res = await fetch(runtimeUrl, {
          method: "GET",
          signal: AbortSignal.timeout(3000),
        });
        // Any response (even 405) means server is up
        if (!cancelled) setStatus("ok");
      } catch {
        if (!cancelled) setStatus("error");
      }
    };

    // Check after a short delay to avoid flash on fast connections
    const timer = setTimeout(check, 1000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [runtimeUrl]);

  return (
    <AnimatePresence>
      {status === "error" && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-2 left-1/2 -translate-x-1/2 z-50 px-4 py-2 
            bg-playful-peach border-2 border-ink rounded-xl shadow-chunky-sm
            font-body text-xs text-ink/80"
        >
          ⚠ AI companion offline — simulation works, but companion reactions need the backend.
          <span className="ml-2 text-ink/40">Run: cd agent && langgraph dev</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
