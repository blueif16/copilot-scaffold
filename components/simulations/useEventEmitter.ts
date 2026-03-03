// ═══════════════════════════════════════════════════════════
// useEventEmitter — Event classification for simulation
// Implements debounced event detection from §3.2
// ═══════════════════════════════════════════════════════════

import { useCallback, useRef, useEffect } from "react";
import type { SimulationEvent } from "@/lib/types";
import {
  type Phase,
  CHANGING_STATES_EVENTS as EVT,
  DWELL_THRESHOLD_S,
  IDLE_THRESHOLD_S,
  RAPID_CYCLING_WINDOW_MS,
  RAPID_CYCLING_MIN_TRANSITIONS,
} from "@/lib/types/changing-states";

interface EventEmitterOptions {
  onEvent: (event: Omit<SimulationEvent, "timestamp">) => void;
}

interface TransitionRecord {
  from: Phase;
  to: Phase;
  timestamp: number;
}

export function useEventEmitter({ onEvent }: EventEmitterOptions) {
  // ── Tracking refs ───────────────────────────────────────
  const hasInteracted = useRef(false);
  const phasesVisited = useRef<Set<Phase>>(new Set());
  const lastPhase = useRef<Phase | null>(null);
  const lastDirection = useRef<"heating" | "cooling" | null>(null);
  const dwellTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recentTransitions = useRef<TransitionRecord[]>([]);
  const milestoneEmitted = useRef(false);

  // ── Reset idle timer on any interaction ─────────────────
  const resetIdleTimer = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      onEvent({
        type: EVT.IDLE_TIMEOUT,
        data: { seconds: IDLE_THRESHOLD_S },
      });
    }, IDLE_THRESHOLD_S * 1000);
  }, [onEvent]);

  // ── Start dwell timer for current phase ─────────────────
  const startDwellTimer = useCallback(
    (phase: Phase) => {
      if (dwellTimer.current) clearTimeout(dwellTimer.current);
      dwellTimer.current = setTimeout(() => {
        onEvent({
          type: EVT.DWELL_TIMEOUT,
          data: { phase, seconds: DWELL_THRESHOLD_S },
        });
      }, DWELL_THRESHOLD_S * 1000);
    },
    [onEvent],
  );

  // ── Check for rapid cycling ─────────────────────────────
  const checkRapidCycling = useCallback(() => {
    const now = Date.now();
    recentTransitions.current = recentTransitions.current.filter(
      (t) => now - t.timestamp < RAPID_CYCLING_WINDOW_MS,
    );
    if (recentTransitions.current.length >= RAPID_CYCLING_MIN_TRANSITIONS) {
      onEvent({
        type: EVT.RAPID_CYCLING,
        data: { transitionsInWindow: recentTransitions.current.length },
      });
    }
  }, [onEvent]);

  // ── Handle first interaction ────────────────────────────
  const handleFirstInteraction = useCallback(() => {
    if (!hasInteracted.current) {
      hasInteracted.current = true;
      onEvent({ type: EVT.FIRST_INTERACTION, data: {} });
    }
    resetIdleTimer();
  }, [onEvent, resetIdleTimer]);

  // ── Handle phase change ─────────────────────────────────
  const handlePhaseChange = useCallback(
    (newPhase: Phase) => {
      const prevPhase = lastPhase.current;
      if (prevPhase === newPhase || prevPhase === null) {
        lastPhase.current = newPhase;
        phasesVisited.current.add(newPhase);
        startDwellTimer(newPhase);
        return;
      }

      onEvent({
        type: EVT.PHASE_CHANGE,
        data: { from: prevPhase, to: newPhase },
      });

      recentTransitions.current.push({
        from: prevPhase,
        to: newPhase,
        timestamp: Date.now(),
      });
      checkRapidCycling();

      const newDirection: "heating" | "cooling" =
        phaseOrder(newPhase) > phaseOrder(prevPhase) ? "heating" : "cooling";

      if (
        lastDirection.current !== null &&
        lastDirection.current !== newDirection
      ) {
        onEvent({
          type: EVT.REVERSAL,
          data: { previousDirection: lastDirection.current },
        });
      }
      lastDirection.current = newDirection;

      phasesVisited.current.add(newPhase);

      if (
        !milestoneEmitted.current &&
        phasesVisited.current.has("solid") &&
        phasesVisited.current.has("liquid") &&
        phasesVisited.current.has("gas")
      ) {
        milestoneEmitted.current = true;
        onEvent({
          type: EVT.MILESTONE,
          data: { all_phases_visited: true },
        });
      }

      lastPhase.current = newPhase;
      startDwellTimer(newPhase);
      resetIdleTimer();
    },
    [onEvent, startDwellTimer, resetIdleTimer, checkRapidCycling],
  );

  // ── Handle slider activity (resets timers) ──────────────
  const handleSliderActivity = useCallback(() => {
    handleFirstInteraction();
    if (dwellTimer.current) clearTimeout(dwellTimer.current);
  }, [handleFirstInteraction]);

  // ── Handle slider release (restart dwell timer) ─────────
  const handleSliderRelease = useCallback(
    (currentPhase: Phase) => {
      startDwellTimer(currentPhase);
    },
    [startDwellTimer],
  );

  // ── Handle spotlight tap ────────────────────────────────
  const handleSpotlightTap = useCallback(() => {
    onEvent({ type: EVT.SPOTLIGHT_TAP, data: {} });
  }, [onEvent]);

  // ── Cleanup timers ──────────────────────────────────────
  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (dwellTimer.current) clearTimeout(dwellTimer.current);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [resetIdleTimer]);

  return {
    handlePhaseChange,
    handleSliderActivity,
    handleSliderRelease,
    handleFirstInteraction,
    handleSpotlightTap,
  };
}

function phaseOrder(phase: Phase): number {
  return phase === "solid" ? 0 : phase === "liquid" ? 1 : 2;
}
