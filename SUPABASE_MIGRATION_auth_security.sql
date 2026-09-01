-- ======================================================================
-- Server-side auth + password-leak fix
--
-- Problem this closes: the `team` table's `password` (and `wa_apikey`,
-- a WhatsApp API key) columns were selectable by the anon key, meaning
-- every member's plaintext password -- and the WhatsApp API key --
-- were fetchable directly via the Supabase REST API before login even
-- completed. This migration:
--   1. Creates `team_public`, a security-definer view of `team`
--      excluding `password` and `wa_apikey`, for the client to read
--      the roster from.
--   2. Enables RLS on `team` with no SELECT policy for anon/authenticated
--      -- direct reads are fully blocked; only SECURITY DEFINER
--      functions (which bypass RLS) can read `password`/`wa_apikey`.
--   3. Adds `verify_login()` -- checks a member_id/password pair
--      server-side, stamps `last_login` on success, and returns only
--      a boolean, never the password itself.
--   4. Adds `upsert_member()` -- creates/updates a member (including
--      setting a password) without the client ever needing write
--      access to `team` directly. New members with no password given
--      get a random 10-char generated one, returned once to the caller.
--
-- This file is a record of what is already live in production
-- (verified against the actual Supabase dashboard definitions on
-- 2026-09-01) -- it is NOT meant to be re-run. Running it again would
-- error on the already-existing view/functions/policies.
-- ======================================================================

-- 1. Public view: excludes password and wa_apikey
create view public.team_public as
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
  auto_reminders_active
from
  team;

grant select on team_public to anon, authenticated;

-- 2. Lock down the base table
alter table team enable row level security;

-- No SELECT policy for anon/authenticated -> all direct reads blocked.
-- Writes go through upsert_member() below; there is no INSERT/UPDATE/
-- DELETE policy granting the anon key direct write access either.

-- 3. Login verification -- SECURITY DEFINER bypasses RLS to read
-- `password`, but only ever returns true/false, never the value itself.
-- Also stamps last_login on a successful check.
create or replace function public.verify_login(p_member_id uuid, p_password text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare ok boolean;
begin
  select (password = p_password) into ok from team where id = p_member_id;
  if ok then
    update team set last_login = now() where id = p_member_id;
  end if;
  return coalesce(ok, false);
end;
$$;

grant execute on function public.verify_login(uuid, text) to anon, authenticated;

-- 4. Member create/update -- also SECURITY DEFINER, so it can write to
-- `team` (including password) despite RLS blocking direct client writes.
--
-- Create path (p_id is null): if no password is given, generates a
-- random 10-char temp password and returns it (once) alongside the new
-- row's id -- this is the only time the generated password is ever
-- surfaced to the client.
--
-- Update path (p_id is not null): NULL/empty password leaves the
-- existing password untouched. Note this branch does NOT update
-- `color` or `av` -- only the create path sets those.
create or replace function public.upsert_member(
  p_id uuid,
  p_name text,
  p_role text,
  p_dept text,
  p_access text,
  p_status text,
  p_email text,
  p_wa text,
  p_member_type text,
  p_perm_overrides jsonb,
  p_auto_reminders_active boolean,
  p_color text,
  p_av text,
  p_username text,
  p_password text
)
returns table(id uuid, generated_password text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_gen_pass text;
begin
  if p_id is null then
    -- new member: generate a random temp password if none was given
    if p_password is null or p_password = '' then
      v_gen_pass := substr(md5(random()::text || clock_timestamp()::text), 1, 10);
    else
      v_gen_pass := p_password;
    end if;
    insert into team(name, role, dept, access, status, email, wa, color, av,
      username, password, member_type, perm_overrides, auto_reminders_active)
    values (p_name, p_role, p_dept, coalesce(p_access,'Member'), 'Active',
      coalesce(p_email,''), coalesce(p_wa,''), p_color, p_av,
      coalesce(p_username, lower(split_part(p_name,' ',1))), v_gen_pass,
      coalesce(p_member_type,''), coalesce(p_perm_overrides,'{}'::jsonb),
      coalesce(p_auto_reminders_active, true))
    returning team.id into v_id;
    return query select v_id, v_gen_pass;
  else
    update team set
      name=p_name, role=p_role, dept=p_dept, access=p_access,
      email=coalesce(p_email,''), wa=coalesce(p_wa,''),
      username=coalesce(p_username, username),
      member_type=coalesce(p_member_type,''),
      perm_overrides=coalesce(p_perm_overrides,'{}'::jsonb),
      auto_reminders_active=coalesce(p_auto_reminders_active, true),
      password = case when p_password is not null and p_password <> ''
                       then p_password else password end
    where team.id = p_id;
    return query select p_id, null::text;
  end if;
end;
$$;

grant execute on function public.upsert_member(uuid, text, text, text, text, text, text, text, text, jsonb, boolean, text, text, text, text) to anon, authenticated;
