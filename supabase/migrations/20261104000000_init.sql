-- Supabase initial migration for FocusLearn
-- Tables, RLS, triggers, views, and functions

create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. Tables
-- ============================================================================

-- Profiles: one row per auth user, created by trigger
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text check (char_length(display_name) <= 40),
  theme text not null default 'system' check (theme in ('light','dark','system')),
  timezone text not null default 'Asia/Ho_Chi_Minh',
  focus_minutes int not null default 25 check (focus_minutes between 5 and 180),
  short_break_minutes int not null default 5 check (short_break_minutes between 1 and 60),
  long_break_minutes int not null default 15 check (long_break_minutes between 1 and 90),
  cycles_before_long_break int not null default 4 check (cycles_before_long_break between 1 and 12),
  auto_start_breaks boolean not null default false,
  notifications boolean not null default true,
  legacy_imported_at timestamptz,
  created_at timestamptz not null default now()
);

-- Todos
create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null check (char_length(title) between 1 and 500),
  done boolean not null default false,
  due_date date,
  priority text not null default 'none' check (priority in ('none','low','medium','high')),
  position double precision not null default extract(epoch from now()),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Notes
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  parent_id uuid references public.notes on delete cascade,
  icon text check (char_length(icon) <= 16),
  title text not null default '',
  content jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  content_text text not null default '',
  position double precision not null default extract(epoch from now()),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as
    (to_tsvector('simple', coalesce(title,'') || ' ' || content_text)) stored
);
create index notes_search_gin_idx on public.notes using gin (search);

-- Note Links: [[links]] stored by id
create table public.note_links (
  source_id uuid references public.notes on delete cascade,
  target_id uuid references public.notes on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  primary key (source_id, target_id)
);

-- Focus Sessions (client-generated uuid PK, NO default)
create table public.focus_sessions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  todo_id uuid references public.todos on delete set null,
  mode text not null check (mode in ('timed','open')),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  planned_seconds int,
  focused_seconds int not null check (focused_seconds >= 0),
  paused_seconds int not null default 0,
  phase_count int not null default 1,
  focus_rating smallint check (focus_rating between 1 and 5),
  reflection text,
  created_at timestamptz not null default now()
);

-- Distractions logged during focus sessions
create table public.distractions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.focus_sessions on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  category text not null check (category in ('phone','social','noise','people','hunger','tired','thoughts','other')),
  note text,
  occurred_at timestamptz not null
);

-- User Achievements
create table public.user_achievements (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

-- Conversations
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- AI Usage (rate limiting)
create table public.ai_usage (
  user_id uuid references auth.users on delete cascade,
  day date not null,
  requests int not null default 0,
  primary key (user_id, day)
);

-- ============================================================================
-- 2. Indexes
-- ============================================================================

create index todos_user_id_done_due_date_idx on public.todos (user_id, done, due_date);
create index notes_user_id_parent_id_position_idx on public.notes (user_id, parent_id, position);
create index notes_user_id_updated_at_desc_idx on public.notes (user_id, updated_at desc);
create index focus_sessions_user_id_started_at_desc_idx on public.focus_sessions (user_id, started_at desc);
create index distractions_session_id_idx on public.distractions (session_id);
create index messages_conversation_id_created_at_idx on public.messages (conversation_id, created_at);
create index note_links_target_id_idx on public.note_links (target_id);

-- ============================================================================
-- 3. Composite Foreign Key Safety Triggers
-- ============================================================================

-- Distractions must belong to the same user who owns the focus session
create or replace function public.check_distraction_session_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.focus_sessions s
    where s.id = NEW.session_id and s.user_id = NEW.user_id
  ) then
    raise exception 'Foreign key user mismatch: session does not belong to user';
  end if;
  return NEW;
end;
$$;

create trigger tr_check_distraction_session_user
before insert or update on public.distractions
for each row execute function public.check_distraction_session_user();

-- Messages must belong to the same user who owns the conversation
create or replace function public.check_message_conversation_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.conversations c
    where c.id = NEW.conversation_id and c.user_id = NEW.user_id
  ) then
    raise exception 'Foreign key user mismatch: conversation does not belong to user';
  end if;
  return NEW;
end;
$$;

create trigger tr_check_message_conversation_user
before insert or update on public.messages
for each row execute function public.check_message_conversation_user();

-- Notes parent must belong to the same user
create or replace function public.check_note_parent_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if NEW.parent_id is not null then
    if NEW.parent_id = NEW.id then
      raise exception 'Note cannot be its own parent';
    end if;
    if not exists (
      select 1 from public.notes n
      where n.id = NEW.parent_id and n.user_id = NEW.user_id
    ) then
      raise exception 'Foreign key user mismatch: parent note does not belong to user';
    end if;
  end if;
  return NEW;
end;
$$;

create trigger tr_check_note_parent_user
before insert or update on public.notes
for each row execute function public.check_note_parent_user();

