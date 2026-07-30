-- Run this in Supabase → SQL Editor after the Telegram switch.
-- Renames the old WhatsApp column to hold Telegram Chat IDs instead,
-- and drops the now-unused CallMeBot API key column.

ALTER TABLE team RENAME COLUMN wa TO telegram;
ALTER TABLE team DROP COLUMN IF EXISTS wa_apikey;

-- Optional: if CU.telegram gets auto-saved by the "Test" button in
-- Settings before this migration runs, that write will fail silently
-- (missing column) until you run this. Safe to run any time before
-- or after deploying the code — the app writes with the same shape either way.
