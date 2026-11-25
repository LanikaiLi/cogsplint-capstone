-- Test data for the Analysis tab (streak, heatmap, per-task stats). Manual use only, not part of CI.
--
-- Run in the Supabase dashboard: SQL Editor > New query > paste > Run.
-- Change the email below to your test account first.
-- Run ONE block at a time: select just that block's text, then press Run.
--
-- STEP 1 (seed): run the "SEED" block. It adds 3 test tasks ("[test] ..."), created 80 days ago,
--   with check-ins over the last 70 days (until yesterday). Days 3, 20 and 21 days ago have no
--   check-ins on purpose, so the streak is 2 and the heatmap has gaps.
--   The test tasks also show up in Today and Manage until you clean up.
-- STEP 2: open the Analysis tab (pull down to refresh).
-- STEP 3 (clean up): run the "CLEAN UP" block. It deletes the test tasks and their check-ins.
--
-- The check-ins earn points, so your Jar balance goes up until you clean up.

-- ===== SEED =====
do $$
declare
  v_email text := 'you@example.com';  -- <-- change this
  v_user uuid;
  v_a uuid;
  v_b uuid;
  v_c uuid;
begin
  select id into v_user from auth.users where email = v_email;
  if v_user is null then
    raise exception 'No user with email %', v_email;
  end if;

  insert into public.disciplines (user_id, title, points, time_block, created_at)
    values (v_user, '[test] Morning walk', 5, 'morning', now() - interval '80 days') returning id into v_a;
  insert into public.disciplines (user_id, title, points, time_block, created_at)
    values (v_user, '[test] Read 10 pages', 3, 'evening', now() - interval '80 days') returning id into v_b;
  insert into public.disciplines (user_id, title, points, time_block, created_at)
    values (v_user, '[test] Stretch', 2, 'anytime', now() - interval '80 days') returning id into v_c;

  -- Walk: most days. Read: every third day. Stretch: every other day.
  insert into public.discipline_logs (discipline_id, user_id, completed_date, title, time_block, points_earned)
  select t.id, v_user, current_date - d, 'x', 'anytime', 0  -- title, time block and points are filled by a trigger
    from generate_series(1, 70) as d
    cross join (values (v_a, 1), (v_b, 2), (v_c, 3)) as t(id, kind)
   where d not in (3, 20, 21)
     and (   (t.kind = 1 and d % 4 <> 0)
          or (t.kind = 2 and d % 3 = 0)
          or (t.kind = 3 and d % 2 = 0));
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

  delete from public.discipline_logs where user_id = v_user and discipline_id in
    (select id from public.disciplines where user_id = v_user and title like '[test] %');
  delete from public.disciplines where user_id = v_user and title like '[test] %';
end $$;
