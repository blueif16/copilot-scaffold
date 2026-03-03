"use client";

import { createContext, useContext, useCallback, useMemo } from "react";

// ── Sound Manager Interface ─────────────────────────────

export interface SoundManagerContextType {
  play: (key: string) => void;
  setAmbient: (key: string, volume: number) => void;
  stopAll: () => void;
}

const SoundManagerContext = createContext<SoundManagerContextType | null>(null);

// ── Hook ────────────────────────────────────────────────

export function useSoundManager(): SoundManagerContextType {
  const ctx = useContext(SoundManagerContext);
  if (!ctx) {
    // Return no-op fallback if outside provider
    return { play: () => {}, setAmbient: () => {}, stopAll: () => {} };
  }
  return ctx;
}

// ── Provider (stub — no audio files yet) ────────────────

interface SoundManagerProviderProps {
  children: React.ReactNode;
}

export function SoundManagerProvider({ children }: SoundManagerProviderProps) {
  const play = useCallback((key: string) => {
    // Stub: will connect to Web Audio API / Howler.js later
    if (process.env.NODE_ENV === "development") {
      console.debug("[Sound] play:", key);
    }
  }, []);

  const setAmbient = useCallback((key: string, volume: number) => {
    if (process.env.NODE_ENV === "development") {
      console.debug("[Sound] ambient:", key, "vol:", volume);
    }
  }, []);

  const stopAll = useCallback(() => {
    if (process.env.NODE_ENV === "development") {
      console.debug("[Sound] stopAll");
    }
  }, []);

  const value = useMemo(
    () => ({ play, setAmbient, stopAll }),
    [play, setAmbient, stopAll],
  );

  return (
    <SoundManagerContext.Provider value={value}>
      {children}
    </SoundManagerContext.Provider>
  );
}
