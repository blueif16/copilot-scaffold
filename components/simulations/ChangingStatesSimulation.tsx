// ═══════════════════════════════════════════════════════════
// ChangingStatesSimulation — Interactive particle simulation
// Pure visual component — no AI logic, no companion awareness
// ═══════════════════════════════════════════════════════════

"use client";

import { useCallback, useRef, useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SimulationProps } from "@/lib/types";
import {
  type ChangingStatesSimState,
  type Phase,
  PHASE_BOUNDARIES,
} from "@/lib/types/changing-states";
import { useParticlePhysics } from "./useParticlePhysics";
import { useEventEmitter } from "./useEventEmitter";

// ── Phase from temperature ──────────────────────────────

function phaseFromTemp(temp: number): Phase {
  if (temp <= PHASE_BOUNDARIES.solidToLiquid) return "solid";
  if (temp <= PHASE_BOUNDARIES.liquidToGas) return "liquid";
  return "gas";
}

// ── Color interpolation ─────────────────────────────────

function lerpColor(a: number[], b: number[], t: number): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

const COLOR_COLD = [200, 225, 245]; // icy blue
const COLOR_NEUTRAL = [250, 247, 242]; // paper/warm white
const COLOR_HOT = [255, 210, 180]; // warm peach

function bgColorFromTemp(temp: number): string {
  if (temp <= 50) {
    return lerpColor(COLOR_COLD, COLOR_NEUTRAL, temp / 50);
  }
  return lerpColor(COLOR_NEUTRAL, COLOR_HOT, (temp - 50) / 50);
}

function particleColorFromTemp(temp: number): string {
  if (temp <= 33) {
    // Icy blue to mid blue
    return lerpColor([126, 200, 227], [100, 170, 220], temp / 33);
  }
  if (temp <= 67) {
    // Mid blue to warm orange
    return lerpColor([100, 170, 220], [255, 176, 136], (temp - 33) / 34);
  }
  // Warm orange to hot red-orange
  return lerpColor([255, 176, 136], [255, 130, 90], (temp - 67) / 33);
}

// ── Phase labels ────────────────────────────────────────

