// ═══════════════════════════════════════════════════════════
// useParticlePhysics — 60fps particle simulation per phase
// ═══════════════════════════════════════════════════════════

import { useRef, useState, useCallback, useEffect } from "react";
import type { Phase } from "@/lib/types/changing-states";

export const PARTICLE_COUNT = 42; // 6x7 grid for solid phase

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface PhysicsConfig {
  temperature: number;
  phase: Phase;
  containerWidth: number;
  containerHeight: number;
}

// ── Grid layout for solid phase ─────────────────────────

function solidGridPosition(
  index: number,
  cols: number,
  cw: number,
  ch: number,
): { x: number; y: number } {
  const row = Math.floor(index / cols);
  const col = index % cols;
  const spacing = Math.min(cw, ch) * 0.1;
  const gridW = (cols - 1) * spacing;
  const gridH = (Math.ceil(PARTICLE_COUNT / cols) - 1) * spacing;
  const offsetX = (cw - gridW) / 2;
  const offsetY = (ch - gridH) / 2 + ch * 0.05; // slightly below center
  return {
    x: offsetX + col * spacing,
    y: offsetY + row * spacing,
  };
}

// ── Initialize particles ────────────────────────────────

function initParticles(cw: number, ch: number): Particle[] {
  const cols = 7;
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const grid = solidGridPosition(i, cols, cw, ch);
    return {
      id: i,
      x: grid.x,
      y: grid.y,
      vx: 0,
      vy: 0,
      radius: Math.min(cw, ch) * 0.025 + Math.random() * 2,
    };
  });
}

// ── Physics step ────────────────────────────────────────

function stepParticles(
  particles: Particle[],
  config: PhysicsConfig,
  dt: number,
): Particle[] {
  const { temperature, phase, containerWidth: cw, containerHeight: ch } = config;
  const cols = 7;
  const pad = 12; // wall padding

  return particles.map((p, i) => {
    let { x, y, vx, vy } = p;

    if (phase === "solid") {
      // ── Solid: vibrate around grid position ──────────
      const grid = solidGridPosition(i, cols, cw, ch);
      const amp = (temperature / 33) * 2.5; // 0–2.5px vibration
      const freq = 0.3 + Math.random() * 0.2;

      // Spring back to grid + random vibration
      const dx = grid.x - x;
      const dy = grid.y - y;
      vx = dx * 0.15 + (Math.random() - 0.5) * amp * freq;
      vy = dy * 0.15 + (Math.random() - 0.5) * amp * freq;
    } else if (phase === "liquid") {
      // ── Liquid: brownian motion in lower portion ─────
      const normalizedTemp = (temperature - 33) / 33; // 0–1 within liquid range
      const speed = 0.8 + normalizedTemp * 1.5;
      const gravity = 0.08;
      const floorY = ch * 0.95;
      const ceilingY = ch * 0.25; // liquid fills bottom ~70%

      // Random walk
      vx += (Math.random() - 0.5) * speed * 0.6;
      vy += (Math.random() - 0.5) * speed * 0.4 + gravity;

      // Damping
      vx *= 0.92;
      vy *= 0.92;

      // Soft ceiling for liquid region
      if (y < ceilingY) {
        vy += (ceilingY - y) * 0.05;
      }
      // Floor bounce
      if (y > floorY) {
        y = floorY;
        vy = -Math.abs(vy) * 0.3;
      }
    } else {
      // ── Gas: fast particles bouncing everywhere ──────
      const normalizedTemp = (temperature - 67) / 33; // 0–1 within gas range
      const speed = 2.5 + normalizedTemp * 3;

      // Random acceleration
      vx += (Math.random() - 0.5) * speed * 0.5;
      vy += (Math.random() - 0.5) * speed * 0.5;

      // Light damping (gas is more frictionless)
      vx *= 0.97;
      vy *= 0.97;

      // Slight upward bias (steam rises)
      vy -= 0.03;
    }

    // ── Apply velocity ──────────────────────────────────
    x += vx * dt;
    y += vy * dt;

    // ── Wall bouncing (all phases) ──────────────────────
    if (x < pad) {
      x = pad;
      vx = Math.abs(vx) * 0.5;
    }
    if (x > cw - pad) {
      x = cw - pad;
      vx = -Math.abs(vx) * 0.5;
    }
    if (y < pad) {
      y = pad;
      vy = Math.abs(vy) * 0.5;
    }
    if (y > ch - pad) {
      y = ch - pad;
      vy = -Math.abs(vy) * 0.5;
    }

    return { ...p, x, y, vx, vy };
  });
}

// ═══════════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════════

export function useParticlePhysics(config: PhysicsConfig) {
  const [particles, setParticles] = useState<Particle[]>(() =>
    initParticles(config.containerWidth || 300, config.containerHeight || 400),
  );
  const particlesRef = useRef(particles);
  const configRef = useRef(config);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const initializedForSize = useRef({ w: 0, h: 0 });

  // Keep config ref up to date
  configRef.current = config;

  // Re-initialize when container size first becomes valid or changes significantly
  useEffect(() => {
    const { containerWidth: w, containerHeight: h } = config;
    if (w <= 0 || h <= 0) return;

    const prev = initializedForSize.current;
    if (Math.abs(prev.w - w) > 50 || Math.abs(prev.h - h) > 50) {
      initializedForSize.current = { w, h };
      const fresh = initParticles(w, h);
      particlesRef.current = fresh;
      setParticles(fresh);
    }
  }, [config.containerWidth, config.containerHeight]);

  // ── Animation loop ────────────────────────────────────
  const tick = useCallback((time: number) => {
    if (lastTimeRef.current === 0) lastTimeRef.current = time;
    const rawDt = (time - lastTimeRef.current) / 16.67; // normalize to ~60fps
    const dt = Math.min(rawDt, 3); // cap to prevent jumps
    lastTimeRef.current = time;

    const updated = stepParticles(
      particlesRef.current,
      configRef.current,
      dt,
    );
    particlesRef.current = updated;
    setParticles(updated);

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [tick]);

  return particles;
}
