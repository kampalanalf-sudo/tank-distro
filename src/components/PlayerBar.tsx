import { Headphones, Pause, Play, Radio, Volume2 } from "lucide-react";
import { useApp } from "@/lib/store";
import { cx } from "@/lib/util";
import { Visualizer } from "./Visualizer";

const MODE_LABEL: Record<string, string> = {
  stream: "Live stream",
  file: "On demand",
  demo: "Studio demo bed",
  idle: "Standby",
};

export function PlayerBar() {
  const s = useApp();
  const np = s.data.nowPlaying;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gold/15 bg-surface/85 backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-soft/50 to-transparent" />
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-2.5 md:gap-5 md:px-6">
        <img src={np.art} alt="" className="gloss-img size-12 rounded-lg border border-gold/25 object-cover md:size-14" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {np.kind === "live" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-maroon px-2 py-0.5 font-mono text-[9px] font-bold tracking-[0.18em] text-cream uppercase shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
                <span className={cx("size-1.5 rounded-full bg-gold", s.playing && "animate-livepulse")} />
                On air
              </span>
            )}
            <span className="truncate text-sm font-bold text-cream">{np.title}</span>
          </div>
          <div className="truncate text-xs text-mist">
            {np.subtitle} · <span className="text-gold/70">{MODE_LABEL[s.mode] ?? s.mode}</span>
          </div>
        </div>

        <div className="hidden h-9 w-40 md:block lg:w-56">
          <Visualizer bars={40} />
        </div>

        <button
          onClick={s.toggle}
          aria-label={s.playing ? "Pause" : "Play"}
          className="btn-gold size-11 shrink-0 rounded-full md:size-12"
        >
          {s.playing ? <Pause size={20} /> : <Play size={20} className="translate-x-[1px]" />}
        </button>

        <div className="hidden items-center gap-2 sm:flex">
          <Volume2 size={15} className="text-mist" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={s.volume}
            onChange={(e) => s.setVolume(Number(e.target.value))}
            className="h-1 w-20 cursor-pointer accent-gold"
            aria-label="Volume"
          />
        </div>

        <div className="hidden items-center gap-1.5 text-xs text-mist lg:flex">
          <Headphones size={14} className="text-gold" />
          <span className="font-mono font-semibold text-cream">{s.listeners}</span> listening
        </div>
        <Radio size={15} className="text-gold/50 md:hidden" />
      </div>
    </div>
  );
}
