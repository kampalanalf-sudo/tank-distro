/** IUEA Community Radio — domain types. Mirrors supabase/schema.sql. */

export type Category = "talk" | "education" | "music" | "culture" | "sport";
export type ViewId = "onair" | "podcasts" | "music" | "schedule" | "community" | "studio" | "settings";

export interface Show {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  category: Category;
  host: string;
  days: number[]; // 0=Sun .. 6=Sat
  startMin: number; // minutes from midnight, EAT
  endMin: number;
  art: string;
  description: string;
}

export interface Episode {
  id: string;
  showId: string;
  title: string;
  blurb: string;
  audioUrl: string;
  durationS: number;
  publishedAt: string; // ISO
  plays: number;
  tags: string[];
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  genre: string;
  durationS: number;
  rotation: "hot" | "warm" | "classic";
  plays: number;
  audioUrl?: string;
}

export interface SongRequest {
  id: string;
  song: string;
  artist: string;
  message: string;
  name: string;
  community: string; // faculty / hall / staff unit
  status: "queued" | "played" | "pending";
  createdAt: string;
  votes: number;
}

export interface PostComment {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface Post {
  id: string;
  author: string;
  role: string; // e.g. "Guild President", "Staff — Library"
  kind: "post" | "shoutout" | "announcement" | "club";
  body: string;
  createdAt: string;
  likes: number;
  comments: PostComment[];
}

export interface Poll {
  id: string;
  question: string;
  options: string[];
  votes: number[];
  closesAt: string;
}

export interface ChatMsg {
  id: string;
  name: string;
  body: string;
  createdAt: string;
  dj?: boolean;
}

export interface NowPlaying {
  kind: "live" | "episode" | "track";
  title: string;
  subtitle: string;
  art: string;
  audioUrl?: string;
  showTitle?: string;
}

export interface StationSettings {
  streamUrl: string;
  frequency: string;
  whatsapp: string;
  instagram: string;
  email: string;
}

export interface ListenerProfile {
  id: string;
  name: string;
  community: string;
}

export interface RadioData {
  shows: Show[];
  episodes: Episode[];
  tracks: Track[];
  requests: SongRequest[];
  posts: Post[];
  polls: Poll[];
  chat: ChatMsg[];
  nowPlaying: NowPlaying;
  settings: StationSettings;
}

export const CATEGORY_LABEL: Record<Category, string> = {
  talk: "Talk",
  education: "Education",
  music: "Music",
  culture: "Culture",
  sport: "Sport",
};
