import { useEffect, useRef } from "react";
import { engine } from "@/lib/audio";
import { cx } from "@/lib/util";

/** Gold spectrum mirror driven by the engine's AnalyserNode — always truthful. */
export function Visualizer({ className, bars = 56 }: { className?: string; bars?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const buf = new Uint8Array(new ArrayBuffer(64));
    let raf = 0;
    let phase = 0;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      engine.levels(buf);
      phase += 0.03;
      const n = bars;
      const gap = 2;
      const bw = (w - gap * (n - 1)) / n;
      for (let i = 0; i < n; i++) {
        const v = buf[Math.floor((i / n) * 60) + 2] / 255;
        const idle = 0.04 + 0.03 * Math.sin(phase + i * 0.55);
        const lvl = Math.max(v, engine.playing ? idle : idle * 0.5);
        const bh = Math.max(2, lvl * h);
        const x = i * (bw + gap);
        const grad = ctx.createLinearGradient(0, h, 0, h - bh);
        grad.addColorStop(0, "rgba(122,0,0,0.9)");
        grad.addColorStop(0.55, "rgba(238,175,61,0.95)");
        grad.addColorStop(1, "rgba(246,212,137,1)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, h - bh, bw, bh, 2);
        ctx.fill();
        // glossy reflection
        ctx.fillStyle = "rgba(238,175,61,0.14)";
        ctx.beginPath();
        ctx.roundRect(x, h - 1, bw, Math.min(6, bh * 0.18), 2);
        ctx.fill();
      }
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [bars]);

  return <canvas ref={ref} className={cx("h-full w-full", className)} aria-label="Live audio spectrum" />;
}
