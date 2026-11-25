-- Test data for the monthly reward history (Jar tab). Manual use only, not part of CI.
--
-- Run in the Supabase dashboard: SQL Editor > New query > paste > Run.
-- Change the email below to your test account first.
-- Run ONE block at a time: select just that block's text, then press Run.
--
-- STEP 1 (seed): run the "SEED" block. It
--   - pretends you signed up on 2025-10-10 (the real date is saved and restored by CLEAN UP),
--   - adds 10 small test rewards ("[test] ...", 1-2 points each) in older months,
--   - adds a hidden test task with check-ins in May-October (160 points earned in total).
-- STEP 2: log out and log in again in the app (so it picks up the new sign-up date), then open the Jar tab.
-- STEP 3 (clean up): run the "CLEAN UP" block. It deletes the test rewards and restores the sign-up date.
--
-- The test data earns 160 points and spends 13, so your Jar balance goes up by 147 until you clean up.

-- ===== SEED =====
do $$
declare
  v_email text := 'you@example.com';  -- <-- change this
  v_user uuid;
  v_task uuid;
begin
  select id into v_user from auth.users where email = v_email;
  if v_user is null then
    raise exception 'No user with email %', v_email;
  end if;

  -- Remember the real sign-up date (only the first time), then pretend it was in October 2025.
  update auth.users
     set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
           || jsonb_build_object('original_created_at', coalesce(raw_user_meta_data ->> 'original_created_at', created_at::text)),
         created_at = '2025-10-10 12:00:00+00'
   where id = v_user;

  insert into public.rewards (user_id, description, points_spent, reflection, created_at) values
    (v_user, '[test] Coffee with a friend', 1, 'A small treat for staying consistent.', '2026-10-03 12:00:00+00'),
    (v_user, '[test] New notebook',         1, null,                                   '2026-10-12 12:00:00+00'),
    (v_user, '[test] Movie night',          2, 'I earned a quiet evening.',            '2026-10-25 12:00:00+00'),
    (v_user, '[test] Bubble tea',           1, null,                                   '2026-09-20 12:00:00+00'),
    (v_user, '[test] Long bath',            1, null,                                   '2026-08-15 12:00:00+00'),
    (v_user, '[test] Flowers',              1, null,                                   '2026-07-15 12:00:00+00'),
    (v_user, '[test] Pastry',               1, null,                                   '2026-06-15 12:00:00+00'),
    (v_user, '[test] Board game',           1, null,                                   '2026-05-15 12:00:00+00'),
    (v_user, '[test] Old sneakers fund',    2, null,                                   '2026-04-15 12:00:00+00'),
    (v_user, '[test] New year treat',       2, null,                                   '2026-01-20 12:00:00+00');

  -- A hidden test task (5 points) with check-ins in past months, for the "Points earned each month" chart.
  -- Check-ins per month: Oct 10, Sep 4, Aug 7, Jul 2, Jun 6, May 3 (so 50, 20, 35, 10, 30, 15 points).
  insert into public.disciplines (user_id, title, points, is_active)
    values (v_user, '[test] Seed task', 5, false)
    returning id into v_task;

  insert into public.discipline_logs (discipline_id, user_id, completed_date, title, time_block, points_earned)
  select v_task, v_user, d::date, 'x', 'anytime', 0  -- title, time block and points are filled by a trigger
    from (
      select generate_series('2026-10-01'::date, '2026-10-10'::date, '1 day') as d union all
      select generate_series('2026-09-01'::date, '2026-09-04'::date, '1 day') union all
      select generate_series('2026-08-01'::date, '2026-08-07'::date, '1 day') union all
      select generate_series('2026-07-01'::date, '2026-07-02'::date, '1 day') union all
      select generate_series('2026-06-01'::date, '2026-06-06'::date, '1 day') union all
      select generate_series('2026-05-01'::date, '2026-05-03'::date, '1 day')
    ) days;
end $$;

-- ===== CLEAN UP =====
do $$
declare
  v_email text := 'you@example.com';  -- <-- change this (same email as above)
  v_user uuid;
begin
  select id into v_user from auth.users where email = v_email;
  if v_user is null then
    raise exception 'No user with email %', v_email;
  end if;

  delete from public.rewards where user_id = v_user and description like '[test] %';
  delete from public.discipline_logs where user_id = v_user and discipline_id in
    (select id from public.disciplines where user_id = v_user and title = '[test] Seed task');
  delete from public.disciplines where user_id = v_user and title = '[test] Seed task';

  update auth.users
     set created_at = (raw_user_meta_data ->> 'original_created_at')::timestamptz,
         raw_user_meta_data = raw_user_meta_data - 'original_created_at'
   where id = v_user
     and raw_user_meta_data ? 'original_created_at';
end $$;
