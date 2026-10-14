import { useEffect, useRef } from "react";

/** Nền cánh hoa + trái tim + hạt lấp lánh rơi nhẹ (canvas 2D, nhẹ cho điện thoại). */
export function PetalRain({ density = 1 }: { density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    type P = { x: number; y: number; vy: number; vx: number; r: number; rot: number; vr: number; kind: number; hue: string; phase: number };
    const colors = ["#ff8fb1", "#ffc2d4", "#ff5c8a", "#ffd36e", "#fff0f5"];
    const count = Math.round(Math.min(70, (w * h) / 22000) * density);
    const make = (top = false): P => ({
      x: Math.random() * w,
      y: top ? -20 : Math.random() * h,
      vy: 0.3 + Math.random() * 0.9,
      vx: -0.3 + Math.random() * 0.6,
      r: 5 + Math.random() * 9,
      rot: Math.random() * Math.PI * 2,
      vr: -0.02 + Math.random() * 0.04,
      kind: Math.random() < 0.6 ? 0 : Math.random() < 0.5 ? 1 : 2,
      hue: colors[Math.floor(Math.random() * colors.length)],
      phase: Math.random() * 100,
    });
    const ps = Array.from({ length: count }, () => make());

    const petal = (p: P) => {
      ctx.beginPath();
      ctx.moveTo(0, -p.r);
      ctx.bezierCurveTo(p.r, -p.r * 0.4, p.r * 0.7, p.r, 0, p.r);
      ctx.bezierCurveTo(-p.r * 0.7, p.r, -p.r, -p.r * 0.4, 0, -p.r);
      ctx.fill();
    };
    const heart = (p: P) => {
      const s = p.r / 12;
      ctx.beginPath();
      ctx.moveTo(0, 4 * s);
      ctx.bezierCurveTo(-12 * s, -4 * s, -6 * s, -14 * s, 0, -7 * s);
      ctx.bezierCurveTo(6 * s, -14 * s, 12 * s, -4 * s, 0, 4 * s);
      ctx.fill();
    };

    let raf = 0;
    let t = 0;
    const tick = () => {
      t++;
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        p.y += p.vy;
        p.x += p.vx + Math.sin((t + p.phase) / 40) * 0.4;
        p.rot += p.vr;
        if (p.y > h + 20) Object.assign(p, make(true));
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.hue;
        if (p.kind === 2) {
          const a = 0.4 + 0.6 * Math.abs(Math.sin((t + p.phase * 10) / 30));
          ctx.globalAlpha = a;
          ctx.shadowColor = "#ffd36e";
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(0, 0, p.r / 4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.globalAlpha = 0.75;
          if (p.kind === 0) petal(p);
          else heart(p);
        }
        ctx.restore();
      }
      if (!reduce) raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [density]);

  return <canvas ref={ref} className="petal-rain" aria-hidden />;
}
