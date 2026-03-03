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
  // Guard: validate container dimensions before initialization
  if (!isFinite(cw) || !isFinite(ch) || cw <= 0 || ch <= 0) {
    // Return empty array rather than particles with NaN positions
    return [];
  }

  const cols = 7;
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const grid = solidGridPosition(i, cols, cw, ch);

    // Guard: validate grid position
    if (!isFinite(grid.x) || !isFinite(grid.y)) {
      // Fallback to center position
      return {
        id: i,
        x: cw / 2,
        y: ch / 2,
        vx: 0,
        vy: 0,
        radius: Math.min(cw, ch) * 0.025 + Math.random() * 2,
      };
    }

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

  // Guard: validate container dimensions
  if (!isFinite(cw) || !isFinite(ch) || cw <= 0 || ch <= 0) {
    return particles; // Return unchanged particles
  }

  // Guard: validate particles array
  if (!particles || particles.length === 0) {
    return initParticles(cw, ch);
  }

  // Guard: validate particle count
  if (particles.length !== PARTICLE_COUNT) {
    return initParticles(cw, ch);
  }

  // Guard: validate dt
  if (!isFinite(dt) || dt <= 0) {
    return particles; // Return unchanged particles
  }

  return particles.map((p, i) => {
    let { x, y, vx, vy } = p;

    // Guard: validate particle values before processing
    if (!isFinite(x) || !isFinite(y) || !isFinite(vx) || !isFinite(vy)) {
      // Reset to grid position for solid, or center for other phases
      const grid = solidGridPosition(i, cols, cw, ch);
      x = grid.x;
      y = grid.y;
      vx = 0;
      vy = 0;
    }

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

    // Guard: final validation before returning
    if (!isFinite(x) || !isFinite(y) || !isFinite(vx) || !isFinite(vy)) {
      // Emergency fallback: reset to center
      const grid = solidGridPosition(i, cols, cw, ch);
      return { ...p, x: grid.x, y: grid.y, vx: 0, vy: 0 };
    }

    // Guard: ensure particle stays within valid bounds
    x = Math.max(pad, Math.min(cw - pad, x));
    y = Math.max(pad, Math.min(ch - pad, y));

    return { ...p, x, y, vx, vy };
  });
}

// ═══════════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════════

export function useParticlePhysics(config: PhysicsConfig) {
  const validWidth = config.containerWidth > 0 ? config.containerWidth : 300;
  const validHeight = config.containerHeight > 0 ? config.containerHeight : 400;

  const [particles, setParticles] = useState<Particle[]>(() =>
    initParticles(validWidth, validHeight),
  );
  const particlesRef = useRef(particles);
  const configRef = useRef(config);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const initializedForSize = useRef({ w: validWidth, h: validHeight });

  // Keep config ref up to date
  configRef.current = config;

  // Re-initialize when container size first becomes valid or changes significantly
  useEffect(() => {
    const { containerWidth: w, containerHeight: h } = config;
    const validW = w > 0 ? w : 300;
    const validH = h > 0 ? h : 400;

    const prev = initializedForSize.current;
    const deltaW = Math.abs(prev.w - validW);
    const deltaH = Math.abs(prev.h - validH);

    if (deltaW > 50 || deltaH > 50) {
      // Guard: validate dimensions before reinitializing
      if (!isFinite(validW) || !isFinite(validH) || validW <= 0 || validH <= 0) {
        return;
      }

      initializedForSize.current = { w: validW, h: validH };
      const fresh = initParticles(validW, validH);

      // Guard: ensure initialization succeeded
      if (fresh.length !== PARTICLE_COUNT) {
        return;
      }

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

    // Guard: validate particles before stepping
    if (!particlesRef.current || particlesRef.current.length === 0) {
      const { containerWidth: w, containerHeight: h } = configRef.current;
      const validW = w > 0 ? w : 300;
      const validH = h > 0 ? h : 400;
      const recovered = initParticles(validW, validH);
      if (recovered.length === PARTICLE_COUNT) {
        particlesRef.current = recovered;
        setParticles(recovered);
      }
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    // Guard: validate particle count
    if (particlesRef.current.length !== PARTICLE_COUNT) {
      const { containerWidth: w, containerHeight: h } = configRef.current;
      const validW = w > 0 ? w : 300;
      const validH = h > 0 ? h : 400;
      const recovered = initParticles(validW, validH);
      if (recovered.length === PARTICLE_COUNT) {
        particlesRef.current = recovered;
        setParticles(recovered);
      }
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    const updated = stepParticles(
      particlesRef.current,
      configRef.current,
      dt,
    );

    // Guard: validate updated particles array
    if (!updated || updated.length !== PARTICLE_COUNT) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

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
