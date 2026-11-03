import clsx, { type ClassValue } from "clsx";
import type { ReactNode } from "react";

export const cx = (...c: ClassValue[]) => clsx(...c);

/** EAT (UTC+3, Kampala) wall clock as a Date whose local getters read EAT. */
export function eatNow(): Date {
  return new Date(Date.now() + (3 * 60 + new Date().getTimezoneOffset()) * 60000);
}

export function fmtClock(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  const ap = h < 12 ? "AM" : "PM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ap}`;
}

export function fmtDur(s: number): string {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.round(s % 60)).padStart(2, "0")}`;
}

export function timeAgo(iso: string): string {
  const d = Date.now() - Date.parse(iso);
  const min = Math.floor(d / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export function Micro({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("micro text-gold/80", className)}>{children}</div>;
}

export function SectionHead({ kicker, title, right }: { kicker: string; title: string; right?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <Micro>{kicker}</Micro>
        <h2 className="font-display text-3xl font-semibold text-cream md:text-4xl">{title}</h2>
      </div>
      {right}
    </div>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className={cx(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-gold/35 bg-gradient-to-b from-wine to-maroon-deep text-[11px] font-extrabold text-gold-soft shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]",
        className,
      )}
    >
      {initials || "IU"}
    </span>
  );
}

export function EqBars({ className, bars = 4 }: { className?: string; bars?: number }) {
  return (
    <span className={cx("inline-flex h-3.5 items-end gap-[2px]", className)} aria-hidden>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className="w-[3px] origin-bottom rounded-full bg-gold animate-eq"
          style={{ animationDelay: `${i * 0.13}s`, height: "100%" }}
        />
      ))}
    </span>
  );
}

export function GlossArt({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <div className={cx("gloss-img rounded-xl border border-gold/20 shadow-[0_16px_40px_-18px_rgba(0,0,0,0.9)]", className)}>
      <img src={src} alt={alt} className="size-full object-cover" loading="lazy" />
    </div>
  );
}
