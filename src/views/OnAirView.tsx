import { ArrowRight, CalendarDays, Heart, Music4, Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Visualizer } from "@/components/Visualizer";
import { useApp } from "@/lib/store";
import type { Show } from "@/lib/types";
import { cx, DAYS, eatNow, fmtClock, Micro, timeAgo } from "@/lib/util";

function useEatClock() {
  const [now, setNow] = useState(eatNow());
  useEffect(() => {
    const iv = window.setInterval(() => setNow(eatNow()), 1000);
    return () => window.clearInterval(iv);
  }, []);
  return now;
}

export function OnAirView() {
  const s = useApp();
  const now = useEatClock();
  const [msg, setMsg] = useState("");
  const wallRef = useRef<HTMLDivElement>(null);

  const minNow = now.getHours() * 60 + now.getMinutes();
  const dayNow = now.getDay();

  const liveShow = useMemo(
    () => s.data.shows.find((sh) => sh.days.includes(dayNow) && sh.startMin <= minNow && minNow < sh.endMin),
    [s.data.shows, dayNow, minNow],
  );

  const upNext = useMemo(() => {
    const out: Array<{ show: Show; day: number }> = [];
    for (let add = 0; add < 7 && out.length < 4; add++) {
      const day = (dayNow + add) % 7;
      const list = s.data.shows
        .filter((sh) => sh.days.includes(day) && (add > 0 || sh.startMin > minNow))
        .sort((a, b) => a.startMin - b.startMin);
      for (const sh of list) {
        if (sh.id === liveShow?.id) continue;
        out.push({ show: sh, day });
        if (out.length >= 4) break;
      }
    }
    return out;
  }, [s.data.shows, dayNow, minNow, liveShow]);

  useEffect(() => {
    const wall = wallRef.current;
    if (!wall) return;
    if (typeof wall.scrollTo === "function") {
      wall.scrollTo({ top: wall.scrollHeight, behavior: "smooth" });
    } else {
      wall.scrollTop = wall.scrollHeight;
    }
  }, [s.data.chat.length]);

  return (
    <div className="space-y-6">
      {/* hero */}
      <div className="panel overflow-hidden">
        <div className="relative">
          <img src="./art/bg-hero.jpg" alt="" className="absolute inset-0 size-full object-cover opacity-45" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/55 to-transparent" />
          <div className="relative grid gap-6 p-6 md:p-8 lg:grid-cols-[1.35fr_1fr]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip">
                  <span className={cx("size-1.5 rounded-full bg-gold", s.playing && "animate-livepulse")} />
                  {liveShow ? `Live now · ${liveShow.title}` : "Live from Kansanga"}
                </span>
                <span className="chip border-cream/20 bg-cream/5 text-cream/80">{s.data.settings.frequency}</span>
              </div>
              <h1 className="mt-4 font-display text-4xl leading-[1.05] font-semibold text-cream md:text-6xl">
                The voice of <span className="text-gold">Kansanga</span>,
                <br />
                on air for every IUEA mind.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-mist md:text-base">
                Education and entertainment for the students and staff of International University of East Africa — podcasts, music and
                the social heartbeat of campus, streamed worldwide from Ggaba Road.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button onClick={s.toggle} className="btn-gold px-6 py-3 text-sm">
                  {s.playing ? "Pause the stream" : "Listen live"}
                </button>
                <button onClick={() => s.setView("music")} className="btn-ghost px-5 py-3 text-sm font-semibold">
                  <Music4 size={15} className="text-gold" /> Request a song
                </button>
                <button onClick={() => s.setView("community")} className="btn-ghost px-5 py-3 text-sm font-semibold">
                  <Heart size={15} className="text-gold" /> Send a shoutout
                </button>
              </div>
              <div className="mt-6 grid max-w-lg grid-cols-3 gap-3">
                {[
                  { k: "Listeners now", v: String(s.listeners) },
                  { k: "Kampala (EAT)", v: now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) },
                  { k: "Shows this week", v: String(s.data.shows.length) },
                ].map((x) => (
                  <div key={x.k} className="rounded-xl border border-gold/15 bg-black/35 px-3 py-2.5 backdrop-blur">
                    <Micro className="text-faint">{x.k}</Micro>
                    <div className="font-mono text-lg font-semibold text-gold-soft">{x.v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel flex flex-col gap-4 p-4">
              <div className="flex items-center gap-4">
                <img src={s.data.nowPlaying.art} alt="" className="gloss-img size-20 rounded-xl border border-gold/25 object-cover" />
                <div className="min-w-0">
                  <Micro>Now playing</Micro>
                  <div className="truncate font-display text-xl font-semibold text-cream">{s.data.nowPlaying.title}</div>
                  <div className="truncate text-xs text-mist">{s.data.nowPlaying.subtitle}</div>
                </div>
              </div>
              <div className="h-24">
                <Visualizer bars={48} />
              </div>
              <div className="rounded-xl border border-gold/15 bg-black/30 p-3">
                <Micro className="mb-2 text-faint">Shout wall</Micro>
                <div ref={wallRef} className="max-h-44 space-y-2.5 overflow-y-auto pr-1">
                  {s.data.chat.map((m) => (
                    <div key={m.id} className="text-xs leading-relaxed">
                      <span className={cx("font-bold", m.dj ? "text-gold" : "text-cream")}>{m.name}</span>{" "}
                      <span className="text-faint">· {timeAgo(m.createdAt)}</span>
                      <div className={cx(m.dj ? "text-gold-soft/90" : "text-mist")}>{m.body}</div>
                    </div>
                  ))}
                </div>
                <form
                  className="mt-3 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!msg.trim()) return;
                    s.sendChat(msg.trim());
                    setMsg("");
                  }}
                >
                  <input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Shout out your hall, class or friend…" className="input py-2 text-xs" />
                  <button className="btn-gold px-3 py-2" aria-label="Send shout">
                    <Send size={14} />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* up next */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <Micro>Up next on the grid</Micro>
          <button onClick={() => s.setView("schedule")} className="inline-flex items-center gap-1 text-xs font-semibold text-gold hover:text-gold-soft">
            Full schedule <ArrowRight size={13} />
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {upNext.map(({ show, day }) => (
            <button
              key={`${show.id}-${day}`}
              onClick={() => s.setView("podcasts")}
              className="panel group flex items-center gap-3 p-3 text-left transition hover:border-gold/40"
            >
              <img src={show.art} alt="" className="gloss-img size-14 rounded-lg border border-gold/20 object-cover" />
              <div className="min-w-0">
                <Micro className="text-faint">
                  {day === dayNow ? "Today" : DAYS[day]} · {fmtClock(show.startMin)}
                </Micro>
                <div className="truncate text-sm font-bold text-cream group-hover:text-gold-soft">{show.title}</div>
                <div className="truncate text-[11px] text-faint">with {show.host}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* education strip */}
      <div className="panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-4">
          <span className="rounded-xl bg-gold/15 p-3 text-gold">
            <CalendarDays size={20} />
          </span>
          <div>
            <div className="font-display text-lg font-semibold text-cream">Learning to Succeed, on air</div>
            <div className="text-xs text-mist">Study-skills hours, lecture companion segments and exam-season night programming — radio that graduates with you.</div>
          </div>
        </div>
        <button onClick={() => s.setView("podcasts")} className="btn-ghost px-5 py-2.5 text-sm font-semibold">
          Browse the education hours
        </button>
      </div>
    </div>
  );
}
