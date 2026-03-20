"use client";

import { useEffect, useRef, useState } from "react";
import { useAgent as useV2Agent } from "@copilotkitnext/react";

interface ParticleSimProps {
  widgetId?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  // target position for solid state
  tx: number;
  ty: number;
}

type MatterState = "solid" | "liquid" | "gas";

const STATE_CONFIG: Record<MatterState, { label: string; color: string; description: string }> = {
  solid: { label: "Solid", color: "#3b82f6", description: "Particles tightly packed, fixed positions" },
  liquid: { label: "Liquid", color: "#06b6d4", description: "Particles close but flowing freely" },
  gas: { label: "Gas", color: "#f97316", description: "Particles spread out, moving rapidly" },
};

export default function ParticleSim({ widgetId }: ParticleSimProps) {
  const { agent } = useV2Agent({ agentId: "orchestrator" });
  const agentState: MatterState = ((agent.state as any)?.widget_state?.current_state as MatterState) ?? "gas";

  const [localState, setLocalState] = useState<MatterState>(agentState);
  const currentState = agentState !== localState ? agentState : localState;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<MatterState>(currentState);

  // sync agent state changes into local
  useEffect(() => {
    setLocalState(agentState);
  }, [agentState]);

  useEffect(() => {
    stateRef.current = currentState;
  }, [currentState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();

    const N = 60;
    const W = () => canvas.width;
    const H = () => canvas.height;

    // initialise particles
    const particles: Particle[] = Array.from({ length: N }, (_, i) => {
      const cols = Math.ceil(Math.sqrt(N));
      const row = Math.floor(i / cols);
      const col = i % cols;
      return {
        x: (col + 1) * (canvas.width / (cols + 1)),
        y: (row + 1) * (canvas.height / (Math.ceil(N / cols) + 1)),
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        r: 5,
        tx: (col + 1) * (canvas.width / (cols + 1)),
        ty: (row + 1) * (canvas.height / (Math.ceil(N / cols) + 1)),
      };
    });

    let raf: number;

    const tick = () => {
      const state = stateRef.current;
      const w = W();
      const h = H();
      ctx.clearRect(0, 0, w, h);

      // background tint
      const bg = state === "solid" ? "rgba(59,130,246,0.06)" : state === "liquid" ? "rgba(6,182,212,0.06)" : "rgba(249,115,22,0.06)";
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      for (const p of particles) {
        if (state === "solid") {
          // attract to grid target, dampen
          p.vx += (p.tx - p.x) * 0.08;
          p.vy += (p.ty - p.y) * 0.08;
          p.vx *= 0.75;
          p.vy *= 0.75;
        } else if (state === "liquid") {
          // gentle brownian + weak gravity
          p.vx += (Math.random() - 0.5) * 0.4;
          p.vy += 0.05;
          p.vx *= 0.97;
          p.vy *= 0.97;
        } else {
          // gas: fast random
          p.vx += (Math.random() - 0.5) * 1.2;
          p.vy += (Math.random() - 0.5) * 1.2;
          p.vx *= 0.99;
          p.vy *= 0.99;
        }

        p.x += p.vx;
        p.y += p.vy;

        // bounce off walls
        if (p.x - p.r < 0) { p.x = p.r; p.vx *= -0.8; }
        if (p.x + p.r > w) { p.x = w - p.r; p.vx *= -0.8; }
        if (p.y - p.r < 0) { p.y = p.r; p.vy *= -0.8; }
        if (p.y + p.r > h) { p.y = h - p.r; p.vy *= -0.8; }

        const color = STATE_CONFIG[state].color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = state === "gas" ? 0.6 : 0.85;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // label
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "bold 18px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(STATE_CONFIG[state].label, w / 2, 30);
      ctx.font = "12px system-ui, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillText(STATE_CONFIG[state].description, w / 2, 50);

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-8rem)] bg-gray-950">
      <canvas ref={canvasRef} className="flex-1 w-full" />
      <div className="flex gap-2 justify-center p-3">
        {(["solid", "liquid", "gas"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setLocalState(s)}
            className={`text-xs px-3 py-1.5 rounded border transition-colors ${
              s === currentState
                ? "border-white/60 bg-white/20 text-white"
                : "border-white/20 text-white/50 hover:border-white/40 hover:text-white/80"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
