"use client";

import { useCoAgent } from "@copilotkit/react-core";
import { useCallback, useRef } from "react";

/** Base state shared by all apps. Extend with your own fields. */
export interface BaseAgentState {
  metadata: Record<string, any>;
}

/**
 * Scaffold hook wrapping useCoAgent with defensive error handling.
 *
 * Usage:
 *   const { state, setState, run, stop, running } = useAgent();
 *   // Or with custom state:
 *   const { state } = useAgent<MyState>({ name: "my-agent" });
 */
export function useAgent<T extends BaseAgentState = BaseAgentState>(
  options?: { name?: string; initialState?: Partial<T> }
) {
  const agentName = options?.name ?? "agent";
  const errorCountRef = useRef(0);

  const coAgent = useCoAgent<T>({
    name: agentName,
    initialState: {
      metadata: {},
      ...options?.initialState,
    } as T,
  });

  // Defensive wrapper: retry once for known CopilotKit stall issues
  const safeRun = useCallback(
    async (...args: Parameters<typeof coAgent.run>) => {
      try {
        errorCountRef.current = 0;
        return await coAgent.run(...args);
      } catch (err: any) {
        errorCountRef.current++;
        if (
          errorCountRef.current <= 1 &&
          err?.message?.includes("reasoning")
        ) {
          console.warn("[useAgent] Retrying after reasoning event stall");
          return await coAgent.run(...args);
        }
        throw err;
      }
    },
    [coAgent.run]
  );

  return {
    ...coAgent,
    run: safeRun,
    agentName,
  };
}
