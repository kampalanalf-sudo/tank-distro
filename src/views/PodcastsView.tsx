import { Headphones, Pause, Play } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { CATEGORY_LABEL, type Show } from "@/lib/types";
import { cx, DAYS, fmtClock, fmtDur, GlossArt, Micro, SectionHead, timeAgo } from "@/lib/util";

function scheduleLabel(s: Show): string {
  const d = s.days.length === 7 ? "DAILY" : s.days.length === 5 && s.days[0] === 1 ? "WEEKDAYS" : s.days.map((x) => DAYS[x]).join(" · ");
  return `${d} · ${fmtClock(s.startMin)}–${fmtClock(s.endMin)} EAT`;
}

export function PodcastsView() {
  const s = useApp();
  const [sel, setSel] = useState(s.data.shows[0]?.id ?? "");
  const show = s.data.shows.find((x) => x.id === sel) ?? s.data.shows[0];
  const eps = s.data.episodes.filter((e) => e.showId === show?.id);

  return (
    <div>
      <SectionHead
        kicker="On demand"
        title="Podcasts & shows"
        right={<span className="chip">{s.data.shows.length} shows · {s.data.episodes.length} episodes</span>}
      />
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-3">
          {s.data.shows.map((sh) => (
            <button
              key={sh.id}
              onClick={() => setSel(sh.id)}
              className={cx(
                "panel flex w-full items-center gap-4 p-3 text-left transition",
                sel === sh.id ? "border-gold/50 shadow-[0_0_0_1px_rgba(238,175,61,0.35),0_24px_60px_-28px_rgba(0,0,0,0.85)]" : "hover:border-gold/30",
              )}
            >
              <GlossArt src={sh.art} alt={sh.title} className="size-20 shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="chip px-2 py-0.5 text-[9px]">{CATEGORY_LABEL[sh.category]}</span>
                </div>
                <div className="mt-1 truncate font-display text-lg font-semibold text-cream">{sh.title}</div>
                <div className="truncate text-[11px] text-mist">with {sh.host}</div>
                <Micro className="mt-1 text-faint">{scheduleLabel(sh)}</Micro>
              </div>
            </button>
          ))}
        </div>

        {show && (
          <div className="panel p-5 md:p-6">
            <div className="flex flex-wrap items-start gap-5">
              <GlossArt src={show.art} alt={show.title} className="size-32 md:size-40" />
              <div className="min-w-0 flex-1">
                <Micro>{CATEGORY_LABEL[show.category]} · {scheduleLabel(show)}</Micro>
                <h3 className="mt-1 font-display text-3xl font-semibold text-cream">{show.title}</h3>
                <div className="mt-1 text-sm font-semibold text-gold-soft">with {show.host}</div>
                <p className="mt-3 text-sm leading-relaxed text-mist">{show.description}</p>
                <div className="mt-3 text-xs text-faint italic">{show.tagline}</div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <Micro className="text-faint">Episodes</Micro>
              {eps.length === 0 && <div className="rounded-xl border border-line bg-black/25 p-4 text-sm text-faint">Episodes drop here after each broadcast.</div>}
              {eps.map((e, i) => {
                const isCurrent = s.data.nowPlaying.audioUrl === e.audioUrl;
                return (
                  <div key={e.id} className={cx("rounded-xl border p-4 transition", isCurrent ? "border-gold/45 bg-gold/5" : "border-line bg-black/25 hover:border-gold/25")}>
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => (isCurrent && s.playing ? s.toggle() : s.playEpisode(e))}
                        aria-label={isCurrent && s.playing ? "Pause episode" : "Play episode"}
                        className={cx("btn-gold size-11 shrink-0 rounded-full", isCurrent && !s.playing && "opacity-90")}
                      >
                        {isCurrent && s.playing ? <Pause size={17} /> : <Play size={17} className="translate-x-[1px]" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <span className="font-mono text-[10px] text-faint">#{String(eps.length - i).padStart(2, "0")}</span>
                          <span className="text-sm font-bold text-cream">{e.title}</span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-mist">{e.blurb}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-faint">
                          <span className="inline-flex items-center gap-1"><Headphones size={11} className="text-gold/70" />{e.plays} plays</span>
                          <span>{fmtDur(e.durationS)}</span>
                          <span>{timeAgo(e.publishedAt)}</span>
                          {e.tags.map((t) => (
                            <span key={t} className="rounded-full border border-line px-2 py-0.5 font-mono uppercase tracking-wider">{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
