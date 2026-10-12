# IUEA Community Radio 🎙️

**The voice of Kansanga.** A radio station for the students and staff of
**International University of East Africa (IUEA)** — Plot 1112/1121 Kansanga, Ggaba Road,
Kampala, Uganda. Education *and* entertainment: podcasts, music and the social heartbeat of
campus, streamed worldwide. Classy, glossy, maroon & gold.

> Brand: IUEA maroon `#7A0000`, tulip gold `#EEAF3D`, black. Official crest & wordmark of
> IUEA (motto: *“Learning to Succeed”*) composited over original glossy studio artwork.

---

## What the station does

| Section | What listeners & presenters get |
| --- | --- |
| **On Air** | Live player with real spectrum visualizer, live show detection from the schedule (EAT), listener count, and the **shout wall** (live chat with studio messages). |
| **Podcasts** | Five shows with generated glossy cover art and real spoken episodes: *Kansanga Breakfast Run*, *The Syllabus* (study-skills hour), *Ggaba Road Grooves*, *Night Prep*, *Guild Square*. |
| **Music** | Hot / warm / classic rotation (Ugandan hits + campus artists), **request line** with dedications and community voting, played/queued status for the studio. |
| **Schedule** | Weekly broadcast grid in East Africa Time with a live “on air now” line and today highlight. |
| **Community** | Social wall (posts, shoutouts, announcements, club news) with likes + comments, campus **polls**, club spotlights — the social concept of the station. |
| **Studio** | Presenter console: go live, play episodes/tracks, clear the request queue, publish as Studio, talk to the shout wall. |
| **Settings** | Listener profile, **Supabase** connection, live stream URL, station contacts, and the downloadable **brand & artwork kit**. |

### Audio sources (never silent)
1. **Real stream** — set any Icecast / Zeno.fm / Radio.co URL in Settings (or `VITE_STREAM_URL`).
2. **On demand** — podcast episodes & licensed tracks (four spoken episodes ship in `public/audio/`).
3. **Studio demo bed** — a built-in WebAudio Afro-soul mix (chords, kick, shaker, bass, pluck)
   used automatically until a stream exists, so the station always transmits something beautiful.

Everything routes through one `AnalyserNode`, so the gold visualizer is always truthful.

## Shared cloud — Supabase (all listeners, one backend)

1. Create a free project at [supabase.com](https://supabase.com) → copy **Project URL** + **anon public key**.
2. SQL Editor → run **`supabase/schema.sql`** (12 tables, open prototype RLS policies, realtime publication).
3. Optional: run **`supabase/seed.sql`** — or just connect: the app **auto-seeds an empty project** on first connect.
4. In the app → **Settings → Shared cloud** → paste URL + key → **Connect**.
   From then on: now-playing, shout wall, requests, posts, polls and listener presence sync live
   across every device via Supabase **Realtime** (postgres_changes).
5. Hosted deploys can pre-configure with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (see `.env.example`).

Without Supabase the app is fully functional **local-first**; the cloud simply makes the whole
campus share one station brain.

## GitHub

- **CI** (`.github/workflows/ci.yml`): typecheck + build on every push/PR, `dist/` as artifact.
- **GitHub Pages** (`.github/workflows/deploy-pages.yml`): publishes the single-file build on push to `main` / `arena/**`.
- Host anywhere static: Vercel/Netlify import → framework **Vite** → build `npm run build`, output `dist`.

## Artwork & brand kit

All artwork composites the **actual IUEA crest/wordmark** over original glossy studio art
(generated backdrops + ImageMagick compositing), in `public/art/`:

- `station-cover.png` 1600×1600 — podcast-feed cover
- `social-banner.png` 1600×900 — social header
- `show-*.png` 1000×1000 — per-show covers (breakfast, syllabus, grooves, night, guild)
- `bg-*.jpg` — glossy backdrop masters
- `public/brand/` — official logo (transparent), crest, app icons, favicon

Downloadables are linked in-app under **Settings → Brand & artwork kit**.
Brand source reference: `docs/brand-source/`.

## Development

```bash
npm install
npm run dev        # studio at http://localhost:5173
npm run typecheck
npm run build      # single-file dist/index.html (works from GitHub Pages sub-paths)
```

Stack: React 19 · Vite 7 · Tailwind CSS 4 · motion · lucide · @supabase/supabase-js.
Typefaces: Playfair Display (display serif), Manrope (UI), IBM Plex Mono (studio meta).

## Campus care

- Shoutouts are read on air; kindness is part of the format.
- Requests credit the requester’s hall/faculty/unit.
- The RLS policies are open prototype policies for one shared campus backend — tighten them
  (authenticated students/staff) before going to production with real personal data.

**Learning to Succeed — on air, online, on campus.** 🇺🇬
