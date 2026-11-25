-- COG-3: M1 tables for Daily Discipline, with row level security (RLS).
-- Run this once in the Supabase dashboard: SQL Editor > New query > paste > Run.
-- Out of scope: everything for CBT / Mind.

-- =====================================================================
-- Tables
-- =====================================================================

-- A daily task the user wants to do.
create table public.disciplines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  points integer not null default 0 check (points >= 0),
  time_block text not null default 'anytime'
    check (time_block in ('morning', 'afternoon', 'evening', 'anytime')),
  -- Archive instead of delete: an archived task leaves Today but keeps its history.
  is_active boolean not null default true,
  archived_at timestamptz, -- filled by a trigger below
  created_at timestamptz not null default now(),
  -- Lets discipline_logs prove that a task belongs to the same user (see foreign key below).
  unique (id, user_id)
);

-- One row per task per day it was completed. Undo a check-in = delete the row.
create table public.discipline_logs (
  id uuid primary key default gen_random_uuid(),
  discipline_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- The user's local calendar date, sent by the app (not UTC).
  completed_date date not null,
  -- The next three columns are copies of the task as it was at check-in time.
  -- A trigger fills them, so later edits to the task never change history
  -- and the app cannot send fake values.
  title text not null,
  time_block text not null check (time_block in ('morning', 'afternoon', 'evening', 'anytime')),
  points_earned integer not null check (points_earned >= 0),
  created_at timestamptz not null default now(),
  -- One check-in per task per day.
  unique (discipline_id, completed_date),
  -- The task must belong to the same user. No "on delete" rule means: a task that
  -- has check-ins cannot be deleted. Archive it instead.
  foreign key (discipline_id, user_id) references public.disciplines (id, user_id)
);

-- A reward the user bought for themselves with points.
create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  description text not null,
  points_spent integer not null check (points_spent >= 0),
  -- Path inside the private "reward-photos" bucket: <user_id>/<file name>.
  photo_path text,
  -- "How does this show my love for myself?" (turned into a star in Milestone 3).
  reflection text,
  created_at timestamptz not null default now(),
  check (photo_path is null or photo_path like (user_id::text || '/%'))
);

-- One row per user.
create table public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  -- Points per 1 currency unit.
  exchange_rate numeric not null default 10 check (exchange_rate > 0)
);

-- =====================================================================
-- Triggers (functions that run automatically when rows change)
-- =====================================================================

-- Keep archived_at in step with is_active.
create function public.set_archived_at()
returns trigger
language plpgsql
as $$
begin
  if new.is_active then
    new.archived_at := null;
  elsif new.archived_at is null then
    new.archived_at := now();
  end if;
  return new;
end;
$$;

create trigger disciplines_set_archived_at
  before insert or update on public.disciplines
  for each row execute function public.set_archived_at();

-- Copy title, time_block and points from the task into the check-in row.
create function public.copy_discipline_snapshot()
returns trigger
language plpgsql
as $$
begin
  select d.title, d.time_block, d.points
    into new.title, new.time_block, new.points_earned
    from public.disciplines d
    where d.id = new.discipline_id and d.user_id = new.user_id;
  if not found then
    raise exception 'Task not found.';
  end if;
  return new;
end;
$$;

create trigger discipline_logs_copy_snapshot
  before insert on public.discipline_logs
  for each row execute function public.copy_discipline_snapshot();

-- Give every new user a settings row (exchange rate 10).
create function public.create_user_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_settings (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_user_settings();

-- Settings rows for users who signed up before this migration.
insert into public.user_settings (user_id)
select id from auth.users
on conflict do nothing;

-- =====================================================================
-- Row level security: a user can only touch rows where user_id = auth.uid()
-- =====================================================================

alter table public.disciplines enable row level security;
alter table public.discipline_logs enable row level security;
alter table public.rewards enable row level security;
alter table public.user_settings enable row level security;

-- Only logged-in users get access at all. The anon role gets nothing.
-- discipline_logs has no update: a check-in is never edited, only added or undone.
revoke all on public.disciplines, public.discipline_logs, public.rewards, public.user_settings
  from anon, authenticated;
grant select, insert, update, delete on public.disciplines to authenticated;
grant select, insert, delete on public.discipline_logs to authenticated;
grant select, insert, update, delete on public.rewards to authenticated;
grant select, insert, update, delete on public.user_settings to authenticated;

-- disciplines
create policy "disciplines: select own" on public.disciplines
  for select to authenticated using (user_id = (select auth.uid()));
create policy "disciplines: insert own" on public.disciplines
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "disciplines: update own" on public.disciplines
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "disciplines: delete own" on public.disciplines
  for delete to authenticated using (user_id = (select auth.uid()));

-- discipline_logs
create policy "discipline_logs: select own" on public.discipline_logs
  for select to authenticated using (user_id = (select auth.uid()));
create policy "discipline_logs: insert own" on public.discipline_logs
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "discipline_logs: delete own" on public.discipline_logs
  for delete to authenticated using (user_id = (select auth.uid()));

-- rewards
create policy "rewards: select own" on public.rewards
  for select to authenticated using (user_id = (select auth.uid()));
create policy "rewards: insert own" on public.rewards
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "rewards: update own" on public.rewards
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "rewards: delete own" on public.rewards
  for delete to authenticated using (user_id = (select auth.uid()));

-- user_settings
create policy "user_settings: select own" on public.user_settings
  for select to authenticated using (user_id = (select auth.uid()));
create policy "user_settings: insert own" on public.user_settings
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "user_settings: update own" on public.user_settings
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "user_settings: delete own" on public.user_settings
  for delete to authenticated using (user_id = (select auth.uid()));

-- =====================================================================
-- Storage: private bucket for reward photos
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('reward-photos', 'reward-photos', false)
on conflict (id) do nothing;

-- A user can only use the folder named after their own user id: <user_id>/<file name>.
create policy "reward photos: select own folder" on storage.objects
  for select to authenticated
  using (bucket_id = 'reward-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "reward photos: insert own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'reward-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "reward photos: update own folder" on storage.objects
  for update to authenticated
  using (bucket_id = 'reward-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'reward-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "reward photos: delete own folder" on storage.objects
  for delete to authenticated
  using (bucket_id = 'reward-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
