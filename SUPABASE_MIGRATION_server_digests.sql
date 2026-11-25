-- ======================================================================
-- Server-side digests: Morning Brief, Task Escalation, Weekly Team Report
-- Run ONCE in Supabase -> SQL Editor (safe to re-run).
--
-- Requires the earlier migrations: app_settings, auto_reminder_settings
-- (server_side one), pg_cron and pg_net.
--
-- Everything here is OFF until you switch it on in the app
-- (Settings -> Automatic Digests). Who receives each one is chosen in
-- Settings -> Who Gets What., and only sends inside the "Only between"
-- hours of Settings -> Automatic Task Reminders. Settings are stored in
-- app_settings: morning_brief, escalation, weekly_report.
-- ======================================================================

create table if not exists public.digest_log (
  id             uuid primary key default gen_random_uuid(),
  kind           text not null,
  recipient_id   uuid,
  recipient_name text,
  ref            text,
  sent_at        timestamptz not null default now(),
  message        text
);
create index if not exists digest_log_kind_ref_idx on public.digest_log (kind, ref, sent_at desc);
alter table public.digest_log enable row level security;
drop policy if exists "digest_log read" on public.digest_log;
create policy "digest_log read" on public.digest_log for select using (true);  -- shown in Settings; only the server job writes

-- ---- helpers (internal) ----------------------------------------------
create or replace function public._dg_setting(p_key text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((select value from public.app_settings where key = p_key), '{}'::jsonb)
$$;

create or replace function public._dg_num(p_cfg jsonb, p_key text, p_def numeric) returns numeric
language sql immutable as $$
  select coalesce(nullif(p_cfg ->> p_key, '')::numeric, p_def)
$$;

create or replace function public._dg_due(p text) returns date
language sql immutable as $$
  select case when p ~ '^\d{4}-\d{2}-\d{2}' then left(p, 10)::date end
$$;

-- Who receives a digest. If Settings -> "Who Gets What" has been saved
-- (app_settings key recipient_access), ONLY the active people ticked for that
-- item get it (any member, not just Admins). Until it has been saved, the
-- original behaviour applies: every active Admin.
create or replace function public._dg_recipients(p_flag text) returns table(id uuid, name text)
language sql stable security definer set search_path = public as $$
  select t.id, t.name
    from public.team t
   where coalesce(t.status, 'Active') = 'Active'
     and case
           when exists (select 1 from public.app_settings where key = 'recipient_access')
             then (select value #>> array['people', t.id::text, p_flag] from public.app_settings where key = 'recipient_access') = 'true'
           else t.access = 'Admin'
         end
$$;

-- in-app notification + push to one member
create or replace function public._dg_deliver(p_member_id uuid, p_member_name text, p_message text, p_push_title text, p_push_body text)
returns void
language plpgsql security definer set search_path = public, extensions as $fn$
declare
  c_url constant text := 'https://duglbebwhtuijnduwmvz.supabase.co/functions/v1/send-push';
  c_key constant text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1Z2xiZWJ3aHR1aWpuZHV3bXZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MzQ1NjgsImV4cCI6MjA5MTUxMDU2OH0.0VFefKrp6Zzp9FbvJybzTwxQfK1nCRa8N_ncJrd9xws';
begin
  insert into public.notifications (to_name, from_name, message, type, task_title, admins_only, read_by)
  select r.to_name, r.from_name, r.message, r.type, r.task_title, r.admins_only, r.read_by
    from jsonb_populate_record(null::public.notifications, jsonb_build_object(
           'to_name', p_member_name, 'from_name', 'System', 'message', p_message,
           'type', 'Reminder', 'task_title', '', 'admins_only', false,
           'read_by', '[]'::jsonb)) r;
  perform net.http_post(
    url     := c_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', c_key, 'Authorization', 'Bearer ' || c_key),
    body    := jsonb_build_object('member_id', p_member_id::text, 'title', p_push_title, 'body', p_push_body));
end;
$fn$;

-- ======================================================================
-- 1. MORNING BRIEF  (to every active Admin, once a day)
-- ======================================================================
create or replace function public.run_morning_brief(p_dry_run boolean default false, p_force boolean default false)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $fn$
declare
  cfg jsonb := public._dg_setting('morning_brief');
  v_tz text; v_end int; v_local timestamp; v_today date; v_hour int;
  n_over int; n_today int; n_review int; n_help int; n_idle int;
  v_top text; v_review_h numeric; v_idle text; v_days int;
  v_msg text; v_parts text[]; v_out jsonb := '[]'::jsonb; a record;
begin
  select tz, end_hour into v_tz, v_end from public.auto_reminder_settings where id = 1;
  v_local := now() at time zone coalesce(v_tz, 'Africa/Khartoum');
  v_today := v_local::date; v_hour := extract(hour from v_local)::int;

  if not p_force then
    if coalesce((cfg ->> 'enabled')::boolean, false) is not true then return v_out; end if;
    if v_hour < public._dg_num(cfg, 'hour', 8) or v_hour >= coalesce(v_end, 20) then return v_out; end if;
  end if;

  select count(*) into n_over  from public.tasks t where coalesce(t.status,'') not in ('Done','Cancelled') and public._dg_due(t.due::text) < v_today;
  select count(*) into n_today from public.tasks t where coalesce(t.status,'') not in ('Done','Cancelled') and public._dg_due(t.due::text) = v_today;
  select count(*), max(extract(epoch from (now() - t.ts_submitted)) / 3600) into n_review, v_review_h
    from public.tasks t where t.status = 'Pending Review';
  select count(*) into n_help from public.tasks t where t.status = 'Pending Help';

  select string_agg(format('"%s" (%s, %sd)', x.title, coalesce(x.who, 'unassigned'), v_today - x.d), ', ' order by x.d) into v_top
  from (select t.title, m.name as who, public._dg_due(t.due::text) as d
          from public.tasks t left join public.team m on m.id::text = t.assigned_to::text
         where coalesce(t.status,'') not in ('Done','Cancelled') and public._dg_due(t.due::text) < v_today
         order by public._dg_due(t.due::text) limit 3) x;

  select coalesce((select (value #>> '{}')::numeric from public.app_settings where key = 'login_reminder_days'), 3)::int into v_days;
  select string_agg(i.name, ', ' order by i.since) into v_idle
    from (select name, coalesce(last_login, created_at) as since from public.team
           where coalesce(status,'Active') = 'Active' and coalesce(last_login, created_at) < now() - make_interval(days => v_days)
           order by coalesce(last_login, created_at) limit 3) i;
  select count(*) into n_idle from public.team
   where coalesce(status,'Active') = 'Active' and coalesce(last_login, created_at) < now() - make_interval(days => v_days);

  v_parts := array[]::text[];
  if n_over   > 0 then v_parts := v_parts || ('🚨 ' || n_over || ' overdue' || case when v_top is not null then ' - oldest: ' || v_top else '' end); end if;
  if n_today  > 0 then v_parts := v_parts || ('⏰ ' || n_today || ' due today'); end if;
  if n_review > 0 then v_parts := v_parts || ('🔍 ' || n_review || ' waiting for review' || case when v_review_h >= 24 then ' (oldest ' || round(v_review_h / 24) || 'd)' else '' end); end if;
  if n_help   > 0 then v_parts := v_parts || ('🆘 ' || n_help || ' need help'); end if;
  if n_idle   > 0 then v_parts := v_parts || ('👤 ' || n_idle || ' not logged in for ' || v_days || '+ days' || case when v_idle is not null then ' (' || v_idle || case when n_idle > 3 then ', ...' else '' end || ')' else '' end); end if;
  v_msg := '☀️ Morning brief: ' || case when cardinality(v_parts) = 0 then '✅ nothing overdue or waiting today' else array_to_string(v_parts, ' · ') end;

  for a in select id, name from public._dg_recipients('brief')
  loop
    if not p_force and exists (select 1 from public.digest_log where kind = 'morning_brief' and recipient_id = a.id and ref = v_today::text) then
      continue;
    end if;
    v_out := v_out || jsonb_build_array(jsonb_build_object('recipient', a.name, 'message', v_msg));
    if p_dry_run then continue; end if;
    begin
      perform public._dg_deliver(a.id, a.name, v_msg, '☀️ Morning brief', regexp_replace(v_msg, '^☀️ Morning brief: ', ''));
      insert into public.digest_log (kind, recipient_id, recipient_name, ref, message) values ('morning_brief', a.id, a.name, v_today::text, v_msg);
    exception when others then
      raise warning 'morning brief failed for %: %', a.name, sqlerrm;
    end;
  end loop;
  return v_out;
end;
$fn$;

-- ======================================================================
-- 2. ESCALATION  (overdue -> admins; waiting review -> the reviewer)
-- ======================================================================
create or replace function public.run_task_escalations(p_dry_run boolean default false, p_force boolean default false)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $fn$
declare
  cfg jsonb := public._dg_setting('escalation');
  v_tz text; v_start int; v_end int; v_local timestamp; v_today date; v_hour int;
  v_od int; v_rh int; v_rep int; v_review_gap interval; v_notify_rev boolean;
  v_items jsonb; v_out jsonb := '[]'::jsonb; a record; r record; v_msg text; v_ids text[];
begin
  select tz, start_hour, end_hour into v_tz, v_start, v_end from public.auto_reminder_settings where id = 1;
  v_local := now() at time zone coalesce(v_tz, 'Africa/Khartoum');
  v_today := v_local::date; v_hour := extract(hour from v_local)::int;
  if not p_force then
    if coalesce((cfg ->> 'enabled')::boolean, false) is not true then return v_out; end if;
    if v_hour < coalesce(v_start, 8) or v_hour >= coalesce(v_end, 20) then return v_out; end if;
  end if;
  v_od  := greatest(1, public._dg_num(cfg, 'overdue_days', 2)::int);
  v_rh  := greatest(1, public._dg_num(cfg, 'review_hours', 24)::int);
  v_rep := greatest(1, public._dg_num(cfg, 'repeat_days', 3)::int);
  v_review_gap := make_interval(hours => greatest(v_rh, 12));
  -- true (default): a task waiting for review nudges ITS reviewer. false: it goes to the escalation recipients instead.
  v_notify_rev := coalesce((cfg ->> 'notify_reviewers')::boolean, true);

  -- 2a. overdue by v_od+ days  ->  every active Admin (one combined message)
  select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'title', x.title, 'who', x.who, 'late', v_today - x.d) order by x.d), '[]'::jsonb) into v_items
  from (select t.id, t.title, m.name as who, public._dg_due(t.due::text) as d
          from public.tasks t left join public.team m on m.id::text = t.assigned_to::text
         where coalesce(t.status,'') not in ('Done','Cancelled')
           and public._dg_due(t.due::text) <= v_today - v_od
           and (p_force or not exists (select 1 from public.digest_log l where l.kind = 'escalation_overdue' and l.ref = t.id::text
                                        and l.sent_at > now() - make_interval(days => v_rep)))) x;
  if jsonb_array_length(v_items) > 0 then
    select '🚨 Escalation: ' || jsonb_array_length(v_items) || ' task' || case when jsonb_array_length(v_items) > 1 then 's' else '' end
           || ' overdue ' || v_od || '+ days - '
           || string_agg(format('"%s" (%s, %sd late)', e.title, coalesce(e.who, 'unassigned'), e.late), ', ')
           || case when jsonb_array_length(v_items) > 5 then ' and ' || (jsonb_array_length(v_items) - 5) || ' more' else '' end
      into v_msg
      from (select * from jsonb_to_recordset(v_items) as q(id text, title text, who text, late int) order by late desc limit 5) e;
    for a in select id, name from public._dg_recipients('escalation') loop
      v_out := v_out || jsonb_build_array(jsonb_build_object('recipient', a.name, 'kind', 'overdue', 'message', v_msg));
      if not p_dry_run then
        begin perform public._dg_deliver(a.id, a.name, v_msg, '🚨 Overdue escalation', regexp_replace(v_msg, '^🚨 Escalation: ', ''));
        exception when others then raise warning 'escalation failed for %: %', a.name, sqlerrm; end;
      end if;
    end loop;
    if not p_dry_run and exists (select 1 from public._dg_recipients('escalation')) then
      insert into public.digest_log (kind, ref, message)
      select 'escalation_overdue', q.id, v_msg from jsonb_to_recordset(v_items) as q(id text);
    end if;
  end if;

  -- 2b. waiting for review longer than v_rh hours  ->  the task's reviewer (admins if none)
  select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'title', t.title, 'who', m.name, 'hours', round(extract(epoch from (now() - t.ts_submitted)) / 3600), 'reviewer', t.reviewer::text)), '[]'::jsonb) into v_items
    from public.tasks t left join public.team m on m.id::text = t.assigned_to::text
   where t.status = 'Pending Review' and t.ts_submitted is not null
     and t.ts_submitted <= now() - make_interval(hours => v_rh)
     and (p_force or not exists (select 1 from public.digest_log l where l.kind = 'escalation_review' and l.ref = t.id::text and l.sent_at > now() - v_review_gap));
  if jsonb_array_length(v_items) > 0 then
    for r in
      select rc.id as rid, rc.name as rname, count(*) as n,
             string_agg(format('"%s" (%s, %sd)', q.title, coalesce(q.who, 'unassigned'), greatest(1, round(q.hours / 24))), ', ' order by q.hours desc) as lst
        from jsonb_to_recordset(v_items) as q(id text, title text, who text, hours numeric, reviewer text)
        join lateral (
          select tm.id, tm.name from public.team tm
           where v_notify_rev and coalesce(tm.status,'Active') = 'Active' and tm.id::text = q.reviewer
          union
          select rcp.id, rcp.name from public._dg_recipients('escalation') rcp
           where not (v_notify_rev and exists (select 1 from public.team rv where rv.id::text = q.reviewer and coalesce(rv.status,'Active') = 'Active'))
        ) rc on true
       group by rc.id, rc.name
    loop
      v_msg := '🔍 ' || r.n || ' task' || case when r.n > 1 then 's' else '' end || ' waiting for review ' || v_rh || '+ hours: ' || r.lst;
      v_out := v_out || jsonb_build_array(jsonb_build_object('recipient', r.rname, 'kind', 'review', 'message', v_msg));
      if not p_dry_run then
        begin perform public._dg_deliver(r.rid, r.rname, v_msg, '🔍 Review waiting', regexp_replace(v_msg, '^🔍 ', ''));
        exception when others then raise warning 'review escalation failed for %: %', r.rname, sqlerrm; end;
      end if;
    end loop;
    if not p_dry_run then
      insert into public.digest_log (kind, ref, message) select 'escalation_review', q.id, 'review nudge' from jsonb_to_recordset(v_items) as q(id text);
    end if;
  end if;
  return v_out;