-- Both source and target in note_links must belong to the same user
create or replace function public.check_note_link_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.notes n
    where n.id = NEW.source_id and n.user_id = NEW.user_id
  ) or not exists (
    select 1 from public.notes n
    where n.id = NEW.target_id and n.user_id = NEW.user_id
  ) then
    raise exception 'Foreign key user mismatch: linked notes must belong to user';
  end if;
  return NEW;
end;
$$;

create trigger tr_check_note_link_user
before insert or update on public.note_links
for each row execute function public.check_note_link_user();

-- Focus session todo must belong to the same user
create or replace function public.check_focus_session_todo_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if NEW.todo_id is not null then
    if not exists (
      select 1 from public.todos t
      where t.id = NEW.todo_id and t.user_id = NEW.user_id
    ) then
      raise exception 'Foreign key user mismatch: todo does not belong to user';
    end if;
  end if;
  return NEW;
end;
$$;

create trigger tr_check_focus_session_todo_user
before insert or update on public.focus_sessions
for each row execute function public.check_focus_session_todo_user();

-- ============================================================================
-- 4. Updated At and Auth Triggers
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$;

create trigger tr_todos_set_updated_at
before update on public.todos
for each row execute function public.set_updated_at();

create trigger tr_notes_set_updated_at
before update on public.notes
for each row execute function public.set_updated_at();

create trigger tr_conversations_set_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

