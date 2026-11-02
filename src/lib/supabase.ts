/**
 * IUEA Community Radio — shared cloud (Supabase).
 * Tables: radio_shows, radio_episodes, radio_tracks, radio_requests, radio_posts,
 * radio_comments, radio_polls, radio_poll_votes, radio_chat, radio_now_playing,
 * radio_settings, radio_listeners  (see supabase/schema.sql).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ChatMsg, Episode, NowPlaying, Poll, Post, RadioData, Show, SongRequest, StationSettings, Track } from "./types";
import { SEED } from "./seed";

type Row = Record<string, any>;

let client: SupabaseClient | null = null;
let clientKey = "";

export function isConfigured(url: string, key: string): boolean {
  return /^https?:\/\//.test(url || "") && (key || "").length > 20;
}

export function getClient(url: string, key: string): SupabaseClient | null {
  if (!isConfigured(url, key)) return null;
  const k = `${url}|${key}`;
  if (client && clientKey === k) return client;
  try {
    client = createClient(url, key, { auth: { persistSession: false } });
    clientKey = k;
    return client;
  } catch {
    return null;
  }
}

export async function testConnection(url: string, key: string): Promise<{ ok: boolean; message: string }> {
  const c = getClient(url, key);
  if (!c) return { ok: false, message: "Enter both the Project URL and the anon public key." };
  const { error } = await c.from("radio_shows").select("id", { count: "exact", head: true });
  if (error) return { ok: false, message: `Connection failed: ${error.message}` };
  return { ok: true, message: "Connected — radio_shows reachable." };
}

/* ---------------------------------- readers --------------------------------- */

