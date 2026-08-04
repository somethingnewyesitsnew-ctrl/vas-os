-- Run this once in Supabase → SQL Editor to enable Web Push notifications.
-- Stores one row per (member, device/browser) subscription. A member who
-- enables push on their phone AND their laptop gets two rows — each is
-- notified independently.

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references team(id) on delete cascade,
  member_name text,
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz default now()
);

create index if not exists push_subscriptions_member_id_idx on push_subscriptions(member_id);

-- Matches the permissive-access pattern already used by every other table
-- in this app (client talks to Supabase directly with the anon key).
alter table push_subscriptions enable row level security;

drop policy if exists "Allow all access to push_subscriptions" on push_subscriptions;
create policy "Allow all access to push_subscriptions"
  on push_subscriptions for all
  using (true)
  with check (true);
