import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { engine } from "./audio";
import { SEED } from "./seed";
import * as cloud from "./supabase";
import type { ChatMsg, Episode, ListenerProfile, NowPlaying, Post, RadioData, SongRequest, StationSettings, Track, ViewId } from "./types";

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
const LS_PROFILE = "iuea-cr-profile";
const LS_CLOUD = "iuea-cr-cloud";
const LS_VOL = "iuea-cr-volume";

export type CloudStatus = "off" | "connecting" | "ok" | "error";

interface Store {
  view: ViewId;
  setView: (v: ViewId) => void;
  data: RadioData;
  profile: ListenerProfile;
  setProfile: (p: ListenerProfile) => void;
  cloudUrl: string;
  cloudKey: string;
  cloudStatus: CloudStatus;
  cloudMessage: string;
  configure: (url: string, key: string) => Promise<void>;
  disconnect: () => void;
  testCloud: (url: string, key: string) => Promise<{ ok: boolean; message: string }>;
  listeners: number;
  playing: boolean;
  mode: string;
  volume: number;
  setVolume: (v: number) => void;
  toggle: () => void;
  play: (np: NowPlaying) => void;
  playEpisode: (e: Episode) => void;
  playTrack: (t: Track) => void;
  goLive: (showTitle?: string) => void;
  sendRequest: (r: Omit<SongRequest, "id" | "createdAt" | "status" | "votes">) => void;
  voteRequest: (id: string) => void;
  markRequest: (id: string, status: SongRequest["status"]) => void;
  sendPost: (p: Omit<Post, "id" | "createdAt" | "likes" | "comments">) => void;
  likePost: (id: string) => void;
  addComment: (postId: string, body: string) => void;
  votePoll: (pollId: string, idx: number) => void;
  sendChat: (body: string, dj?: boolean) => void;
  setNowPlaying: (np: NowPlaying) => void;
  saveSettings: (s: StationSettings) => void;
}

const Ctx = createContext<Store | null>(null);

