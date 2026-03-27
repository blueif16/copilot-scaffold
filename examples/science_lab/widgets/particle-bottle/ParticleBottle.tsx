"use client";

import { useEffect, useRef } from "react";

interface Props {
  color?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

export default function ParticleBottle({ color = "#44aaff" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const W = canvas.width;
    const H = canvas.height;

    // Bottle bounds (inner)
    const bx = W * 0.2;
    const bw = W * 0.6;
    const by = H * 0.1;
    const bh = H * 0.8;

    const particles: Particle[] = Array.from({ length: 40 }, () => ({
      x: bx + Math.random() * bw,
      y: by + Math.random() * bh,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3,
      r: 4 + Math.random() * 4,
    }));

    let raf: number;

    const tick = () => {
      ctx.clearRect(0, 0, W, H);

      // Bottle outline
      ctx.strokeStyle = "rgba(200,220,255,0.6)";
      ctx.lineWidth = 3;
      ctx.strokeRect(bx, by, bw, bh);

      // Particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05; // gravity

        if (p.x - p.r < bx) { p.x = bx + p.r; p.vx *= -0.8; }
        if (p.x + p.r > bx + bw) { p.x = bx + bw - p.r; p.vx *= -0.8; }
        if (p.y - p.r < by) { p.y = by + p.r; p.vy *= -0.8; }
        if (p.y + p.r > by + bh) { p.y = by + bh - p.r; p.vy *= -0.8; }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.85;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [color]);

  return (
    <div className="flex w-full items-center justify-center bg-gray-950 min-h-[500px]">
      <canvas ref={canvasRef} className="w-full h-full" style={{ minHeight: 400 }} />
    </div>
  );
}
