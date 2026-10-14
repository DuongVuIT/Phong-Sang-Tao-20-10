import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

export type FireworksHandle = { burst: (x?: number, y?: number) => void; show: (n?: number) => void };

type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number; heart: boolean };

const COLORS = ["#ffd36e", "#ff5c8a", "#ff8fb1", "#fff1c9", "#c77dff", "#ffb703"];

/** Pháo hoa + mưa tim khi mở lì xì. */
export const Fireworks = forwardRef<FireworksHandle>(function Fireworks(_, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparks = useRef<Spark[]>([]);
  const running = useRef(false);

  const loop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const dpr = canvas.width / canvas.clientWidth;
    sparks.current = sparks.current.filter((s) => s.life < s.max);
    for (const s of sparks.current) {
      s.life++;
      s.vy += 0.045;
      s.vx *= 0.985;
      s.vy *= 0.985;
      s.x += s.vx;
      s.y += s.vy;
      const a = 1 - s.life / s.max;
      ctx.globalAlpha = a;
      ctx.fillStyle = s.color;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 10 * dpr;
      if (s.heart) {
        ctx.font = `${s.size * 3 * dpr}px serif`;
        ctx.fillText("♥", s.x * dpr, s.y * dpr);
      } else {
        ctx.beginPath();
        ctx.arc(s.x * dpr, s.y * dpr, s.size * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (sparks.current.length) requestAnimationFrame(loop);
    else running.current = false;
  };

  const burst = (x?: number, y?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cx = x ?? canvas.clientWidth * (0.2 + Math.random() * 0.6);
    const cy = y ?? canvas.clientHeight * (0.15 + Math.random() * 0.35);
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const n = 70;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const sp = 2 + Math.random() * 3.5;
      sparks.current.push({
        x: cx,
        y: cy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0,
        max: 60 + Math.random() * 40,
        color: Math.random() < 0.3 ? "#fff6d5" : color,
        size: 1.6 + Math.random() * 1.6,
        heart: Math.random() < 0.12,
      });
    }
    if (!running.current) {
      running.current = true;
      requestAnimationFrame(loop);
    }
  };

  useImperativeHandle(ref, () => ({
    burst,
    show: (n = 6) => {
      for (let i = 0; i < n; i++) setTimeout(() => burst(), i * 280);
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current!;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return <canvas ref={canvasRef} className="fireworks" aria-hidden />;
});