-- Automatically create profile for new auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    NEW.id,
    substring(coalesce(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name') from 1 for 40)
  )
  on conflict (id) do nothing;
  return NEW;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ============================================================================
-- 5. Row Level Security & Policies
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.todos enable row level security;
alter table public.notes enable row level security;
alter table public.note_links enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.distractions enable row level security;
alter table public.user_achievements enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.ai_usage enable row level security;

-- profiles: select and update only (inserts are done via trigger)
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- todos
create policy "todos_select_own" on public.todos
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "todos_insert_own" on public.todos
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "todos_update_own" on public.todos
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "todos_delete_own" on public.todos
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- notes
create policy "notes_select_own" on public.notes
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "notes_insert_own" on public.notes
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "notes_update_own" on public.notes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "notes_delete_own" on public.notes
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- note_links
create policy "note_links_select_own" on public.note_links
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "note_links_insert_own" on public.note_links
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "note_links_update_own" on public.note_links
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "note_links_delete_own" on public.note_links
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- focus_sessions
create policy "focus_sessions_select_own" on public.focus_sessions
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "focus_sessions_insert_own" on public.focus_sessions
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "focus_sessions_update_own" on public.focus_sessions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "focus_sessions_delete_own" on public.focus_sessions
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- distractions
create policy "distractions_select_own" on public.distractions
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "distractions_insert_own" on public.distractions
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "distractions_update_own" on public.distractions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "distractions_delete_own" on public.distractions
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- user_achievements
create policy "user_achievements_select_own" on public.user_achievements
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "user_achievements_insert_own" on public.user_achievements
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "user_achievements_update_own" on public.user_achievements
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "user_achievements_delete_own" on public.user_achievements
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- conversations
create policy "conversations_select_own" on public.conversations
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "conversations_insert_own" on public.conversations
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "conversations_update_own" on public.conversations
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "conversations_delete_own" on public.conversations
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- messages
create policy "messages_select_own" on public.messages
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "messages_insert_own" on public.messages
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "messages_update_own" on public.messages
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "messages_delete_own" on public.messages
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ai_usage: select policy only
create policy "ai_usage_select_own" on public.ai_usage
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- ============================================================================
-- 6. User Stats View
-- ============================================================================

create or replace view public.user_stats
with (security_invoker = true)
as
with me as (
  select
    u.id as user_id,
    coalesce(p.timezone, 'Asia/Ho_Chi_Minh') as tz,
    (now() at time zone coalesce(p.timezone, 'Asia/Ho_Chi_Minh'))::date as today_local
  from (select (select auth.uid()) as id) u
  left join public.profiles p on p.id = u.id
  where u.id is not null
),
user_todos as (
  select
    count(*) filter (where t.done = true)::int as todos_done
  from public.todos t
  where t.user_id = (select auth.uid())
),
user_notes as (
  select
    count(*)::int as notes_count
  from public.notes n
  where n.user_id = (select auth.uid())
    and n.archived_at is null
),
user_sessions as (
  select
    coalesce(floor(sum(s.focused_seconds) / 60), 0)::int as total_focus_minutes,
    count(*)::int as sessions_count,
    coalesce(bool_or(
      s.focused_seconds >= 1500
      and not exists (
        select 1 from public.distractions d where d.session_id = s.id
      )
    ), false) as has_undistracted
  from public.focus_sessions s
  where s.user_id = (select auth.uid())
),
distinct_days as (
  select distinct
    (s.started_at at time zone m.tz)::date as day
  from public.focus_sessions s
  cross join me m
  where s.user_id = m.user_id
),
numbered_days as (
  select
    day,
    day - (row_number() over (order by day))::int as grp
  from distinct_days
),
streaks as (
  select
    count(*)::int as streak_len,
    max(day) as streak_end
  from numbered_days
  group by grp
),
streak_stats as (
  select
    coalesce(max(streak_len), 0)::int as best_streak,
    coalesce(
      max(streak_len) filter (
        where streak_end = (select today_local from me)
           or streak_end = (select today_local - 1 from me)
      ),
      0
    )::int as current_streak
  from streaks
)
select
  me.user_id,
  coalesce(us.total_focus_minutes, 0)::int as total_focus_minutes,
  coalesce(us.sessions_count, 0)::int as sessions_count,
  coalesce(ut.todos_done, 0)::int as todos_done,
  coalesce(un.notes_count, 0)::int as notes_count,
  coalesce(ss.current_streak, 0)::int as current_streak,
  coalesce(ss.best_streak, 0)::int as best_streak,
  coalesce(us.has_undistracted, false)::boolean as has_undistracted
from me
cross join user_todos ut
cross join user_notes un
cross join user_sessions us
cross join streak_stats ss;

-- ============================================================================
-- 7. Stored Procedures / RPCs
-- ============================================================================

-- Check and award achievements based on user_stats
create or replace function public.check_achievements()
returns setof text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_stats public.user_stats%rowtype;
  v_user_id uuid;
  v_to_insert text[] := array[]::text[];
begin
  v_user_id := (select auth.uid());
  if v_user_id is null then
    return;
  end if;

  select * into v_stats from public.user_stats where user_id = v_user_id;
  if not found then
    return;
  end if;

  -- 1. first_session (1 session)
  if v_stats.sessions_count >= 1 then
    v_to_insert := array_append(v_to_insert, 'first_session');
  end if;

  -- 2. focus_marathon (100 focused minutes total)
  if v_stats.total_focus_minutes >= 100 then
    v_to_insert := array_append(v_to_insert, 'focus_marathon');
  end if;

  -- 3. streak_3 (3 consecutive local days)
  if v_stats.best_streak >= 3 then
    v_to_insert := array_append(v_to_insert, 'streak_3');
  end if;

  -- 4. streak_7 (7 consecutive local days)
  if v_stats.best_streak >= 7 then
    v_to_insert := array_append(v_to_insert, 'streak_7');
  end if;

  -- 5. note_taker (10 non-archived notes)
  if v_stats.notes_count >= 10 then
    v_to_insert := array_append(v_to_insert, 'note_taker');
  end if;

  -- 6. closer (25 todos done)
  if v_stats.todos_done >= 25 then
    v_to_insert := array_append(v_to_insert, 'closer');
  end if;

  -- 7. undistracted (a session with focused_seconds >= 1500 and zero distractions)
  if v_stats.has_undistracted then
    v_to_insert := array_append(v_to_insert, 'undistracted');
  end if;

  if cardinality(v_to_insert) = 0 then
    return;
  end if;

  return query
    insert into public.user_achievements (user_id, achievement_id)
    select v_user_id, unnest(v_to_insert)
    on conflict (user_id, achievement_id) do nothing
    returning achievement_id;
end;
$$;

-- Consume daily AI quota
create or replace function public.consume_ai_quota(p_limit int)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_tz text;
  v_today date;
  v_current_requests int := 0;
  v_new_requests int;
begin
  v_user_id := (select auth.uid());
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select coalesce(p.timezone, 'Asia/Ho_Chi_Minh')
  into v_tz
  from public.profiles p
  where p.id = v_user_id;

  if v_tz is null then
    v_tz := 'Asia/Ho_Chi_Minh';
  end if;

  v_today := (now() at time zone v_tz)::date;

  insert into public.ai_usage as u (user_id, day, requests)
  values (v_user_id, v_today, 0)
  on conflict (user_id, day) do nothing;

  select u.requests
  into v_current_requests
  from public.ai_usage u
  where u.user_id = v_user_id and u.day = v_today
  for update;

  if v_current_requests >= p_limit then
    raise exception 'ai_quota_exceeded' using errcode = 'P0001';
  end if;

  v_new_requests := v_current_requests + 1;

  update public.ai_usage u
  set requests = v_new_requests
  where u.user_id = v_user_id and u.day = v_today;

  return p_limit - v_new_requests;
end;
$$;

-- ============================================================================
-- 8. Grants and Permissions
-- ============================================================================

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all routines in schema public from anon;

grant usage on schema public to authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.todos to authenticated;
grant select, insert, update, delete on public.notes to authenticated;
grant select, insert, update, delete on public.note_links to authenticated;
grant select, insert, update, delete on public.focus_sessions to authenticated;
grant select, insert, update, delete on public.distractions to authenticated;
grant select, insert, update, delete on public.user_achievements to authenticated;
grant select, insert, update, delete on public.conversations to authenticated;
grant select, insert, update, delete on public.messages to authenticated;
grant select on public.ai_usage to authenticated;
grant select on public.user_stats to authenticated;

grant execute on function public.check_achievements() to authenticated;
grant execute on function public.consume_ai_quota(int) to authenticated;
