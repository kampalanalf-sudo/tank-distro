import { ArrowBigUp, Disc3, Play, Send } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/lib/store";
import type { Track } from "@/lib/types";
import { cx, fmtDur, Micro, SectionHead, timeAgo } from "@/lib/util";

const TABS = ["hot", "warm", "classic", "all"] as const;
const ROT_STYLE: Record<string, string> = {
  hot: "border-rose-500/40 bg-rose-500/10 text-rose-300",
  warm: "border-gold/40 bg-gold/10 text-gold-soft",
  classic: "border-sky-500/40 bg-sky-500/10 text-sky-300",
};

export function MusicView() {
  const s = useApp();
  const [tab, setTab] = useState<(typeof TABS)[number]>("hot");
  const [form, setForm] = useState({ song: "", artist: "", message: "", name: s.profile.name, community: s.profile.community });
  const [sent, setSent] = useState(false);

  const tracks = s.data.tracks.filter((t) => tab === "all" || t.rotation === tab);

  const playRow = (t: Track) => {
    s.playTrack(t);
  };

  return (
    <div>
      <SectionHead kicker="The rotation" title="Music & requests" right={<span className="chip">Ggaba Road Grooves · Fri 5–7 PM</span>} />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="panel p-5">
          <div className="mb-4 flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cx(
                  "rounded-full px-4 py-1.5 font-mono text-[10px] tracking-[0.18em] uppercase transition",
                  tab === t ? "bg-gold text-maroon-deep font-bold" : "border border-line text-mist hover:border-gold/40 hover:text-cream",
                )}
              >
                {t === "all" ? "Everything" : `${t} rotation`}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {tracks.map((t, i) => {
              const current = s.data.nowPlaying.title === t.title && s.data.nowPlaying.kind === "track";
              return (
                <div key={t.id} className={cx("flex items-center gap-3 rounded-xl border px-3 py-2.5 transition", current ? "border-gold/45 bg-gold/5" : "border-transparent hover:border-line hover:bg-white/[0.03]")}>
                  <span className="w-6 text-right font-mono text-[10px] text-faint">{String(i + 1).padStart(2, "0")}</span>
                  <button onClick={() => playRow(t)} aria-label={`Play ${t.title}`} className={cx("btn-gold size-9 rounded-full", !t.audioUrl && "from-card2 to-card text-gold shadow-none border border-gold/30")}>
                    <Play size={14} className="translate-x-[1px]" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-cream">{t.title}</div>
                    <div className="truncate text-[11px] text-mist">{t.artist} · {t.genre}</div>
                  </div>
                  <span className={cx("hidden rounded-full border px-2 py-0.5 font-mono text-[9px] tracking-[0.16em] uppercase sm:inline", ROT_STYLE[t.rotation])}>{t.rotation}</span>
                  <span className="hidden font-mono text-[10px] text-faint md:inline">{t.plays} plays</span>
                  <span className="font-mono text-[10px] text-faint">{fmtDur(t.durationS)}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-faint">
            <Disc3 size={11} className="mr-1 inline text-gold/60" />
            Tracks without a licence file yet preview on the studio demo bed; licensed audio drops in per track once cleared by the studio.
          </p>
        </div>

        <div className="space-y-6">
          <div className="panel p-5">
            <Micro>Request line — open</Micro>
            <h3 className="mt-1 font-display text-2xl font-semibold text-cream">Ask the studio for a song</h3>
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!form.song.trim()) return;
                s.sendRequest({ song: form.song.trim(), artist: form.artist.trim(), message: form.message.trim(), name: form.name.trim() || "Anonymous", community: form.community.trim() });
                setSent(true);
                setForm({ ...form, song: "", artist: "", message: "" });
                window.setTimeout(() => setSent(false), 2600);
              }}
            >
              <div className="grid grid-cols-2 gap-3">
                <input className="input" placeholder="Song title *" value={form.song} onChange={(e) => setForm({ ...form, song: e.target.value })} />
                <input className="input" placeholder="Artist" value={form.artist} onChange={(e) => setForm({ ...form, artist: e.target.value })} />
              </div>
              <textarea className="input min-h-20 resize-y" placeholder="Dedication or shoutout (optional)" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <input className="input" placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <input className="input" placeholder="Hall / faculty / unit" value={form.community} onChange={(e) => setForm({ ...form, community: e.target.value })} />
              </div>
              <button className="btn-gold w-full py-2.5 text-sm">
                <Send size={14} /> Send to the studio
              </button>
              {sent && <div className="rounded-lg border border-gold/35 bg-gold/10 px-3 py-2 text-xs text-gold-soft">Received! DJ Kayole pulls from this queue on air.</div>}
            </form>
          </div>

          <div className="panel p-5">
            <Micro className="text-faint">The request queue</Micro>
            <div className="mt-3 space-y-3">
              {s.data.requests.map((r) => (
                <div key={r.id} className="rounded-xl border border-line bg-black/25 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-cream">{r.song} {r.artist && <span className="font-normal text-mist">— {r.artist}</span>}</div>
                      {r.message && <div className="mt-1 text-xs leading-relaxed text-mist italic">“{r.message}”</div>}
                      <div className="mt-1.5 text-[10px] text-faint">{r.name} · {r.community} · {timeAgo(r.createdAt)}</div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className={cx("rounded-full border px-2 py-0.5 font-mono text-[9px] tracking-[0.16em] uppercase", r.status === "played" ? "border-line text-faint" : r.status === "queued" ? "border-gold/40 bg-gold/10 text-gold-soft" : "border-sky-500/40 bg-sky-500/10 text-sky-300")}>{r.status}</span>
                      <button onClick={() => s.voteRequest(r.id)} className="btn-ghost px-2.5 py-1 text-[11px] font-semibold" aria-label="Vote for this request">
                        <ArrowBigUp size={14} className="text-gold" /> {r.votes}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
