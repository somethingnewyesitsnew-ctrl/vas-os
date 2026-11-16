-- Shared app settings (service test areas, login reminder days).
-- Run once in Supabase -> SQL Editor. Safe to re-run.
create table if not exists public.app_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

alter table public.app_settings enable row level security;
drop policy if exists "Allow all access to app_settings" on public.app_settings;
create policy "Allow all access to app_settings"
  on public.app_settings for all
  using (true) with check (true);
