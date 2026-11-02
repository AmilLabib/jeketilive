-- Run once in Supabase → SQL Editor.
create table if not exists public.live_sessions (
  id text primary key,                 -- 'showroom:<live_id>' or 'idn:<slug>'
  platform text not null check (platform in ('idn', 'showroom')),
  member_slug text not null,
  member_name text not null,
  title text,
  thumbnail text,
  started_at timestamptz not null,
  last_seen_at timestamptz not null,
  ended_at timestamptz,                -- null while live
  peak_viewers integer not null default 0
);

create index if not exists live_sessions_started_at_idx on public.live_sessions (started_at desc);
create index if not exists live_sessions_member_idx on public.live_sessions (member_slug, started_at desc);
create index if not exists live_sessions_open_idx on public.live_sessions (ended_at) where ended_at is null;

-- Browser reads with the anon key; only the service role (snapshot cron) writes.
alter table public.live_sessions enable row level security;
drop policy if exists "Public read" on public.live_sessions;
create policy "Public read" on public.live_sessions for select using (true);
