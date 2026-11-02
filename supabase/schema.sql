-- IUEA Community Radio — shared cloud schema (Supabase).
-- Run in Supabase Dashboard → SQL Editor → Run.
-- Creates the station tables + open prototype policies + realtime publication.
-- Optional: run supabase/seed.sql afterwards (the app also auto-seeds on first connect).

create table if not exists radio_shows (
  id text primary key,
  slug text not null,
  title text not null,
  tagline text,
  category text not null default 'talk',      -- talk | education | music | culture | sport
  host text,
  days int[] not null default '{}',           -- 0=Sun .. 6=Sat
  start_min int not null default 0,           -- EAT minutes from midnight
  end_min int not null default 0,
  art text,
  description text
);

create table if not exists radio_episodes (
  id text primary key,
  show_id text references radio_shows(id) on delete cascade,
  title text not null,
  blurb text,
  audio_url text,
  duration_s int not null default 0,
  published_at timestamptz not null default now(),
  plays int not null default 0,
  tags text[] not null default '{}'
);

create table if not exists radio_tracks (
  id text primary key,
  title text not null,
  artist text not null,
  genre text,
  duration_s int not null default 0,
  rotation text not null default 'warm',      -- hot | warm | classic
  plays int not null default 0,
  audio_url text
);

create table if not exists radio_requests (
  id text primary key,
  song text not null,
  artist text,
  message text,
  name text not null default 'Anonymous',
  community text,
  status text not null default 'queued',      -- pending | queued | played
  created_at timestamptz not null default now(),
  votes int not null default 0
);

create table if not exists radio_posts (
  id text primary key,
  author text not null,
  role text,
  kind text not null default 'post',          -- post | shoutout | announcement | club
  body text not null,
  created_at timestamptz not null default now(),
  likes int not null default 0
);

create table if not exists radio_comments (
  id text primary key,
  post_id text not null references radio_posts(id) on delete cascade,
  author text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists radio_polls (
  id text primary key,
  question text not null,
  options text[] not null,
  votes int[] not null default '{}',
  closes_at timestamptz
);

create table if not exists radio_poll_votes (
  id text primary key,                        -- `${poll_id}:${listener_id}`
  poll_id text not null references radio_polls(id) on delete cascade,
  option_idx int not null,
  listener_id text not null,
  unique (poll_id, listener_id)
);

create table if not exists radio_chat (
  id text primary key,
  name text not null,
  body text not null,
  created_at timestamptz not null default now(),
  dj boolean not null default false
);

create table if not exists radio_now_playing (
  id int primary key default 1,
  kind text not null default 'live',          -- live | episode | track
  title text not null,
  subtitle text,
  art text,
  audio_url text,
  show_title text,
  updated_at timestamptz not null default now()
);

create table if not exists radio_settings (
  id int primary key default 1,
  stream_url text,
  frequency text,
  whatsapp text,
  instagram text,
  email text
);

create table if not exists radio_listeners (
  id text primary key,
  name text,
  community text,
  last_seen timestamptz not null default now()
);

create index if not exists radio_episodes_show_idx on radio_episodes(show_id);
create index if not exists radio_comments_post_idx on radio_comments(post_id);
create index if not exists radio_requests_created_idx on radio_requests(created_at desc);
create index if not exists radio_posts_created_idx on radio_posts(created_at desc);
create index if not exists radio_chat_created_idx on radio_chat(created_at desc);
create index if not exists radio_listeners_seen_idx on radio_listeners(last_seen desc);

-- Open prototype policies: one shared campus backend (tighten for production).
do $$
declare t text;
begin
  foreach t in array array['radio_shows','radio_episodes','radio_tracks','radio_requests','radio_posts','radio_comments','radio_polls','radio_poll_votes','radio_chat','radio_now_playing','radio_settings','radio_listeners']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists open_all on %I', t);
    execute format('create policy open_all on %I for all using (true) with check (true)', t);
  end loop;
end $$;

-- Realtime: the shout wall, now-playing and every social table go live.
do $$
declare t text;
begin
  foreach t in array array['radio_posts','radio_comments','radio_polls','radio_poll_votes','radio_chat','radio_now_playing','radio_requests','radio_settings','radio_tracks','radio_episodes','radio_shows']
  loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
