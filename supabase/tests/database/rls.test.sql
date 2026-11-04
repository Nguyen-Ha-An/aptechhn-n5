-- pgTAP tests for FocusLearn RLS, security, functions, and streak calculations
begin;

select plan(26);

-- ============================================================================
-- 1. Setup Test Users
-- ============================================================================

-- Create User A and User B in auth.users
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
(
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'user_a@focuslearn.test',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"User A"}',
  now(),
  now()
),
(
  '22222222-2222-2222-2222-222222222222',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'user_b@focuslearn.test',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"User B"}',
  now(),
  now()
);

-- Ensure profiles exist and have timezone set
update public.profiles
set timezone = 'Asia/Ho_Chi_Minh', display_name = 'User A'
where id = '11111111-1111-1111-1111-111111111111';

update public.profiles
set timezone = 'Asia/Ho_Chi_Minh', display_name = 'User B'
where id = '22222222-2222-2222-2222-222222222222';

-- ============================================================================
-- 2. Populate User A Data
-- ============================================================================

set local role authenticated;
set local "request.jwt.claims" = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

insert into public.todos (id, user_id, title, done)
values ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'User A Todo', false);

insert into public.notes (id, user_id, title, content_text)
values ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'User A Note', 'Note content A');

insert into public.notes (id, user_id, title, content_text)
values ('aaaaaaaa-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'User A Note 2', 'Note 2 content A');

insert into public.note_links (source_id, target_id, user_id)
values ('aaaaaaaa-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111');

insert into public.focus_sessions (id, user_id, mode, started_at, ended_at, focused_seconds)
values ('aaaaaaaa-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'timed', now() - interval '30 minutes', now(), 1500);

insert into public.distractions (id, session_id, user_id, category, occurred_at)
values ('aaaaaaaa-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'phone', now());

insert into public.user_achievements (user_id, achievement_id)
values ('11111111-1111-1111-1111-111111111111', 'closer');

insert into public.conversations (id, user_id, title)
values ('aaaaaaaa-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'User A Chat');

insert into public.messages (id, conversation_id, user_id, role, content)
values ('aaaaaaaa-0000-0000-0000-000000000007', 'aaaaaaaa-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'user', 'Hello A');

reset role;
insert into public.ai_usage (user_id, day, requests)
values ('11111111-1111-1111-1111-111111111111', current_date, 1);

-- ============================================================================
-- 3. Impersonate User B and Test Isolation
-- ============================================================================

set local role authenticated;
set local "request.jwt.claims" = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

-- Test 1..10: User B cannot select User A's rows from any table
select is_empty(
  'select * from public.profiles where id = ''11111111-1111-1111-1111-111111111111''',
  'User B cannot select User A profile'
);

select is_empty(
  'select * from public.todos where user_id = ''11111111-1111-1111-1111-111111111111''',
  'User B cannot select User A todos'
);

select is_empty(
  'select * from public.notes where user_id = ''11111111-1111-1111-1111-111111111111''',
  'User B cannot select User A notes'
);

select is_empty(
  'select * from public.note_links where user_id = ''11111111-1111-1111-1111-111111111111''',
  'User B cannot select User A note_links'
);

select is_empty(
  'select * from public.focus_sessions where user_id = ''11111111-1111-1111-1111-111111111111''',
  'User B cannot select User A focus_sessions'
);

select is_empty(
  'select * from public.distractions where user_id = ''11111111-1111-1111-1111-111111111111''',
  'User B cannot select User A distractions'
);

select is_empty(
  'select * from public.user_achievements where user_id = ''11111111-1111-1111-1111-111111111111''',
  'User B cannot select User A user_achievements'
);

select is_empty(
  'select * from public.conversations where user_id = ''11111111-1111-1111-1111-111111111111''',
  'User B cannot select User A conversations'
);

select is_empty(
  'select * from public.messages where user_id = ''11111111-1111-1111-1111-111111111111''',
  'User B cannot select User A messages'
);

select is_empty(
  'select * from public.ai_usage where user_id = ''11111111-1111-1111-1111-111111111111''',
  'User B cannot select User A ai_usage'
);

-- User B attempts unauthorized updates (affecting 0 rows)
update public.profiles set display_name = 'Hacked' where id = '11111111-1111-1111-1111-111111111111';
update public.todos set title = 'Hacked' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
update public.notes set title = 'Hacked' where id = 'aaaaaaaa-0000-0000-0000-000000000002';
update public.note_links set user_id = '22222222-2222-2222-2222-222222222222' where source_id = 'aaaaaaaa-0000-0000-0000-000000000002';
update public.focus_sessions set reflection = 'Hacked' where id = 'aaaaaaaa-0000-0000-0000-000000000004';
update public.distractions set note = 'Hacked' where id = 'aaaaaaaa-0000-0000-0000-000000000005';
update public.user_achievements set achievement_id = 'hacked' where user_id = '11111111-1111-1111-1111-111111111111';
update public.conversations set title = 'Hacked' where id = 'aaaaaaaa-0000-0000-0000-000000000006';
update public.messages set content = 'Hacked' where id = 'aaaaaaaa-0000-0000-0000-000000000007';

-- User B attempts unauthorized deletes (affecting 0 rows)
delete from public.todos where id = 'aaaaaaaa-0000-0000-0000-000000000001';
delete from public.notes where id = 'aaaaaaaa-0000-0000-0000-000000000002';
delete from public.note_links where source_id = 'aaaaaaaa-0000-0000-0000-000000000002';
delete from public.focus_sessions where id = 'aaaaaaaa-0000-0000-0000-000000000004';
delete from public.distractions where id = 'aaaaaaaa-0000-0000-0000-000000000005';
delete from public.user_achievements where user_id = '11111111-1111-1111-1111-111111111111';
delete from public.conversations where id = 'aaaaaaaa-0000-0000-0000-000000000006';
delete from public.messages where id = 'aaaaaaaa-0000-0000-0000-000000000007';

-- Switch back to User A to verify rows were not updated or deleted by B
set local "request.jwt.claims" = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

-- Test 11..19: User A rows were not modified or deleted
select is(
  (select display_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'User A',
  'User A profile display_name was not modified by User B'
);

select is(
  (select title from public.todos where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'User A Todo',
  'User A todo was not modified or deleted by User B'
);

select is(
  (select title from public.notes where id = 'aaaaaaaa-0000-0000-0000-000000000002'),
  'User A Note',
  'User A note was not modified or deleted by User B'
);

select is(
  (select count(*)::int from public.note_links where source_id = 'aaaaaaaa-0000-0000-0000-000000000002'),
  1,
  'User A note_link was not deleted by User B'
);

select is(
  (select focused_seconds from public.focus_sessions where id = 'aaaaaaaa-0000-0000-0000-000000000004'),
  1500,
  'User A focus_session was not modified or deleted by User B'
);

select is(
  (select category from public.distractions where id = 'aaaaaaaa-0000-0000-0000-000000000005'),
  'phone',
  'User A distraction was not modified or deleted by User B'
);

select is(
  (select count(*)::int from public.user_achievements where user_id = '11111111-1111-1111-1111-111111111111' and achievement_id = 'closer'),
  1,
  'User A user_achievement was not modified or deleted by User B'
);

select is(
  (select title from public.conversations where id = 'aaaaaaaa-0000-0000-0000-000000000006'),
  'User A Chat',
  'User A conversation was not modified or deleted by User B'
);

select is(
  (select content from public.messages where id = 'aaaaaaaa-0000-0000-0000-000000000007'),
  'Hello A',
  'User A message was not modified or deleted by User B'
);

-- ============================================================================
-- 4. Test Cross-User Foreign Key Enforcement
-- ============================================================================

-- Switch to User B
set local "request.jwt.claims" = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

-- Test 20: Inserting a distraction pointing at User A session as User B fails
select throws_ok(
  'insert into public.distractions (id, session_id, user_id, category, occurred_at) values (''bbbbbbbb-0000-0000-0000-000000000099'', ''aaaaaaaa-0000-0000-0000-000000000004'', ''22222222-2222-2222-2222-222222222222'', ''phone'', now())',
  'Foreign key user mismatch: session does not belong to user',
  'Inserting a distraction pointing at User A session as User B fails'
);

-- ============================================================================
-- 5. Test Achievements RPC
-- ============================================================================

-- User B currently has 0 sessions. Insert 1 session (1200 seconds, mode timed)
insert into public.focus_sessions (id, user_id, mode, started_at, ended_at, focused_seconds)
values (
  'bbbbbbbb-0000-0000-0000-000000000001',
  '22222222-2222-2222-2222-222222222222',
  'timed',
  now() - interval '20 minutes',
  now(),
  1200
);

-- Test 21: check_achievements() returns 'first_session' after one session
select results_eq(
  'select public.check_achievements()',
  array['first_session'::text],
  'check_achievements() returns first_session after one session'
);

-- Test 22: Second call returns nothing (idempotent)
select is_empty(
  'select public.check_achievements()',
  'check_achievements() returns nothing on second call'
);

-- ============================================================================
-- 6. Test Streak Calculation in User Timezone
-- ============================================================================

-- Clear previous test session for clean streak calculation
delete from public.focus_sessions where user_id = '22222222-2222-2222-2222-222222222222';

-- Insert sessions at:
-- 1) local 2026-11-01 10:00 (Asia/Ho_Chi_Minh) -> '2026-11-01 10:00:00+07'
-- 2) local 2026-11-02 06:30 (= 2026-11-01 23:30 UTC) -> '2026-11-01 23:30:00+00'
-- 3) local 2026-11-03 09:00 (Asia/Ho_Chi_Minh) -> '2026-11-03 09:00:00+07'
insert into public.focus_sessions (id, user_id, mode, started_at, ended_at, focused_seconds)
values
  ('bbbbbbbb-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'timed', '2026-11-01 10:00:00+07', '2026-11-01 10:25:00+07', 1500),
  ('bbbbbbbb-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'timed', '2026-11-01 23:30:00+00', '2026-11-01 23:55:00+00', 1500),
  ('bbbbbbbb-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', 'timed', '2026-11-03 09:00:00+07', '2026-11-03 09:25:00+07', 1500);

-- Test 23: Streak across 3 consecutive local days yields best_streak = 3
select is(
  (select best_streak from public.user_stats),
  3,
  'Sessions across 3 consecutive local days give best_streak = 3'
);

-- ============================================================================
-- 7. Test AI Quota Consumption
-- ============================================================================

-- Test 24: 1st consume_ai_quota(2) succeeds and returns 1 remaining
select is(
  public.consume_ai_quota(2),
  1,
  'First consume_ai_quota(2) call succeeds and returns 1 remaining'
);

-- Test 25: 2nd consume_ai_quota(2) succeeds and returns 0 remaining
select is(
  public.consume_ai_quota(2),
  0,
  'Second consume_ai_quota(2) call succeeds and returns 0 remaining'
);

-- Test 26: 3rd consume_ai_quota(2) throws ai_quota_exceeded (P0001)
select throws_ok(
  'select public.consume_ai_quota(2)',
  'P0001',
  'ai_quota_exceeded',
  'Third consume_ai_quota(2) call throws ai_quota_exceeded'
);

-- ============================================================================
-- 8. Finish
-- ============================================================================

select * from finish();

rollback;