const PHASE_LABELS: Record<Phase, { label: string; emoji: string }> = {
  solid: { label: "SOLID", emoji: "🧊" },
  liquid: { label: "LIQUID", emoji: "💧" },
  gas: { label: "GAS", emoji: "♨️" },
};

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export function ChangingStatesSimulation({
  state,
  onStateChange,
  onEvent,
}: SimulationProps<ChangingStatesSimState>) {
  const { temperature, phase } = state;
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 300, h: 400 });

  // ── Measure container ─────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      // console.log('[wt-fix/slider-particle-disappear] Container measured:', {
      //   width: rect.width,
      //   height: rect.height,
      //   prevWidth: containerSize.w,
      //   prevHeight: containerSize.h,
      // });
      setContainerSize({ w: rect.width, h: rect.height });
    };
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Particle physics ──────────────────────────────────
  const particles = useParticlePhysics({
    temperature,
    phase,
    containerWidth: containerSize.w,
    containerHeight: containerSize.h,
  });

  // ── Event emitter ─────────────────────────────────────
  const {
    handlePhaseChange,
    handleSliderActivity,
    handleSliderRelease,
  } = useEventEmitter({ onEvent });

  // ── Initialize event emitter with starting phase ─────
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      // Defer to next tick to avoid setState during render
      setTimeout(() => {
        handlePhaseChange(phase);
      }, 0);
    }
  }, [phase, handlePhaseChange]);

  // ── Temperature → phase + state sync ──────────────────
  const handleTemperatureChange = useCallback(
    (newTemp: number) => {
      const newPhase = phaseFromTemp(newTemp);
      const newSpeed = newTemp / 100;

      // console.log('[wt-fix/slider-particle-disappear] Temperature change:', {
      //   newTemp,
      //   newPhase,
      //   newSpeed,
      //   prevPhase: phase,
      //   phaseChanged: newPhase !== phase,
      //   sliderActive: state.sliderActive,
      // });

      onStateChange({
        temperature: newTemp,
        phase: newPhase,
        particleSpeed: newSpeed,
      });

      // Clear dwell timer BEFORE phase change to prevent race condition
      // where phase change starts a timer that should be cleared
      handleSliderActivity();
      handlePhaseChange(newPhase);
    },
    [onStateChange, handlePhaseChange, handleSliderActivity, phase, state.sliderActive],
  );

  const handleSliderDown = useCallback(() => {
    // console.log('[wt-fix/slider-particle-disappear] Slider DOWN:', {
    //   currentPhase: phase,
    //   currentTemp: temperature,
    //   particleCount: particles.length,
    // });
    onStateChange({ sliderActive: true });
    handleSliderActivity();
  }, [onStateChange, handleSliderActivity, phase, temperature, particles.length]);

  const handleSliderUp = useCallback(() => {
    // console.log('[wt-fix/slider-particle-disappear] Slider UP/CANCEL:', {
    //   currentPhase: phase,
    //   currentTemp: temperature,
    //   particleCount: particles.length,
    //   sliderWasActive: state.sliderActive,
    // });
    onStateChange({ sliderActive: false });
    handleSliderRelease(phase);
  }, [onStateChange, handleSliderRelease, phase, temperature, particles.length, state.sliderActive]);

  // ── Derived visuals ───────────────────────────────────
  const bgColor = useMemo(() => bgColorFromTemp(temperature), [temperature]);
  const pColor = useMemo(() => particleColorFromTemp(temperature), [temperature]);
  const phaseInfo = PHASE_LABELS[phase] ?? PHASE_LABELS.solid;

  // Compute particle opacity: solid = more opaque, gas = more transparent
  const particleOpacity = phase === "solid" ? 0.85 : phase === "liquid" ? 0.7 : 0.55;

  // Slider gradient position
  const sliderPercent = temperature;

  return (
    <div className="flex flex-col items-center w-full h-full select-none">
      {/* ── Phase Label ──────────────────────────────── */}
      <div className="relative h-14 flex items-center justify-center mb-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex items-center gap-2"
          >
            <span className="text-2xl">{phaseInfo.emoji}</span>
            <span className="font-display text-2xl sm:text-3xl font-bold tracking-wide text-ink/80">
              {phaseInfo.label}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Beaker Container ─────────────────────────── */}
      <div
        className="relative flex-1 w-full max-w-md mx-auto"
        style={{ maxHeight: "60vh" }}
      >
        <motion.div
          ref={containerRef}
          className="relative w-full h-full border-4 border-ink rounded-t-2xl rounded-b-[3rem] shadow-chunky overflow-hidden"
          animate={{ backgroundColor: bgColor }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          {/* Beaker inner glow / glass effect */}
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute inset-x-0 top-0 h-8 opacity-20"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(255,255,255,0.6), transparent)",
              }}
            />
            {/* Beaker measurement lines */}
            {[0.25, 0.5, 0.75].map((y) => (
              <div
                key={y}
                className="absolute left-2 h-px bg-ink/10"
                style={{
                  top: `${y * 100}%`,
                  width: "12px",
                }}
              />
            ))}
          </div>

          {/* ── Particles ────────────────────────────── */}
          {particles.map((p) => {
            const left = p.x - p.radius;
            const top = p.y - p.radius;
            // Guard against NaN values
            if (!isFinite(left) || !isFinite(top)) {
              // console.error('[wt-fix/slider-particle-disappear] NaN particle position in render:', {
              //   particleId: p.id,
              //   x: p.x,
              //   y: p.y,
              //   vx: p.vx,
              //   vy: p.vy,
              //   radius: p.radius,
              //   left,
              //   top,
              // });
              return null;
            }

            return (
              <div
                key={p.id}
                className="absolute rounded-full"
                style={{
                  width: p.radius * 2,
                  height: p.radius * 2,
                  left,
                  top,
                  backgroundColor: pColor,
                  opacity: particleOpacity,
                  mixBlendMode: "multiply",
                  willChange: "left, top",
                  transition: "background-color 0.6s ease",
                }}
              />
            );
          })}

          {/* Phase transition flash effect */}
          <AnimatePresence>
            {state.sliderActive && (
              <motion.div
                key={`flash-${phase}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 pointer-events-none"
              />
            )}
          </AnimatePresence>

          {/* ── Gas steam wisps ───────────────────────── */}
          {phase === "gas" && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={`wisp-${i}`}
                  className="absolute rounded-full opacity-20"
                  style={{
                    width: 40 + i * 20,
                    height: 40 + i * 20,
                    backgroundColor: "rgba(255,255,255,0.4)",
                    left: `${20 + i * 25}%`,
                    filter: "blur(8px)",
                  }}
                  animate={{
                    y: [-20, -containerSize.h * 0.3],
                    opacity: [0.25, 0],
                    scale: [1, 1.8],
                  }}
                  transition={{
                    duration: 3 + i * 0.5,
                    repeat: Infinity,
                    delay: i * 1.2,
                    ease: "easeOut",
                  }}
                />
              ))}
            </div>
          )}

          {/* ── Solid ice cracks overlay ──────────────── */}
          {phase === "solid" && temperature < 15 && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.15 }}
              exit={{ opacity: 0 }}
            >
              <svg
                viewBox="0 0 200 200"
                className="w-full h-full"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M60 20 L80 60 L50 90 M80 60 L120 80 M40 140 L70 120 L100 150 L130 130"
                  stroke="white"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                  opacity="0.5"
                />
              </svg>
            </motion.div>
          )}

          {/* ── Liquid surface wobble ─────────────────── */}
          {phase === "liquid" && (
            <motion.div
              className="absolute inset-x-0 pointer-events-none"
              style={{ top: "22%" }}
              animate={{ y: [0, 3, 0, -2, 0] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <svg
                viewBox="0 0 400 20"
                className="w-full"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
              >
                <path
                  d="M0 10 Q50 4 100 10 Q150 16 200 10 Q250 4 300 10 Q350 16 400 10"
                  stroke={pColor}
                  strokeWidth="2"
                  fill="none"
                  opacity="0.3"
                />
              </svg>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* ── Temperature Slider ───────────────────────── */}
      <div className="w-full max-w-md mx-auto mt-5 px-2">
        {/* Temperature readout */}
        <div className="flex justify-between items-center mb-2 px-1">
          <span className="text-sm font-body text-ink/50">❄️ Cold</span>
          <span className="font-display text-lg font-bold tabular-nums text-ink/70">
            {Math.round(temperature)}°
          </span>
          <span className="text-sm font-body text-ink/50">Hot 🔥</span>
        </div>

        {/* Slider track */}
        <div className="relative h-14 flex items-center">
          <div className="absolute inset-x-0 h-5 rounded-full border-4 border-ink overflow-hidden">
            {/* Gradient fill */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to right, #7EC8E3, #FAF7F2 40%, #FFB088 70%, #FF8C5A)",
              }}
            />
            {/* Progress indicator */}
            <div
              className="absolute inset-y-0 left-0 bg-white/20"
              style={{ width: `${sliderPercent}%` }}
            />
          </div>

          {/* Invisible range input (full hit target) */}
          <input
            type="range"
            min={0}
            max={100}
            step={0.5}
            value={temperature ?? 0}
            onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
            onPointerDown={handleSliderDown}
            onPointerUp={handleSliderUp}
            onPointerCancel={handleSliderUp}
            className="absolute inset-x-0 w-full h-14 opacity-0 cursor-pointer z-20"
            style={{ touchAction: "none" }}
            aria-label="Temperature control"
          />

          {/* Custom thumb */}
          <div
            className="absolute z-10 pointer-events-none"
            style={{
              left: `calc(${sliderPercent}% - 24px)`,
              top: "50%",
              transform: "translateY(-50%)",
            }}
          >
            <motion.div
              className="w-12 h-12 rounded-full border-4 border-ink bg-white shadow-chunky-sm flex items-center justify-center"
              whileTap={{ scale: 0.9 }}
              animate={{
                boxShadow: state.sliderActive
                  ? "2px 2px 0px 0px #1A1A1A"
                  : "3px 3px 0px 0px #1A1A1A",
              }}
            >
              <span className="text-lg">
                {temperature < 33 ? "❄️" : temperature < 67 ? "💧" : "🔥"}
              </span>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ── Temperature bar markers ──────────────────── */}
      <div className="w-full max-w-md mx-auto px-2 mt-1 relative h-4">
        <div
          className="absolute text-[10px] font-body text-ink/30 -translate-x-1/2"
          style={{ left: "33%" }}
        >
          melting
        </div>
        <div
          className="absolute text-[10px] font-body text-ink/30 -translate-x-1/2"
          style={{ left: "67%" }}
        >
          boiling
        </div>
      </div>
    </div>
  );
}