const show = (r: Row): Show => ({
  id: String(r.id), slug: String(r.slug), title: String(r.title), tagline: String(r.tagline ?? ""),
  category: r.category, host: String(r.host ?? ""), days: (r.days ?? []) as number[],
  startMin: Number(r.start_min), endMin: Number(r.end_min), art: String(r.art ?? "./art/station-cover.png"),
  description: String(r.description ?? ""),
});
const episode = (r: Row): Episode => ({
  id: String(r.id), showId: String(r.show_id), title: String(r.title), blurb: String(r.blurb ?? ""),
  audioUrl: String(r.audio_url ?? ""), durationS: Number(r.duration_s ?? 0),
  publishedAt: String(r.published_at ?? new Date().toISOString()), plays: Number(r.plays ?? 0),
  tags: (r.tags ?? []) as string[],
});
const track = (r: Row): Track => ({
  id: String(r.id), title: String(r.title), artist: String(r.artist), genre: String(r.genre ?? ""),
  durationS: Number(r.duration_s ?? 0), rotation: r.rotation, plays: Number(r.plays ?? 0),
  audioUrl: r.audio_url ? String(r.audio_url) : undefined,
});
const request = (r: Row): SongRequest => ({
  id: String(r.id), song: String(r.song), artist: String(r.artist ?? ""), message: String(r.message ?? ""),
  name: String(r.name ?? "Anonymous"), community: String(r.community ?? ""), status: r.status,
  createdAt: String(r.created_at), votes: Number(r.votes ?? 0),
});
const post = (r: Row, comments: Row[]): Post => ({
  id: String(r.id), author: String(r.author), role: String(r.role ?? ""), kind: r.kind,
  body: String(r.body), createdAt: String(r.created_at), likes: Number(r.likes ?? 0),
  comments: comments
    .filter((c) => String(c.post_id) === String(r.id))
    .map((c) => ({ id: String(c.id), author: String(c.author), body: String(c.body), createdAt: String(c.created_at) }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
});
const poll = (r: Row): Poll => ({
  id: String(r.id), question: String(r.question), options: (r.options ?? []) as string[],
  votes: ((r.votes ?? []) as number[]).map(Number), closesAt: String(r.closes_at),
});
const chat = (r: Row): ChatMsg => ({
  id: String(r.id), name: String(r.name), body: String(r.body), createdAt: String(r.created_at), dj: Boolean(r.dj),
});

export async function loadAll(url: string, key: string): Promise<RadioData> {
  const c = getClient(url, key);
  if (!c) throw new Error("not configured");
  const [shows, eps, trs, reqs, posts, cms, polls, chats, np, st] = await Promise.all([
    c.from("radio_shows").select("*"),
    c.from("radio_episodes").select("*"),
    c.from("radio_tracks").select("*"),
    c.from("radio_requests").select("*").order("created_at", { ascending: false }),
    c.from("radio_posts").select("*").order("created_at", { ascending: false }),
    c.from("radio_comments").select("*"),
    c.from("radio_polls").select("*"),
    c.from("radio_chat").select("*").order("created_at", { ascending: false }).limit(120),
    c.from("radio_now_playing").select("*").eq("id", 1).maybeSingle(),
    c.from("radio_settings").select("*").eq("id", 1).maybeSingle(),
  ]);
  for (const r of [shows, eps, trs, reqs, posts, cms, polls, chats]) {
    if (r.error) throw new Error(r.error.message);
  }
  const data: RadioData = {
    shows: (shows.data ?? []).map(show),
    episodes: (eps.data ?? []).map(episode).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
    tracks: (trs.data ?? []).map(track),
    requests: (reqs.data ?? []).map(request),
    posts: (posts.data ?? []).map((p) => post(p, (cms.data ?? []) as Row[])),
    polls: (polls.data ?? []).map(poll),
    chat: (chats.data ?? []).map(chat).reverse(),
    nowPlaying: np.data
      ? {
          kind: np.data.kind, title: String(np.data.title), subtitle: String(np.data.subtitle ?? ""),
          art: String(np.data.art ?? "./art/station-cover.png"),
          audioUrl: np.data.audio_url ? String(np.data.audio_url) : undefined,
          showTitle: np.data.show_title ? String(np.data.show_title) : undefined,
        }
      : SEED.nowPlaying,
    settings: st.data
      ? {
          streamUrl: String(st.data.stream_url ?? ""), frequency: String(st.data.frequency ?? SEED.settings.frequency),
          whatsapp: String(st.data.whatsapp ?? ""), instagram: String(st.data.instagram ?? ""), email: String(st.data.email ?? ""),
        }
      : SEED.settings,
  };
  return data;
}

/** First-run bootstrap: if the cloud is empty, seed it with the station pack. */
export async function bootstrapIfEmpty(url: string, key: string): Promise<void> {
  const c = getClient(url, key);
  if (!c) return;
  const { count } = await c.from("radio_shows").select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0) return;
  await c.from("radio_shows").insert(
    SEED.shows.map((s) => ({
      id: s.id, slug: s.slug, title: s.title, tagline: s.tagline, category: s.category, host: s.host,
      days: s.days, start_min: s.startMin, end_min: s.endMin, art: s.art, description: s.description,
    })),
  );
  await c.from("radio_episodes").insert(
    SEED.episodes.map((e) => ({
      id: e.id, show_id: e.showId, title: e.title, blurb: e.blurb, audio_url: e.audioUrl,
      duration_s: e.durationS, published_at: e.publishedAt, plays: e.plays, tags: e.tags,
    })),
  );
  await c.from("radio_tracks").insert(
    SEED.tracks.map((t) => ({
      id: t.id, title: t.title, artist: t.artist, genre: t.genre, duration_s: t.durationS,
      rotation: t.rotation, plays: t.plays, audio_url: t.audioUrl ?? null,
    })),
  );
  await c.from("radio_requests").insert(
    SEED.requests.map((r) => ({
      id: r.id, song: r.song, artist: r.artist, message: r.message, name: r.name,
      community: r.community, status: r.status, created_at: r.createdAt, votes: r.votes,
    })),
  );
  await c.from("radio_posts").insert(
    SEED.posts.map((p) => ({ id: p.id, author: p.author, role: p.role, kind: p.kind, body: p.body, created_at: p.createdAt, likes: p.likes })),
  );
  const comments = SEED.posts.flatMap((p) => p.comments.map((cm) => ({ id: cm.id, post_id: p.id, author: cm.author, body: cm.body, created_at: cm.createdAt })));
  if (comments.length) await c.from("radio_comments").insert(comments);
  await c.from("radio_polls").insert(
    SEED.polls.map((p) => ({ id: p.id, question: p.question, options: p.options, votes: p.votes, closes_at: p.closesAt })),
  );
  await c.from("radio_chat").insert(
    SEED.chat.map((m) => ({ id: m.id, name: m.name, body: m.body, created_at: m.createdAt, dj: m.dj ?? false })),
  );
  await c.from("radio_settings").upsert({
    id: 1, stream_url: SEED.settings.streamUrl, frequency: SEED.settings.frequency,
    whatsapp: SEED.settings.whatsapp, instagram: SEED.settings.instagram, email: SEED.settings.email,
  });
}

/* ---------------------------------- writers --------------------------------- */

export async function writeNowPlaying(url: string, key: string, np: NowPlaying): Promise<void> {
  const c = getClient(url, key);
  if (!c) return;
  await c.from("radio_now_playing").upsert({
    id: 1, kind: np.kind, title: np.title, subtitle: np.subtitle, art: np.art,
    audio_url: np.audioUrl ?? null, show_title: np.showTitle ?? null, updated_at: new Date().toISOString(),
  });
}

export async function writeSettings(url: string, key: string, s: StationSettings): Promise<void> {
  const c = getClient(url, key);
  if (!c) return;
  await c.from("radio_settings").upsert({
    id: 1, stream_url: s.streamUrl, frequency: s.frequency, whatsapp: s.whatsapp, instagram: s.instagram, email: s.email,
  });
}

export async function writeRequest(url: string, key: string, r: SongRequest): Promise<void> {
  const c = getClient(url, key);
  if (!c) return;
  await c.from("radio_requests").insert({
    id: r.id, song: r.song, artist: r.artist, message: r.message, name: r.name,
    community: r.community, status: r.status, created_at: r.createdAt, votes: r.votes,
  });
}

export async function updateRequest(url: string, key: string, id: string, patch: { status?: string; votes?: number }): Promise<void> {
  const c = getClient(url, key);
  if (!c) return;
  await c.from("radio_requests").update(patch).eq("id", id);
}

export async function writePost(url: string, key: string, p: Post): Promise<void> {
  const c = getClient(url, key);
  if (!c) return;
  await c.from("radio_posts").insert({ id: p.id, author: p.author, role: p.role, kind: p.kind, body: p.body, created_at: p.createdAt, likes: p.likes });
}

export async function updatePost(url: string, key: string, id: string, patch: { likes?: number }): Promise<void> {
  const c = getClient(url, key);
  if (!c) return;
  await c.from("radio_posts").update(patch).eq("id", id);
}

export async function writeComment(url: string, key: string, postId: string, c2: { id: string; author: string; body: string; createdAt: string }): Promise<void> {
  const c = getClient(url, key);
  if (!c) return;
  await c.from("radio_comments").insert({ id: c2.id, post_id: postId, author: c2.author, body: c2.body, created_at: c2.createdAt });
}

export async function votePoll(url: string, key: string, pollId: string, optionIdx: number, listenerId: string, votes: number[]): Promise<void> {
  const c = getClient(url, key);
  if (!c) return;
  const { error } = await c.from("radio_poll_votes").insert({ id: `${pollId}:${listenerId}`, poll_id: pollId, option_idx: optionIdx, listener_id: listenerId });
  if (error) return; // already voted
  await c.from("radio_polls").update({ votes }).eq("id", pollId);
}

export async function writeChat(url: string, key: string, m: ChatMsg): Promise<void> {
  const c = getClient(url, key);
  if (!c) return;
  await c.from("radio_chat").insert({ id: m.id, name: m.name, body: m.body, created_at: m.createdAt, dj: m.dj ?? false });
}

export async function heartbeat(url: string, key: string, profile: { id: string; name: string; community: string }): Promise<number> {
  const c = getClient(url, key);
  if (!c) return 0;
  await c.from("radio_listeners").upsert({ id: profile.id, name: profile.name, community: profile.community, last_seen: new Date().toISOString() }, { onConflict: "id" });
  const cutoff = new Date(Date.now() - 120000).toISOString();
  const { count } = await c.from("radio_listeners").select("id", { count: "exact", head: true }).gte("last_seen", cutoff);
  return count ?? 0;
}

/* --------------------------------- realtime --------------------------------- */

const RT_TABLES = [
  "radio_shows", "radio_episodes", "radio_tracks", "radio_requests",
  "radio_posts", "radio_comments", "radio_polls", "radio_poll_votes",
  "radio_chat", "radio_now_playing", "radio_settings",
];

export function subscribe(url: string, key: string, onChange: () => void): (() => void) | null {
  const c = getClient(url, key);
  if (!c) return null;
  let ch = c.channel("iuea-radio-live");
  for (const t of RT_TABLES) {
    ch = ch.on("postgres_changes", { event: "*", schema: "public", table: t }, onChange);
  }
  ch.subscribe();
  return () => {
    c.removeChannel(ch).catch(() => undefined);
  };
}
