import { useMemo } from "react";
import { useApp } from "@/lib/store";
import { CATEGORY_LABEL } from "@/lib/types";
import { cx, DAYS, eatNow, fmtClock, Micro, SectionHead } from "@/lib/util";

const START = 6 * 60;
const END = 24 * 60;
const H = 54; // px per hour
const COLS = [1, 2, 3, 4, 5, 6, 0]; // MON..SUN

export function ScheduleView() {
  const s = useApp();
  const now = eatNow();
  const minNow = now.getHours() * 60 + now.getMinutes();
  const dayNow = now.getDay();
  const height = ((END - START) / 60) * H;

  const hours = useMemo(() => {
    const out: number[] = [];
    for (let m = START; m < END; m += 180) out.push(m);
    return out;
  }, []);

  return (
    <div>
      <SectionHead
        kicker="Weekly grid"
        title="Broadcast schedule"
        right={<span className="chip">All times EAT · Kampala</span>}
      />

      <div className="panel overflow-x-auto p-4 md:p-6">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[56px_repeat(7,1fr)] gap-x-1.5">
            <div />
            {COLS.map((d) => (
              <div key={d} className={cx("pb-2 text-center", d === dayNow && "rounded-t-lg bg-gold/10")}>
                <Micro className={cx(d === dayNow ? "text-gold" : "text-faint")}>{DAYS[d]}</Micro>
                {d === dayNow && <div className="font-mono text-[9px] text-gold-soft">today</div>}
              </div>
            ))}

            {/* hour rail */}
            <div className="relative" style={{ height }}>
              {hours.map((m) => (
                <div key={m} className="absolute right-1 -translate-y-1/2 font-mono text-[9px] text-faint" style={{ top: ((m - START) / 60) * H }}>
                  {fmtClock(m)}
                </div>
              ))}
            </div>

            {COLS.map((d) => (
              <div key={d} className={cx("relative rounded-b-lg border-t border-line/60", d === dayNow && "bg-gold/[0.06]")} style={{ height }}>
                {hours.map((m) => (
                  <div key={m} className="absolute inset-x-0 border-t border-line/40" style={{ top: ((m - START) / 60) * H }} />
                ))}
                {s.data.shows
                  .filter((sh) => sh.days.includes(d))
                  .map((sh) => {
                    const top = ((sh.startMin - START) / 60) * H;
                    const hgt = ((sh.endMin - sh.startMin) / 60) * H;
                    const live = d === dayNow && sh.startMin <= minNow && minNow < sh.endMin;
                    return (
                      <button
                        key={sh.id}
                        onClick={() => s.setView("podcasts")}
                        title={`${sh.title} — with ${sh.host} (${CATEGORY_LABEL[sh.category]})`}
                        className={cx(
                          "absolute inset-x-0.5 overflow-hidden rounded-lg border px-2 py-1.5 text-left transition",
                          live
                            ? "border-gold/60 bg-gradient-to-b from-maroon to-wine shadow-[0_0_24px_-6px_rgba(238,175,61,0.5)]"
                            : "border-gold/15 bg-gradient-to-b from-card2 to-card hover:border-gold/40",
                        )}
                        style={{ top: top + 1, height: Math.max(26, hgt - 3) }}
                      >
                        <div className={cx("truncate text-[11px] font-bold", live ? "text-gold-soft" : "text-cream")}>{sh.title}</div>
                        <div className="truncate font-mono text-[8.5px] tracking-wider text-faint uppercase">
                          {fmtClock(sh.startMin)}–{fmtClock(sh.endMin)} · {CATEGORY_LABEL[sh.category]}
                        </div>
                        {hgt > 70 && <div className="mt-1 truncate text-[10px] text-mist">with {sh.host}</div>}
                        {live && <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-gold px-1.5 py-px font-mono text-[8px] font-bold tracking-[0.16em] text-maroon-deep uppercase">on air</div>}
                      </button>
                    );
                  })}
                {d === dayNow && minNow >= START && minNow < END && (
                  <div className="pointer-events-none absolute inset-x-0 z-10" style={{ top: ((minNow - START) / 60) * H }}>
                    <div className="h-px bg-gold shadow-[0_0_10px_rgba(238,175,61,0.9)]" />
                    <div className="-mt-[3px] ml-0 size-1.5 rounded-full bg-gold" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {s.data.shows.map((sh) => (
          <div key={sh.id} className="panel flex items-center gap-3 p-3">
            <img src={sh.art} alt="" className="gloss-img size-12 rounded-lg border border-gold/20 object-cover" />
            <div className="min-w-0">
              <div className="truncate text-xs font-bold text-cream">{sh.title}</div>
              <Micro className="text-faint">
                {sh.days.length === 7 ? "Daily" : sh.days.map((x) => DAYS[x]).join("·")} {fmtClock(sh.startMin)}
              </Micro>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
