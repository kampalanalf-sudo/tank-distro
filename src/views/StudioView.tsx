import { Check, Mic, Radio, Send, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { CloudBadge } from "@/components/Sidebar";
import { useApp } from "@/lib/store";
import type { Post } from "@/lib/types";
import { cx, Micro, SectionHead, timeAgo } from "@/lib/util";

export function StudioView() {
  const s = useApp();
  const [postKind, setPostKind] = useState<Post["kind"]>("announcement");
  const [postBody, setPostBody] = useState("");
  const [djMsg, setDjMsg] = useState("");
  const np = s.data.nowPlaying;

  return (
    <div>
      <SectionHead kicker="Presenter console" title="The studio" right={<CloudBadge />} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* now playing control */}
        <div className="panel p-5">
          <Micro>Now playing control</Micro>
          <div className="mt-3 flex items-center gap-3">
            <img src={np.art} alt="" className="gloss-img size-16 rounded-xl border border-gold/25 object-cover" />
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-cream">{np.title}</div>
              <div className="truncate text-[11px] text-mist">{np.subtitle}</div>
              <div className={cx("mt-1 inline-flex items-center gap-1.5 font-mono text-[9px] tracking-[0.18em] uppercase", s.playing ? "text-gold" : "text-faint")}>
                <span className={cx("size-1.5 rounded-full", s.playing ? "bg-gold animate-livepulse" : "bg-faint")} />
                {s.playing ? "transmitting" : "standby"}
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <button onClick={() => s.goLive()} className="btn-gold w-full py-2.5 text-sm">
              <Radio size={15} /> Open mic — go live
            </button>
            <label className="block">
              <Micro className="mb-1 text-faint">Play an episode</Micro>
              <select
                className="input"
                value=""
                onChange={(e) => {
                  const ep = s.data.episodes.find((x) => x.id === e.target.value);
                  if (ep) s.playEpisode(ep);
                }}
              >
                <option value="">Choose episode…</option>
                {s.data.episodes.map((ep) => (
                  <option key={ep.id} value={ep.id}>{ep.title}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <Micro className="mb-1 text-faint">Play a track / bed</Micro>
              <select
                className="input"
                value=""
                onChange={(e) => {
                  const t = s.data.tracks.find((x) => x.id === e.target.value);
                  if (t) s.playTrack(t);
                }}
              >
                <option value="">Choose track…</option>
                {s.data.tracks.map((t) => (
                  <option key={t.id} value={t.id}>{t.title} — {t.artist}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* request queue */}
        <div className="panel p-5">
          <Micro>Request queue</Micro>
          <div className="mt-3 space-y-2.5">
            {s.data.requests.filter((r) => r.status !== "played").length === 0 && (
              <div className="rounded-xl border border-line bg-black/25 p-4 text-xs text-faint">Queue clear. Beautiful silence.</div>
            )}
            {s.data.requests
              .filter((r) => r.status !== "played")
              .map((r) => (
                <div key={r.id} className="rounded-xl border border-line bg-black/25 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold text-cream">{r.song} — {r.artist || "unknown"}</div>
                      <div className="truncate text-[10px] text-faint">{r.name} · {r.community} · {timeAgo(r.createdAt)} · {r.votes} votes</div>
                    </div>
                    <button onClick={() => s.markRequest(r.id, "played")} className="btn-ghost shrink-0 px-2.5 py-1.5 text-[10px] font-bold" aria-label="Mark played">
                      <Check size={12} className="text-gold" /> PLAYED
                    </button>
                  </div>
                  {r.message && <div className="mt-1.5 text-[11px] text-mist italic">“{r.message}”</div>}
                </div>
              ))}
          </div>
        </div>

        {/* publish + dj chat */}
        <div className="space-y-5">
          <div className="panel p-5">
            <Micro>Publish to the wall</Micro>
            <div className="mt-3 space-y-2.5">
              <select className="input" value={postKind} onChange={(e) => setPostKind(e.target.value as Post["kind"])}>
                <option value="announcement">Announcement</option>
                <option value="post">Post</option>
                <option value="shoutout">Shoutout read</option>
                <option value="club">Club news</option>
              </select>
              <textarea className="input min-h-24 resize-y" placeholder="Studio notice for students & staff…" value={postBody} onChange={(e) => setPostBody(e.target.value)} />
              <button
                className="btn-gold w-full py-2 text-sm"
                onClick={() => {
                  if (!postBody.trim()) return;
                  s.sendPost({ author: "Studio", role: "IUEA Community Radio", kind: postKind, body: postBody.trim() });
                  setPostBody("");
                }}
              >
                <Mic size={14} /> Publish as Studio
              </button>
            </div>
          </div>

          <div className="panel p-5">
            <Micro>Talk to the shout wall</Micro>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!djMsg.trim()) return;
                s.sendChat(djMsg.trim(), true);
                setDjMsg("");
              }}
            >
              <input className="input" placeholder="Message from the studio…" value={djMsg} onChange={(e) => setDjMsg(e.target.value)} />
              <button className="btn-gold px-3.5" aria-label="Send as studio">
                <Send size={14} />
              </button>
            </form>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                { k: "Listeners", v: s.listeners },
                { k: "Episode plays", v: s.data.episodes.reduce((a, e) => a + e.plays, 0) },
                { k: "Wall posts", v: s.data.posts.length },
              ].map((x) => (
                <div key={x.k} className="rounded-xl border border-line bg-black/30 px-2 py-2.5">
                  <div className="font-mono text-lg font-semibold text-gold-soft">{x.v}</div>
                  <Micro className="text-faint">{x.k}</Micro>
                </div>
              ))}
            </div>
            <p className="mt-3 flex items-start gap-2 text-[10px] leading-relaxed text-faint">
              <SlidersHorizontal size={11} className="mt-0.5 shrink-0 text-gold/60" />
              Presenters: set the real stream URL and station contacts in Settings; everything you do here syncs to every listener through Supabase realtime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
