-- ======================================================================
-- Login reminders (per-member opt-in) + reliable push-state saving
--
-- RUN THIS ONCE in Supabase -> SQL Editor BEFORE the matching app build
-- goes live on the server. The app tolerates the migration being missing
-- (the new features just stay off), but nothing will be saved until it
-- has been run.
--
-- BEFORE RUNNING: confirm team_public still has exactly the columns listed
-- below, in this order, by running:
--     select pg_get_viewdef('public.team_public'::regclass, true);
-- If it lists a column that is not in the select below, add it to the
-- list (before login_reminder_active) or the CREATE OR REPLACE VIEW will
-- fail with "cannot drop columns from view". Failing is harmless: the
-- whole script is one transaction and nothing is changed.
--
-- What it does:
--   1. team.login_reminder_active  -> the per-member ON/OFF switch (default OFF,
--      so nothing changes for anyone until you switch a member on).
--   2. login_reminders             -> a log of every "please log in" reminder
--      sent (who, when, how many days they had been away).
--   3. team_public                 -> now also exposes login_reminder_active.
--   4. set_login_reminder()        -> lets the app flip that switch (team is
--      RLS-locked, so direct writes are blocked by design).
--   5. set_member_push_state()     -> lets the app save "push enabled" on
--      the member row. The old direct PATCH on team was silently blocked by
--      RLS, so team.push_enabled never actually persisted.
-- ======================================================================

begin;

-- 1. Per-member switch (OFF by default)
alter table public.team
  add column if not exists login_reminder_active boolean not null default false;

-- 2. Reminder log
create table if not exists public.login_reminders (
  id               uuid primary key default gen_random_uuid(),
  member_id        uuid not null references public.team(id) on delete cascade,
  member_name      text,
  sent_at          timestamptz not null default now(),
  days_inactive    integer,
  last_login_at    timestamptz,
  sent_by          text,
  channel          text default 'push + in-app'
);

create index if not exists login_reminders_member_idx
  on public.login_reminders (member_id, sent_at desc);

alter table public.login_reminders enable row level security;
drop policy if exists "Allow all access to login_reminders" on public.login_reminders;
create policy "Allow all access to login_reminders"
  on public.login_reminders for all
  using (true) with check (true);

-- 3. Expose the new switch through the public roster view.
--    (New columns can only be appended at the END of a view.)
create or replace view public.team_public as
select
  id,
  name,
  role,
  dept,
  access,
  status,
  email,
  wa,
  notes,
  color,
  av,
  created_at,
  username,
  last_login,
  tut_done,
  member_type,
  push_enabled,
  push_updated_at,
  perm_overrides,
  auto_reminders_active,
  login_reminder_active
from public.team;

grant select on public.team_public to anon, authenticated;

-- 4. Flip the per-member switch
create or replace function public.set_login_reminder(p_member_id uuid, p_active boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.team
     set login_reminder_active = coalesce(p_active, false)
   where id = p_member_id;
  return found;
end;
$$;
grant execute on function public.set_login_reminder(uuid, boolean) to anon, authenticated;

-- 5. Save push on/off on the member row
create or replace function public.set_member_push_state(p_member_id uuid, p_enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.team
     set push_enabled = coalesce(p_enabled, false),
         push_updated_at = now()
   where id = p_member_id;
  return found;
end;
$$;
grant execute on function public.set_member_push_state(uuid, boolean) to anon, authenticated;

commit;
