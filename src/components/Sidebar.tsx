import { CalendarDays, Cloud, CloudOff, Mic, Music4, Radio, Settings, SlidersHorizontal, Users } from "lucide-react";
import { useApp } from "@/lib/store";
import type { ViewId } from "@/lib/types";
import { cx } from "@/lib/util";

const NAV: Array<{ id: ViewId; label: string; icon: typeof Radio; hint: string }> = [
  { id: "onair", label: "On Air", icon: Radio, hint: "Live stream & shout wall" },
  { id: "podcasts", label: "Podcasts", icon: Mic, hint: "Shows & episodes" },
  { id: "music", label: "Music", icon: Music4, hint: "Rotation & requests" },
  { id: "schedule", label: "Schedule", icon: CalendarDays, hint: "The weekly grid (EAT)" },
  { id: "community", label: "Community", icon: Users, hint: "Feed, polls & clubs" },
  { id: "studio", label: "Studio", icon: SlidersHorizontal, hint: "Presenter console" },
  { id: "settings", label: "Settings", icon: Settings, hint: "Cloud, stream & brand kit" },
];

export function NavItems({ onPick }: { onPick?: () => void }) {
  const s = useApp();
  return (
    <>
      {NAV.map((n) => {
        const active = s.view === n.id;
        return (
          <button
            key={n.id}
            onClick={() => {
              s.setView(n.id);
              onPick?.();
            }}
            className={cx(
              "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
              active ? "bg-gradient-to-r from-maroon/70 to-maroon/10 text-cream shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" : "text-mist hover:bg-white/5 hover:text-cream",
            )}
          >
            <span className={cx("rounded-lg p-1.5", active ? "bg-gold text-maroon-deep" : "bg-white/5 text-gold/80 group-hover:text-gold")}>
              <n.icon size={16} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold">{n.label}</span>
              <span className="block truncate text-[10px] text-faint">{n.hint}</span>
            </span>
            {active && <span className="ml-auto size-1.5 rounded-full bg-gold" />}
          </button>
        );
      })}
    </>
  );
}

export function CloudBadge() {
  const s = useApp();
  const styles: Record<string, string> = {
    ok: "border-gold/40 bg-gold/10 text-gold-soft",
    connecting: "border-sky-600/50 bg-sky-500/10 text-sky-300",
    error: "border-rose-600/50 bg-rose-500/10 text-rose-300",
    off: "border-line bg-white/5 text-faint",
  };
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] tracking-[0.18em] uppercase", styles[s.cloudStatus])} title={s.cloudMessage}>
      {s.cloudStatus === "off" ? <CloudOff size={10} /> : <Cloud size={10} />}
      {s.cloudStatus === "off" ? "local-first" : s.cloudStatus}
    </span>
  );
}

export function Sidebar() {
  const s = useApp();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-gold/10 bg-surface/70 backdrop-blur-xl md:flex">
      <div className="flex items-center gap-3 border-b border-gold/10 px-4 py-4">
        <img src="./brand/iuea-shield.png" alt="IUEA crest" className="size-11 drop-shadow-[0_6px_14px_rgba(0,0,0,0.6)]" />
        <div className="min-w-0">
          <div className="font-display text-[17px] leading-tight font-semibold text-cream">
            IUEA <span className="text-gold">Community</span> Radio
          </div>
          <div className="micro text-faint">Learning to Succeed</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <NavItems />
      </nav>
      <div className="space-y-2 border-t border-gold/10 px-4 py-3">
        <CloudBadge />
        <div className="text-[10px] leading-relaxed text-faint">
          Kansanga, Ggaba Road · Kampala
          <br />
          {s.data.settings.frequency}
        </div>
      </div>
    </aside>
  );
}
