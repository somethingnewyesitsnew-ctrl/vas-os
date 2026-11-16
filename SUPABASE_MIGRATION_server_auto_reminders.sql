-- ======================================================================
-- Server-side Automatic Task Reminders (runs even when nobody has the app open)
--
-- Run ONCE in Supabase -> SQL Editor. Safe to re-run.
--
-- What it does:
--   * Every 15 minutes the database itself checks the reminder settings
--     (Settings -> Automatic Task Reminders) and, for every active member
--     whose "Automatic Task Reminders" box is ticked, sends ONE combined
--     check-in: new tasks not opened yet, overdue tasks, tasks due soon.
--   * Each reminder is saved as an in-app notification AND pushed to the
--     member's phone/computer through the send-push Edge Function.
--   * Only sends between the start and end hour set in Settings (default
--     08:00 to 20:00, Khartoum time), so nobody is pinged at night.
--   * Respects the "Check every N hours" setting per member (a member is
--     never reminded again until N hours after their last reminder).
--   * Sends nothing to a member who has nothing to be told.
--   * Every send is recorded in auto_reminder_log.
--
-- The app stops sending these from open browser tabs as soon as
-- auto_reminder_settings.server_side is true (set at the end of this file),
-- so nobody gets every reminder twice.
-- ======================================================================

-- Extensions (if either line errors with a permission message, enable
-- "pg_cron" and "pg_net" under Database -> Extensions, then run this again)
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net  with schema extensions;

-- Settings additions
alter table public.auto_reminder_settings
  add column if not exists start_hour  smallint not null default 8,
  add column if not exists end_hour    smallint not null default 20,
  add column if not exists tz          text     not null default 'Africa/Khartoum',
  add column if not exists server_side boolean  not null default false;

-- Log of what was sent
create table if not exists public.auto_reminder_log (
  id              uuid primary key default gen_random_uuid(),
  member_id       uuid not null,
  member_name     text,
  sent_at         timestamptz not null default now(),
  new_count       integer not null default 0,
  overdue_count   integer not null default 0,
  due_soon_count  integer not null default 0,
  message         text
);
create index if not exists auto_reminder_log_member_idx
  on public.auto_reminder_log (member_id, sent_at desc);
alter table public.auto_reminder_log enable row level security; -- no policies: only the server job writes/reads it

