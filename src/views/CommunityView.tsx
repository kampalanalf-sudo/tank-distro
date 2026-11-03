import { Bot, Heart, MessageSquare, MessagesSquare, Music2, Send, Sparkles } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/lib/store";
import type { Post } from "@/lib/types";
import { Avatar, cx, Micro, SectionHead, timeAgo } from "@/lib/util";

const KIND_STYLE: Record<Post["kind"], string> = {
  post: "border-line bg-white/5 text-mist",
  shoutout: "border-rose-500/40 bg-rose-500/10 text-rose-300",
  announcement: "border-gold/40 bg-gold/10 text-gold-soft",
  club: "border-sky-500/40 bg-sky-500/10 text-sky-300",
};

const CLUBS = [
  { icon: Bot, name: "Robotics & Innovation Club", line: "Build sprints, drone nights and the 48-hour campus hack — heard first on Guild Square.", on: "Guild Square" },
  { icon: MessagesSquare, name: "Debate & Public Speaking Society", line: "Motions, rebuttals and the whisper-box verdicts. Training every Tuesday, LH2.", on: "Guild Square" },
  { icon: Music2, name: "IUEA Choir & Staff Band", line: "The maroon & gold sound — station anthem, convocation sets and Kansanga Nights.", on: "Ggaba Road Grooves" },
];

export function CommunityView() {
  const s = useApp();
  const [kind, setKind] = useState<Post["kind"]>("post");
  const [body, setBody] = useState("");
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");

  const poll = s.data.polls[0];
  const pollTotal = poll ? poll.votes.reduce((a, b) => a + b, 0) : 0;

  return (
    <div>
      <SectionHead kicker="The social campus" title="Community wall" right={<span className="chip">{s.listeners} listeners connected</span>} />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          {/* composer */}
          <div className="panel p-4">
            <div className="flex items-center gap-3">
              <Avatar name={s.profile.name || "IUEA Listener"} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-cream">{s.profile.name || "Anonymous listener"}</div>
                <div className="truncate text-[11px] text-faint">{s.profile.community}</div>
              </div>
              <select value={kind} onChange={(e) => setKind(e.target.value as Post["kind"])} className="input w-auto py-1.5 text-xs">
                <option value="post">Post</option>
                <option value="shoutout">Shoutout</option>
                <option value="announcement">Announcement</option>
                <option value="club">Club news</option>
              </select>
            </div>
            <textarea
              className="input mt-3 min-h-20 resize-y"
              placeholder="Share campus news, lift someone up with a shoutout, or post for your club…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div className="mt-2 flex justify-end">
              <button
                className="btn-gold px-5 py-2 text-sm"
                onClick={() => {
                  if (!body.trim()) return;
                  s.sendPost({ author: s.profile.name || "Anonymous listener", role: s.profile.community, kind, body: body.trim() });
                  setBody("");
                }}
              >
                <Send size={14} /> Publish to the wall
              </button>
            </div>
          </div>

          {/* feed */}
          {s.data.posts.map((p) => (
            <article key={p.id} className="panel p-4 md:p-5">
              <div className="flex items-start gap-3">
                <Avatar name={p.author} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-cream">{p.author}</span>
                    <span className="rounded-full border border-line px-2 py-0.5 text-[9px] text-faint">{p.role}</span>
                    <span className={cx("rounded-full border px-2 py-0.5 font-mono text-[9px] tracking-[0.16em] uppercase", KIND_STYLE[p.kind])}>{p.kind}</span>
                    <span className="ml-auto text-[10px] text-faint">{timeAgo(p.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-cream/90">{p.body}</p>
                  <div className="mt-3 flex items-center gap-4">
                    <button onClick={() => s.likePost(p.id)} className="btn-ghost px-3 py-1.5 text-[11px] font-semibold" aria-label="Like post">
                      <Heart size={13} className="text-rose-400" /> {p.likes}
                    </button>
                    <button
                      onClick={() => setOpenComments(openComments === p.id ? null : p.id)}
                      className="btn-ghost px-3 py-1.5 text-[11px] font-semibold"
                    >
                      <MessageSquare size={13} className="text-gold" /> {p.comments.length}
                    </button>
                  </div>
                  {openComments === p.id && (
                    <div className="mt-3 space-y-2 border-l border-line pl-4">
                      {p.comments.map((c) => (
                        <div key={c.id} className="text-xs">
                          <span className="font-bold text-cream">{c.author}</span> <span className="text-faint">· {timeAgo(c.createdAt)}</span>
                          <div className="text-mist">{c.body}</div>
                        </div>
                      ))}
                      <form
                        className="flex gap-2 pt-1"
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!commentDraft.trim()) return;
                          s.addComment(p.id, commentDraft.trim());
                          setCommentDraft("");
                        }}
                      >
                        <input className="input py-1.5 text-xs" placeholder="Reply…" value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} />
                        <button className="btn-gold px-3 py-1.5" aria-label="Send reply">
                          <Send size={12} />
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="space-y-5">
          {poll && (
            <div className="panel p-5">
              <Micro>Campus poll</Micro>
              <h3 className="mt-1 font-display text-xl font-semibold text-cream">{poll.question}</h3>
              <div className="mt-4 space-y-2.5">
                {poll.options.map((o, i) => {
                  const pct = pollTotal ? Math.round((poll.votes[i] / pollTotal) * 100) : 0;
                  return (
                    <button key={o} onClick={() => s.votePoll(poll.id, i)} className="group block w-full text-left">
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="font-semibold text-cream group-hover:text-gold-soft">{o}</span>
                        <span className="font-mono text-faint">{pct}%</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full border border-line bg-black/40">
                        <div className="h-full rounded-full bg-gradient-to-r from-maroon via-gold to-gold-soft shadow-[0_0_12px_rgba(238,175,61,0.5)]" style={{ width: `${pct}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 text-[10px] text-faint">{pollTotal} votes · closes {timeAgo(poll.closesAt).replace(" ago", "") === "just now" ? "soon" : new Date(poll.closesAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })} · tap to vote</div>
            </div>
          )}

          <div className="panel p-5">
            <Micro className="text-faint">Club spotlights</Micro>
            <div className="mt-3 space-y-3">
              {CLUBS.map((c) => (
                <div key={c.name} className="rounded-xl border border-line bg-black/25 p-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="rounded-lg bg-gold/12 p-2 text-gold">
                      <c.icon size={15} />
                    </span>
                    <div className="text-sm font-bold text-cream">{c.name}</div>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-mist">{c.line}</p>
                  <Micro className="mt-2 text-gold/70">Heard on · {c.on}</Micro>
                </div>
              ))}
            </div>
          </div>

          <div className="panel flex items-start gap-3 p-5">
            <span className="rounded-xl bg-rose-500/12 p-2.5 text-rose-300">
              <Sparkles size={16} />
            </span>
            <div>
              <div className="text-sm font-bold text-cream">Shoutout culture</div>
              <p className="mt-1 text-xs leading-relaxed text-mist">
                Every shoutout published here is read on air during Kansanga Breakfast Run and Night Prep. Kindness is part of the format.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
