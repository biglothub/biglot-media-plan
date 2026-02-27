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

drop policy if exists "public delete backlog" on public.idea_backlog;
create policy "public delete backlog"
on public.idea_backlog
for delete
using (true);

create table if not exists public.production_calendar (
  id uuid primary key default gen_random_uuid(),
  backlog_id uuid not null references public.idea_backlog(id) on delete cascade,
  shoot_date date not null,
  status text not null default 'planned',
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists ux_production_calendar_backlog on public.production_calendar (backlog_id);
create index if not exists idx_production_calendar_shoot_date on public.production_calendar (shoot_date);

alter table public.production_calendar enable row level security;

drop policy if exists "public read calendar" on public.production_calendar;
create policy "public read calendar"
on public.production_calendar
for select
using (true);

drop policy if exists "public insert calendar" on public.production_calendar;
create policy "public insert calendar"
on public.production_calendar
for insert
with check (true);

drop policy if exists "public update calendar" on public.production_calendar;
create policy "public update calendar"
on public.production_calendar
for update
using (true)
with check (true);

drop policy if exists "public delete calendar" on public.production_calendar;
create policy "public delete calendar"
on public.production_calendar
for delete
using (true);