end;
$fn$;

-- ======================================================================
-- 3. WEEKLY TEAM REPORT  (to every active Admin, once a week)
-- ======================================================================
create or replace function public.run_weekly_report(p_dry_run boolean default false, p_force boolean default false)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $fn$
declare
  cfg jsonb := public._dg_setting('weekly_report');
  v_tz text; v_end int; v_local timestamp; v_today date; v_hour int; v_week text;
  v_since timestamptz := now() - interval '7 days';
  n_created int; n_done int; n_open int; n_over int;
  v_top text; v_attn text; v_msg text; v_out jsonb := '[]'::jsonb; a record;
begin
  select tz, end_hour into v_tz, v_end from public.auto_reminder_settings where id = 1;
  v_local := now() at time zone coalesce(v_tz, 'Africa/Khartoum');
  v_today := v_local::date; v_hour := extract(hour from v_local)::int;
  v_week := date_trunc('week', v_local)::date::text;
  if not p_force then
    if coalesce((cfg ->> 'enabled')::boolean, false) is not true then return v_out; end if;
    if extract(isodow from v_local)::int <> public._dg_num(cfg, 'day', 1)::int then return v_out; end if;
    if v_hour < public._dg_num(cfg, 'hour', 8) or v_hour >= coalesce(v_end, 20) then return v_out; end if;
  end if;

  select count(*) into n_created from public.tasks t where t.created_at >= v_since;
  select count(*) into n_done    from public.tasks t where t.status = 'Done' and t.ts_reviewed >= v_since;
  select count(*) into n_open    from public.tasks t where coalesce(t.status,'') not in ('Done','Cancelled');
  select count(*) into n_over    from public.tasks t where coalesce(t.status,'') not in ('Done','Cancelled') and public._dg_due(t.due::text) < v_today;

  select string_agg(format('%s %s', s.name, s.done), ', ' order by s.done desc, s.name) into v_top
  from (select m.name, count(*) as done from public.tasks t join public.team m on m.id::text = t.assigned_to::text
         where t.status = 'Done' and t.ts_reviewed >= v_since and coalesce(m.status,'Active') = 'Active'
         group by m.name order by count(*) desc, m.name limit 3) s;
  select string_agg(format('%s %s', s.name, s.late), ', ' order by s.late desc, s.name) into v_attn
  from (select m.name, count(*) as late from public.tasks t join public.team m on m.id::text = t.assigned_to::text
         where coalesce(t.status,'') not in ('Done','Cancelled') and public._dg_due(t.due::text) < v_today and coalesce(m.status,'Active') = 'Active'
         group by m.name order by count(*) desc, m.name limit 3) s;

  v_msg := '📊 Weekly report (' || to_char(v_today - 6, 'Mon DD') || ' - ' || to_char(v_today, 'Mon DD') || '): '
        || n_done || ' done · ' || n_created || ' created · ' || n_open || ' open · ' || n_over || ' overdue'
        || case when v_top  is not null then ' · 🏆 Done: ' || v_top  else '' end
        || case when v_attn is not null then ' · ⚠️ Overdue: ' || v_attn else '' end;

  for a in select id, name from public._dg_recipients('weekly')
  loop
    if not p_force and exists (select 1 from public.digest_log where kind = 'weekly_report' and recipient_id = a.id and ref = v_week) then
      continue;
    end if;
    v_out := v_out || jsonb_build_array(jsonb_build_object('recipient', a.name, 'message', v_msg));
    if p_dry_run then continue; end if;
    begin
      perform public._dg_deliver(a.id, a.name, v_msg, '📊 Weekly team report', regexp_replace(v_msg, '^📊 Weekly report ', ''));
      insert into public.digest_log (kind, recipient_id, recipient_name, ref, message) values ('weekly_report', a.id, a.name, v_week, v_msg);
    exception when others then
      raise warning 'weekly report failed for %: %', a.name, sqlerrm;
    end;
  end loop;
  return v_out;