export function useApp(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useApp outside provider");
  return s;
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, v: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* private mode */
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<ViewId>("onair");
  const [data, setData] = useState<RadioData>(SEED);
  const [profile, setProfileState] = useState<ListenerProfile>(() =>
    load(LS_PROFILE, { id: uid(), name: "", community: "Student — IUEA" }),
  );
  const [creds, setCreds] = useState<{ url: string; key: string }>(() =>
    load(LS_CLOUD, {
      url: (import.meta.env.VITE_SUPABASE_URL as string) || "",
      key: (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || "",
    }),
  );
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>("off");
  const [cloudMessage, setCloudMessage] = useState("");
  const [listeners, setListeners] = useState(127);
  const [playing, setPlaying] = useState(false);
  const [mode, setMode] = useState<string>("idle");
  const [volume, setVolumeState] = useState<number>(() => load(LS_VOL, 0.8));
  const reloadRef = useRef<() => void>(() => undefined);

  const configured = cloud.isConfigured(creds.url, creds.key);

  /* engine ↔ react */
  useEffect(() => {
    engine.onState = () => {
      setPlaying(engine.playing);
      setMode(engine.mode);
    };
    engine.setVolume(volume);
    return () => {
      engine.onState = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* lock-screen / media-key metadata + live tab title */
  useEffect(() => {
    const np = data.nowPlaying;
    document.title = `${playing ? "▶ " : ""}${np.title} — IUEA Community Radio`;
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: np.title,
          artist: np.subtitle,
          album: "IUEA Community Radio · Kampala",
          artwork: [{ src: new URL(np.art, window.location.href).href, sizes: "1600x1600", type: "image/png" }],
        });
      } catch {
        /* older browsers */
      }
    }
  }, [data.nowPlaying, playing]);

  const toggleRef = useRef<() => void>(() => undefined);
  useEffect(() => {
    toggleRef.current = () => {
      if (engine.playing) engine.pause();
      else void engine.play(data.nowPlaying, data.settings.streamUrl || ((import.meta.env.VITE_STREAM_URL as string) ?? ""));
    };
  }, [data.nowPlaying, data.settings.streamUrl]);
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const toggle = () => toggleRef.current();
    navigator.mediaSession.setActionHandler("play", toggle);
    navigator.mediaSession.setActionHandler("pause", toggle);
    navigator.mediaSession.setActionHandler("stop", () => engine.pause());
    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("stop", null);
    };
  }, []);

  /* cloud connect + realtime */
  useEffect(() => {
    let unsub: (() => void) | null = null;
    let alive = true;
    if (!configured) {
      setCloudStatus("off");
      setCloudMessage("Local-first mode — connect Supabase in Settings to sync the whole campus.");
      return () => undefined;
    }
    setCloudStatus("connecting");
    (async () => {
      try {
        await cloud.bootstrapIfEmpty(creds.url, creds.key);
        const d = await cloud.loadAll(creds.url, creds.key);
        if (!alive) return;
        setData(d);
        setCloudStatus("ok");
        setCloudMessage("Shared cloud connected — one backend for every listener.");
        let t = 0;
        unsub = cloud.subscribe(creds.url, creds.key, () => {
          window.clearTimeout(t);
          t = window.setTimeout(() => {
            reloadRef.current();
          }, 700);
        });
      } catch (e) {
        if (!alive) return;
        setCloudStatus("error");
        setCloudMessage(`Cloud error: ${(e as Error).message}`);
      }
    })();
    return () => {
      alive = false;
      unsub?.();
    };
  }, [creds, configured]);

  const reload = useCallback(() => {
    if (!cloud.isConfigured(creds.url, creds.key)) return;
    cloud
      .loadAll(creds.url, creds.key)
      .then(setData)
      .catch(() => undefined);
  }, [creds]);
  useEffect(() => {
    reloadRef.current = reload;
  }, [reload]);

  /* listener presence: real heartbeat when cloud is on, warm simulation otherwise */
  useEffect(() => {
    const tick = async () => {
      if (configured && cloudStatus === "ok") {
        const n = await cloud.heartbeat(creds.url, creds.key, profile);
        if (n > 0) setListeners(n);
      } else {
        const base = 118 + Math.round(26 * Math.sin(Date.now() / 420000));
        setListeners(base + (playing ? 9 : 0) + (view === "onair" ? 4 : 0));
      }
    };
    tick();
    const iv = window.setInterval(tick, 40000);
    return () => window.clearInterval(iv);
  }, [configured, cloudStatus, creds, profile, playing, view]);

  const streamUrl = data.settings.streamUrl || ((import.meta.env.VITE_STREAM_URL as string) ?? "");

  const api = useMemo<Store>(() => {
    const mutate = (fn: (d: RadioData) => RadioData) => setData((d) => fn(d));
    const cloudOn = () => configured && cloudStatus === "ok";

    const play = (np: NowPlaying) => {
      mutate((d) => ({ ...d, nowPlaying: np }));
      if (cloudOn()) cloud.writeNowPlaying(creds.url, creds.key, np);
      void engine.play(np, streamUrl);
    };

    return {
      view,
      setView,
      data,
      profile,
      setProfile: (p) => {
        setProfileState(p);
        save(LS_PROFILE, p);
      },
      cloudUrl: creds.url,
      cloudKey: creds.key,
      cloudStatus,
      cloudMessage,
      configure: async (url, key) => {
        save(LS_CLOUD, { url, key });
        setCreds({ url, key });
      },
      disconnect: () => {
        save(LS_CLOUD, { url: "", key: "" });
        setCreds({ url: "", key: "" });
        setData(SEED);
      },
      testCloud: cloud.testConnection,
      listeners,
      playing,
      mode,
      volume,
      setVolume: (v) => {
        setVolumeState(v);
        save(LS_VOL, v);
        engine.setVolume(v);
      },
      toggle: () => {
        if (engine.playing) engine.pause();
        else void engine.play(data.nowPlaying, streamUrl);
      },
      play,
      playEpisode: (e) => {
        const showTitle = data.shows.find((s) => s.id === e.showId)?.title;
        play({ kind: "episode", title: e.title, subtitle: showTitle ?? "IUEA Community Radio", art: "./art/station-cover.png", audioUrl: e.audioUrl, showTitle });
        mutate((d) => ({ ...d, episodes: d.episodes.map((x) => (x.id === e.id ? { ...x, plays: x.plays + 1 } : x)) }));
      },
      playTrack: (t) => {
        play({ kind: "track", title: t.title, subtitle: t.artist, art: "./art/show-grooves.png", audioUrl: t.audioUrl, showTitle: "Ggaba Road Grooves" });
      },
      goLive: (showTitle) => {
        play({
          kind: "live",
          title: showTitle ?? "IUEA Community Radio",
          subtitle: streamUrl ? "Live broadcast — Kansanga studio" : "Live studio session — demo mix",
          art: "./art/station-cover.png",
          showTitle,
        });
      },
      sendRequest: (r) => {
        const req: SongRequest = { ...r, id: uid(), createdAt: new Date().toISOString(), status: "queued", votes: 0 };
        mutate((d) => ({ ...d, requests: [req, ...d.requests] }));
        if (cloudOn()) cloud.writeRequest(creds.url, creds.key, req);
      },
      voteRequest: (id) => {
        mutate((d) => ({ ...d, requests: d.requests.map((r) => (r.id === id ? { ...r, votes: r.votes + 1 } : r)) }));
        const cur = data.requests.find((r) => r.id === id);
        if (cloudOn() && cur) cloud.updateRequest(creds.url, creds.key, id, { votes: cur.votes + 1 });
      },
      markRequest: (id, status) => {
        mutate((d) => ({ ...d, requests: d.requests.map((r) => (r.id === id ? { ...r, status } : r)) }));
        if (cloudOn()) cloud.updateRequest(creds.url, creds.key, id, { status });
      },
      sendPost: (p) => {
        const post: Post = { ...p, id: uid(), createdAt: new Date().toISOString(), likes: 0, comments: [] };
        mutate((d) => ({ ...d, posts: [post, ...d.posts] }));
        if (cloudOn()) cloud.writePost(creds.url, creds.key, post);
      },
      likePost: (id) => {
        mutate((d) => ({ ...d, posts: d.posts.map((p) => (p.id === id ? { ...p, likes: p.likes + 1 } : p)) }));
        const cur = data.posts.find((p) => p.id === id);
        if (cloudOn() && cur) cloud.updatePost(creds.url, creds.key, id, { likes: cur.likes + 1 });
      },
      addComment: (postId, body) => {
        const c = { id: uid(), author: profile.name || "Listener", body, createdAt: new Date().toISOString() };
        mutate((d) => ({ ...d, posts: d.posts.map((p) => (p.id === postId ? { ...p, comments: [...p.comments, c] } : p)) }));
        if (cloudOn()) cloud.writeComment(creds.url, creds.key, postId, c);
      },
      votePoll: (pollId, idx) => {
        mutate((d) => ({
          ...d,
          polls: d.polls.map((p) => (p.id === pollId ? { ...p, votes: p.votes.map((v, i) => (i === idx ? v + 1 : v)) } : p)),
        }));
        const cur = data.polls.find((p) => p.id === pollId);
        if (cloudOn() && cur) cloud.votePoll(creds.url, creds.key, pollId, idx, profile.id, cur.votes.map((v, i) => (i === idx ? v + 1 : v)));
      },
      sendChat: (body, dj) => {
        const m: ChatMsg = { id: uid(), name: dj ? "Studio" : profile.name || "Listener", body, createdAt: new Date().toISOString(), dj };
        mutate((d) => ({ ...d, chat: [...d.chat, m].slice(-120) }));
        if (cloudOn()) cloud.writeChat(creds.url, creds.key, m);
      },
      setNowPlaying: (np) => {
        mutate((d) => ({ ...d, nowPlaying: np }));
        if (cloudOn()) cloud.writeNowPlaying(creds.url, creds.key, np);
      },
      saveSettings: (s) => {
        mutate((d) => ({ ...d, settings: s }));
        if (cloudOn()) cloud.writeSettings(creds.url, creds.key, s);
      },
    };
  }, [view, data, profile, creds, cloudStatus, cloudMessage, listeners, playing, mode, volume, configured, streamUrl]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
