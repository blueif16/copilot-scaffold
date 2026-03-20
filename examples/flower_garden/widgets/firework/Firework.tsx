"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  radius: number;
}

interface Burst {
  particles: Particle[];
}

const COLORS = ["#ff4444", "#ff8800", "#ffdd00", "#44ff88", "#44aaff", "#aa44ff", "#ff44aa", "#ffffff"];

function randomBurst(canvas: HTMLCanvasElement): Burst {
  const x = Math.random() * canvas.width * 0.8 + canvas.width * 0.1;
  const y = Math.random() * canvas.height * 0.6 + canvas.height * 0.05;
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const count = 80 + Math.floor(Math.random() * 60);
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
    const speed = 2 + Math.random() * 5;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      alpha: 1,
      color,
      radius: 1.5 + Math.random() * 2,
    });
  }
  return { particles };
}

export default function Firework() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    window.addEventListener("resize", resize);

    const bursts: Burst[] = [];
    let frame = 0;
    let raf: number;

    const tick = () => {
      frame++;
      // Launch a new burst every ~60 frames
      if (frame % 60 === 0) bursts.push(randomBurst(canvas));

      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let b = bursts.length - 1; b >= 0; b--) {
        const burst = bursts[b];
        let alive = false;
        for (const p of burst.particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.08; // gravity
          p.vx *= 0.98;
          p.alpha -= 0.012;
          if (p.alpha > 0) {
            alive = true;
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 6;
            ctx.shadowColor = p.color;
            ctx.fill();
            ctx.restore();
          }
        }
        if (!alive) bursts.splice(b, 1);
      }

      raf = requestAnimationFrame(tick);
    };

    // Kick off first burst immediately
    bursts.push(randomBurst(canvas));
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="relative flex min-h-[calc(100vh-8rem)] w-full items-center justify-center bg-black">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
