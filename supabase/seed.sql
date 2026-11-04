-- Seed data for FocusLearn local development and testing
-- Creates a demo user demo@focuslearn.local with initial sample data

do $$
declare
  v_demo_user_id uuid := 'd0000000-0000-0000-0000-000000000001';
  v_todo_1_id uuid := 'd0000000-0000-0000-0000-000000000011';
  v_todo_2_id uuid := 'd0000000-0000-0000-0000-000000000012';
  v_todo_3_id uuid := 'd0000000-0000-0000-0000-000000000013';
  v_note_1_id uuid := 'd0000000-0000-0000-0000-000000000021';
  v_note_2_id uuid := 'd0000000-0000-0000-0000-000000000022';
  v_session_1_id uuid := 'd0000000-0000-0000-0000-000000000031';
  v_session_2_id uuid := 'd0000000-0000-0000-0000-000000000032';
begin
  -- 1. Create demo auth user
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_demo_user_id,
    'authenticated',
    'authenticated',
    'demo@focuslearn.local',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Demo Student"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ) on conflict (id) do nothing;

  -- 2. Create auth identity
  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    v_demo_user_id,
    v_demo_user_id,
    format('{"sub":"%s","email":"%s"}', v_demo_user_id, 'demo@focuslearn.local')::jsonb,
    'email',
    v_demo_user_id,
    now(),
    now(),
    now()
  ) on conflict (provider, provider_id) do nothing;

  -- 3. Profile configuration
  update public.profiles
  set display_name = 'Demo Student',
      theme = 'system',
      timezone = 'Asia/Ho_Chi_Minh',
      focus_minutes = 25,
      short_break_minutes = 5,
      long_break_minutes = 15,
      cycles_before_long_break = 4,
      auto_start_breaks = false,
      notifications = true
  where id = v_demo_user_id;

  -- 4. 3 Todos
  insert into public.todos (id, user_id, title, done, due_date, priority, position, completed_at)
  values
    (v_todo_1_id, v_demo_user_id, 'Review Database Normalization (3NF & BCNF)', true, current_date, 'high', 1000, now() - interval '2 hours'),
    (v_todo_2_id, v_demo_user_id, 'Implement Binary Search Tree balancing', false, current_date, 'medium', 2000, null),
    (v_todo_3_id, v_demo_user_id, 'Prepare notes for Data Structures exam', false, current_date + 2, 'low', 3000, null)
  on conflict (id) do nothing;

  -- 5. 2 Notes (parent and child)
  insert into public.notes (id, user_id, parent_id, icon, title, content, content_text, position)
  values
    (
      v_note_1_id,
      v_demo_user_id,
      null,
      '📚',
      'Computer Science Fundamentals',
      '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Core concepts and review notes."}]},{"type":"paragraph","content":[{"type":"text","text":"See also "},{"type":"mention","attrs":{"id":"d0000000-0000-0000-0000-000000000022","label":"Binary Search Trees"}}]}]}'::jsonb,
      'Core concepts and review notes. See also Binary Search Trees',
      1000
    )
  on conflict (id) do nothing;

  insert into public.notes (id, user_id, parent_id, icon, title, content, content_text, position)
  values
    (
      v_note_2_id,
      v_demo_user_id,
      v_note_1_id,
      '🌲',
      'Binary Search Trees',
      '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"A binary search tree is a rooted binary tree data structure with key ordering property."}]}]}'::jsonb,
      'A binary search tree is a rooted binary tree data structure with key ordering property.',
      1001
    )
  on conflict (id) do nothing;

  -- 6. Note link from parent to child
  insert into public.note_links (source_id, target_id, user_id)
  values (v_note_1_id, v_note_2_id, v_demo_user_id)
  on conflict (source_id, target_id) do nothing;

  -- 7. 2 Focus Sessions
  insert into public.focus_sessions (
    id,
    user_id,
    todo_id,
    mode,
    started_at,
    ended_at,
    planned_seconds,
    focused_seconds,
    paused_seconds,
    phase_count,
    focus_rating,
    reflection
  ) values
    (
      v_session_1_id,
      v_demo_user_id,
      v_todo_1_id,
      'timed',
      now() - interval '2 days',
      now() - interval '2 days' + interval '25 minutes',
      1500,
      1500,
      0,
      1,
      5,
      'Focused through the entire database normalization chapter.'
    ),
    (
      v_session_2_id,
      v_demo_user_id,
      v_todo_2_id,
      'timed',
      now() - interval '1 day',
      now() - interval '1 day' + interval '30 minutes',
      1800,
      1800,
      0,
      1,
      4,
      'Good progress on binary search tree algorithms.'
    )
  on conflict (id) do nothing;
end $$;
