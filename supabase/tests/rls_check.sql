-- COG-3: check that row level security (RLS) works for two different users.
--
-- Before running: sign up a second account in the app, so auth.users has two users.
-- Run in the Supabase dashboard: SQL Editor > New query > paste > Run.
--
-- What it does: it pretends to be user A (your first account), creates test rows,
-- then pretends to be user B (the second account) and tries to read and change them.
-- Everything is rolled back at the end, so no test data is left behind.
--
-- HOW TO READ THE RESULT: the script finishes with a red "error" on purpose.
-- That error message is the report. "0 check(s) failed" means everything passed.

do $$
declare
  v_a uuid;
  v_b uuid;
  v_disc uuid;
  n integer;
  pts integer;
  ttl text;
  ok boolean;
  report text := '';
  fails integer := 0;
begin
  select id into v_a from auth.users order by created_at asc limit 1;
  select id into v_b from auth.users order by created_at asc offset 1 limit 1;
  if v_a is null or v_b is null then
    raise exception 'This test needs two users. Sign up a second account in the app first.';
  end if;

  begin
    -- =================================================================
    -- User A: creates data, and tries to cheat
    -- =================================================================
    perform set_config('request.jwt.claims', json_build_object('sub', v_a, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', v_a::text, true);
    set local role authenticated;

    insert into public.disciplines (title, points, time_block)
      values ('RLS test task', 5, 'morning') returning id into v_disc;
    select count(*) into n from public.disciplines where id = v_disc;
    if n = 1 then report := report || E'PASS  A can read their own task\n';
    else fails := fails + 1; report := report || E'FAIL  A can read their own task\n'; end if;

    select count(*) into n from public.user_settings where user_id = v_a;
    if n = 1 then report := report || E'PASS  A has a settings row (created by trigger)\n';
    else fails := fails + 1; report := report || E'FAIL  A has a settings row (created by trigger)\n'; end if;

    insert into public.discipline_logs (discipline_id, completed_date) values (v_disc, current_date);
    select points_earned, title into pts, ttl
      from public.discipline_logs where discipline_id = v_disc and completed_date = current_date;
    if pts = 5 and ttl = 'RLS test task' then
      report := report || E'PASS  check-in copied the task title and points (trigger)\n';
    else
      fails := fails + 1; report := report || E'FAIL  check-in copied the task title and points (trigger)\n';
    end if;

    insert into public.discipline_logs (discipline_id, completed_date, points_earned)
      values (v_disc, current_date - 1, 10000);
    select points_earned into pts
      from public.discipline_logs where discipline_id = v_disc and completed_date = current_date - 1;
    if pts = 5 then report := report || E'PASS  fake points sent by the app are ignored\n';
    else fails := fails + 1; report := report || E'FAIL  fake points sent by the app are ignored\n'; end if;

    begin
      update public.discipline_logs set points_earned = 10000 where discipline_id = v_disc;
      fails := fails + 1; report := report || E'FAIL  check-ins cannot be edited\n';
    exception when others then
      report := report || E'PASS  check-ins cannot be edited\n';
    end;

    begin
      delete from public.disciplines where id = v_disc;
      fails := fails + 1; report := report || E'FAIL  a task with check-ins cannot be deleted\n';
    exception when others then
      report := report || E'PASS  a task with check-ins cannot be deleted\n';
    end;

    update public.disciplines set is_active = false where id = v_disc;
    select archived_at is not null into ok from public.disciplines where id = v_disc;
    if ok then report := report || E'PASS  archiving a task sets archived_at (trigger)\n';
    else fails := fails + 1; report := report || E'FAIL  archiving a task sets archived_at (trigger)\n'; end if;

    insert into public.rewards (description, points_spent, photo_path, reflection)
      values ('RLS test reward', 3, v_a::text || '/test.jpg', 'test');
    select count(*) into n from public.rewards where description = 'RLS test reward';
    if n = 1 then report := report || E'PASS  A can save a reward with a photo in their own folder\n';
    else fails := fails + 1; report := report || E'FAIL  A can save a reward with a photo in their own folder\n'; end if;

    begin
      insert into public.rewards (description, points_spent, photo_path)
        values ('bad path', 1, v_b::text || '/test.jpg');
      fails := fails + 1; report := report || E'FAIL  a reward cannot point to another user''s folder\n';
    exception when others then
      report := report || E'PASS  a reward cannot point to another user''s folder\n';
    end;

    insert into storage.objects (bucket_id, name) values ('reward-photos', v_a::text || '/test.jpg');
    select count(*) into n from storage.objects
      where bucket_id = 'reward-photos' and name = v_a::text || '/test.jpg';
    if n = 1 then report := report || E'PASS  A can upload a photo to their own folder\n';
    else fails := fails + 1; report := report || E'FAIL  A can upload a photo to their own folder\n'; end if;

    -- =================================================================
    -- User B: tries to see and change A's data
    -- =================================================================
    reset role;
    perform set_config('request.jwt.claims', json_build_object('sub', v_b, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', v_b::text, true);
    set local role authenticated;

    select count(*) into n from public.user_settings where user_id = v_b;
    if n = 1 then report := report || E'PASS  B can read their own settings row\n';
    else fails := fails + 1; report := report || E'FAIL  B can read their own settings row\n'; end if;

    select count(*) into n from public.disciplines where user_id = v_a;
    if n = 0 then report := report || E'PASS  B cannot see A''s tasks\n';
    else fails := fails + 1; report := report || E'FAIL  B cannot see A''s tasks\n'; end if;

    select count(*) into n from public.discipline_logs where user_id = v_a;
    if n = 0 then report := report || E'PASS  B cannot see A''s check-ins\n';
    else fails := fails + 1; report := report || E'FAIL  B cannot see A''s check-ins\n'; end if;

    select count(*) into n from public.rewards where user_id = v_a;
    if n = 0 then report := report || E'PASS  B cannot see A''s rewards\n';
    else fails := fails + 1; report := report || E'FAIL  B cannot see A''s rewards\n'; end if;

    select count(*) into n from public.user_settings where user_id = v_a;
    if n = 0 then report := report || E'PASS  B cannot see A''s settings\n';
    else fails := fails + 1; report := report || E'FAIL  B cannot see A''s settings\n'; end if;

    select count(*) into n from storage.objects where bucket_id = 'reward-photos' and name like v_a::text || '/%';
    if n = 0 then report := report || E'PASS  B cannot see A''s photos\n';
    else fails := fails + 1; report := report || E'FAIL  B cannot see A''s photos\n'; end if;

    update public.disciplines set points = 10000 where id = v_disc;
    get diagnostics n = row_count;
    if n = 0 then report := report || E'PASS  B cannot change A''s task\n';
    else fails := fails + 1; report := report || E'FAIL  B cannot change A''s task\n'; end if;

    delete from public.rewards where user_id = v_a;
    get diagnostics n = row_count;
    if n = 0 then report := report || E'PASS  B cannot delete A''s rewards\n';
    else fails := fails + 1; report := report || E'FAIL  B cannot delete A''s rewards\n'; end if;

    begin
      insert into public.disciplines (user_id, title) values (v_a, 'hack');
      fails := fails + 1; report := report || E'FAIL  B cannot create a task as A\n';
    exception when others then
      report := report || E'PASS  B cannot create a task as A\n';
    end;

    begin
      insert into public.discipline_logs (discipline_id, completed_date) values (v_disc, current_date - 5);
      fails := fails + 1; report := report || E'FAIL  B cannot check in on A''s task\n';
    exception when others then
      report := report || E'PASS  B cannot check in on A''s task\n';
    end;

    begin
      insert into storage.objects (bucket_id, name) values ('reward-photos', v_a::text || '/hack.jpg');
      fails := fails + 1; report := report || E'FAIL  B cannot upload into A''s photo folder\n';
    exception when others then
      report := report || E'PASS  B cannot upload into A''s photo folder\n';
    end;

    -- =================================================================
    -- Not logged in (anon): no access at all
    -- =================================================================
    reset role;
    perform set_config('request.jwt.claims', '', true);
    perform set_config('request.jwt.claim.sub', '', true);
    set local role anon;

    begin
      select count(*) into n from public.disciplines;
      fails := fails + 1; report := report || E'FAIL  a logged-out visitor cannot read tasks\n';
    exception when others then
      report := report || E'PASS  a logged-out visitor cannot read tasks\n';
    end;

    -- Undo all test data.
    raise exception 'ROLLBACK_TEST_DATA';
  exception when others then
    if sqlerrm <> 'ROLLBACK_TEST_DATA' then
      fails := fails + 1;
      report := report || E'ERROR  the test stopped early: ' || sqlerrm || E'\n';
    end if;
  end;

  raise exception E'RLS CHECK REPORT: % check(s) failed.\n%', fails, report;
end;
$$;
