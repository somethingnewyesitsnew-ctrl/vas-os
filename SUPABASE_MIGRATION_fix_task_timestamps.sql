-- ══════════════════════════════════════════════════════════════════════
-- FIX: task timestamps always showing 02:00
--
-- Cause: ts_started / ts_submitted (and possibly ts_reviewed / ts_archived)
-- on the `tasks` table are typed as `date` instead of `timestamptz`.
-- Postgres silently truncates anything written to a `date` column down to
-- midnight UTC. The browser then displays UTC midnight in local time —
-- and since Sudan is UTC+2, that's always exactly 02:00, for every task,
-- regardless of when the action actually happened.
--
-- Run this once in Supabase → SQL Editor.
--
-- IMPORTANT: this fixes it going forward only. Rows that already went
-- through the bug had their real time-of-day discarded at write time —
-- there's nothing left to recover for those; new writes will be correct.
-- ══════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  col text;
BEGIN
  FOREACH col IN ARRAY ARRAY['ts_started','ts_submitted','ts_reviewed','ts_archived','ts_opened']
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='tasks' AND column_name=col
        AND data_type <> 'timestamp with time zone'
    ) THEN
      EXECUTE format('ALTER TABLE tasks ALTER COLUMN %I TYPE timestamptz USING %I::timestamptz', col, col);
      RAISE NOTICE 'Converted tasks.% to timestamptz', col;
    ELSE
      RAISE NOTICE 'tasks.% already timestamptz (or does not exist) — skipped', col;
    END IF;
  END LOOP;
END $$;

-- Sanity check afterward — should list all 5 as "timestamp with time zone"
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='tasks'
--   AND column_name IN ('ts_started','ts_submitted','ts_reviewed','ts_archived','ts_opened');
