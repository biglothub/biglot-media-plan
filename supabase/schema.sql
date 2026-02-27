create extension if not exists "pgcrypto";

create table if not exists public.idea_backlog (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  platform text not null check (platform in ('youtube', 'facebook', 'instagram', 'tiktok')),
  title text,
  description text,
  author_name text,
  thumbnail_url text,
  published_at timestamptz,
  view_count bigint,
  like_count bigint,
  comment_count bigint,
  share_count bigint,
  save_count bigint,
  notes text,
  status text not null default 'new',
  engagement_json jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_idea_backlog_created_at on public.idea_backlog (created_at desc);
create index if not exists idx_idea_backlog_platform on public.idea_backlog (platform);

alter table public.idea_backlog enable row level security;

drop policy if exists "public read backlog" on public.idea_backlog;
create policy "public read backlog"
on public.idea_backlog
for select
using (true);

drop policy if exists "public insert backlog" on public.idea_backlog;
create policy "public insert backlog"
on public.idea_backlog
for insert
with check (true);

drop policy if exists "public update backlog" on public.idea_backlog;
create policy "public update backlog"
on public.idea_backlog
for update
using (true)
with check (true);