end;
$fn$;

-- ---- preview for the Settings page (sends nothing) --------------------
create or replace function public.digest_preview(p_kind text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $fn$
begin
  if    p_kind = 'morning_brief' then return public.run_morning_brief(true, true);
  elsif p_kind = 'escalation'    then return public.run_task_escalations(true, true);
  elsif p_kind = 'weekly_report' then return public.run_weekly_report(true, true);
  else raise exception 'unknown digest kind %', p_kind; end if;
end;
$fn$;
grant execute on function public.digest_preview(text) to anon, authenticated;

revoke all on function public.run_morning_brief(boolean, boolean)    from public, anon, authenticated;
revoke all on function public.run_task_escalations(boolean, boolean) from public, anon, authenticated;
revoke all on function public.run_weekly_report(boolean, boolean)    from public, anon, authenticated;
revoke all on function public._dg_deliver(uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public._dg_recipients(text) from public, anon, authenticated;

-- ---- schedules (each job also checks its own on/off, day and hour) ----
do $$ begin perform cron.unschedule('digest-morning-brief'); exception when others then null; end $$;
do $$ begin perform cron.unschedule('digest-escalations');   exception when others then null; end $$;
do $$ begin perform cron.unschedule('digest-weekly-report'); exception when others then null; end $$;
select cron.schedule('digest-morning-brief', '*/15 * * * *',    'select public.run_morning_brief(false, false);');
select cron.schedule('digest-escalations',   '7,37 * * * *',    'select public.run_task_escalations(false, false);');
select cron.schedule('digest-weekly-report', '*/15 * * * *',    'select public.run_weekly_report(false, false);');