-- The job
create or replace function public.run_auto_task_reminders(p_dry_run boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $fn$
declare
  c_url  constant text := 'https://duglbebwhtuijnduwmvz.supabase.co/functions/v1/send-push';
  c_key  constant text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1Z2xiZWJ3aHR1aWpuZHV3bXZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MzQ1NjgsImV4cCI6MjA5MTUxMDU2OH0.0VFefKrp6Zzp9FbvJybzTwxQfK1nCRa8N_ncJrd9xws';
  cfg      record;
  m        record;
  v_now    timestamptz := now();
  v_local  timestamp;
  v_today  date;
  v_hour   int;
  v_gap    interval;
  v_last   timestamptz;
  n_new    int;
  n_over   int;
  n_soon   int;
  v_lines  text[];
  v_body   text;
  v_out    jsonb := '[]'::jsonb;
begin
  select * into cfg from public.auto_reminder_settings where id = 1;
  if not found or coalesce(cfg.enabled, false) is not true then
    return v_out;                                   -- switched off in Settings
  end if;

  v_local := v_now at time zone coalesce(cfg.tz, 'Africa/Khartoum');
  v_today := v_local::date;
  v_hour  := extract(hour from v_local)::int;
  if v_hour < coalesce(cfg.start_hour, 8) or v_hour >= coalesce(cfg.end_hour, 20) then
    return v_out;                                   -- outside the allowed hours
  end if;

  -- 14 minutes of slack so a 15-minute job never drifts a whole cycle late
  -- interval_hours may be integer, numeric or text depending on how the column was created
  v_gap := make_interval(hours => greatest(1, round(coalesce(nullif(cfg.interval_hours::text, '')::numeric, 4))::int)) - interval '14 minutes';

  for m in
    select id, name from public.team
     where coalesce(status, 'Active') = 'Active'
       and auto_reminders_active is not false
  loop
    begin
      select max(sent_at) into v_last from public.auto_reminder_log where member_id = m.id;
      if v_last is not null and v_now - v_last < v_gap then
        continue;                                   -- reminded too recently
      end if;

      select
        count(*) filter (where t.status = 'New' and t.ts_opened is null),
        count(*) filter (where d.due_date is not null and d.due_date <  v_today),
        count(*) filter (where d.due_date is not null and d.due_date between v_today and v_today + 2)
        into n_new, n_over, n_soon
      from public.tasks t
      cross join lateral (
        select case when t.due::text ~ '^\d{4}-\d{2}-\d{2}' then left(t.due::text, 10)::date end as due_date
      ) d
      where coalesce(t.status, '') not in ('Done', 'Cancelled')
        and ( t.assigned_to::text = m.id::text
              or (t.assignees is not null and to_jsonb(t.assignees) ? m.id::text) );

      if n_new = 0 and n_over = 0 and n_soon = 0 then
        continue;                                   -- nothing to say this round
      end if;

      v_lines := array[]::text[];
      if n_new  > 0 then v_lines := v_lines || format('📥 %s new task%s not opened yet', n_new,  case when n_new  > 1 then 's' else '' end); end if;
      if n_over > 0 then v_lines := v_lines || format('🚨 %s overdue task%s',            n_over, case when n_over > 1 then 's' else '' end); end if;
      if n_soon > 0 then v_lines := v_lines || format('⏰ %s task%s due soon',            n_soon, case when n_soon > 1 then 's' else '' end); end if;
      v_body := array_to_string(v_lines, ' · ');

      v_out := v_out || jsonb_build_array(jsonb_build_object(
        'member', m.name, 'new', n_new, 'overdue', n_over, 'due_soon', n_soon));

      if p_dry_run then
        continue;                                   -- preview only: send/log nothing
      end if;

      -- 1) in-app notification (same shape the app writes itself)
      insert into public.notifications (to_name, from_name, message, type, task_title, admins_only, read_by)
      select r.to_name, r.from_name, r.message, r.type, r.task_title, r.admins_only, r.read_by
        from jsonb_populate_record(null::public.notifications, jsonb_build_object(
               'to_name', m.name, 'from_name', 'System',
               'message', 'Task check-in: ' || v_body,
               'type', 'Reminder', 'task_title', '', 'admins_only', false,
               'read_by', '[]'::jsonb)) r;

      -- 2) push to the member's devices (needs the send-push Edge Function)
      perform net.http_post(
        url     := c_url,
        headers := jsonb_build_object('Content-Type', 'application/json',
                                      'apikey', c_key, 'Authorization', 'Bearer ' || c_key),
        body    := jsonb_build_object('member_id', m.id::text,
                                      'title', '⏰ Task check-in', 'body', v_body)
      );

      -- 3) log it
      insert into public.auto_reminder_log (member_id, member_name, new_count, overdue_count, due_soon_count, message)
      values (m.id, m.name, n_new, n_over, n_soon, v_body);

    exception when others then
      raise warning 'auto task reminder failed for member % (%): %', m.name, m.id, sqlerrm;
    end;
  end loop;

  return v_out;
end;
$fn$;

-- Nobody can call it through the public API; only the database scheduler runs it
revoke all on function public.run_auto_task_reminders(boolean) from public, anon, authenticated;

-- Schedule: every 15 minutes (re-running this file just replaces the schedule)
do $$ begin perform cron.unschedule('auto-task-reminders'); exception when others then null; end $$;
select cron.schedule('auto-task-reminders', '*/15 * * * *', 'select public.run_auto_task_reminders(false);');

-- Tell the app the server is now doing this, so open tabs stop sending duplicates
update public.auto_reminder_settings set server_side = true where id = 1;
