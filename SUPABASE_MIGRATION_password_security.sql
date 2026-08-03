-- ══════════════════════════════════════════════════════════════════════
-- PASSWORD SECURITY MIGRATION
-- Run this in Supabase → SQL Editor (once).
--
-- What it does:
--  1. Hashes every existing plaintext password in `team` with bcrypt.
--  2. Creates `team_public` — the same table minus the password column —
--     for the app to read from instead of `team` directly.
--  3. Adds `verify_login()` — checks username+password server-side and
--     returns the member row (no password) only on a match.
--  4. Adds `set_member_password()` — the only way to write a password
--     from now on.
--  5. Revokes SELECT on `team` from the public/anon API and revokes
--     direct INSERT/UPDATE of the password column, so the raw password
--     column can no longer be read or written over the API even with
--     the anon key.
--
-- IMPORTANT — read before running:
-- This app authenticates with a shared "anon" API key for every request
-- (there's no per-user Supabase Auth session). That means row-level
-- security still can't tell "an admin in the app" apart from "anyone
-- with the anon key" at the database layer — this migration closes the
-- specific password-leak hole, but it is not a substitute for migrating
-- to real Supabase Auth if you want true per-user access control later.
-- ══════════════════════════════════════════════════════════════════════

-- 1. Hashing support
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Hash any password that isn't already a bcrypt hash (idempotent —
--    safe to run more than once; bcrypt hashes always start with $2)
UPDATE team
SET password = crypt(password, gen_salt('bf'))
WHERE password IS NOT NULL
  AND password NOT LIKE '$2%';

-- 3. team_public — every column except password.
--    Built dynamically so it stays correct even if you add/rename
--    columns on `team` later.
DO $$
DECLARE
  cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
  INTO cols
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'team'
    AND column_name <> 'password';

  EXECUTE format('CREATE OR REPLACE VIEW team_public AS SELECT %s FROM team', cols);
END $$;

GRANT SELECT ON team_public TO anon, authenticated;

-- 4. verify_login — the only place a password is ever checked.
--    SECURITY DEFINER so it can read the password column even though
--    anon no longer can; returns nothing (no row) if the login fails.
CREATE OR REPLACE FUNCTION verify_login(p_identifier text, p_password text)
RETURNS SETOF team_public
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT tp.* FROM team_public tp
  JOIN team t ON t.id = tp.id
  WHERE (
      lower(t.username) = lower(p_identifier)
      OR lower(split_part(t.name, ' ', 1)) = lower(p_identifier)
      OR lower(replace(t.name, ' ', '')) = lower(p_identifier)
      OR lower(t.name) = lower(p_identifier)
    )
    AND t.password IS NOT NULL
    AND crypt(p_password, t.password) = t.password
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION verify_login(text, text) TO anon, authenticated;

-- 5. set_member_password — the only way to write a password from now on.
--    NOTE: because there is no real per-user session at the DB layer,
--    this function is callable by anyone holding the anon key, same as
--    every other write in this app today. It stops passwords from ever
--    being sent or stored in plaintext over the wire, but it does not
--    add authorization beyond what the rest of the app already has.
--    Real protection for this RPC requires migrating to Supabase Auth.
CREATE OR REPLACE FUNCTION set_member_password(p_member_id uuid, p_new_password text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE team
  SET password = crypt(p_new_password, gen_salt('bf'))
  WHERE id = p_member_id;
$$;

GRANT EXECUTE ON FUNCTION set_member_password(uuid, text) TO anon, authenticated;

-- 6. Lock the base table down:
--    - no more direct SELECT on `team` (use team_public instead)
--    - no more direct INSERT/UPDATE of the password column
--      (the app no longer sends it directly, but this blocks it at
--      the DB layer too, in case a client ever tries)
REVOKE SELECT ON team FROM anon, authenticated;
REVOKE INSERT (password), UPDATE (password) ON team FROM anon, authenticated;

-- Sanity check — should return 0 rows (no plaintext passwords left)
-- SELECT id, name FROM team WHERE password NOT LIKE '$2%';
