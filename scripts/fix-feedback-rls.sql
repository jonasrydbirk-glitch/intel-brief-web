-- Fix feedback table RLS
-- Problem: RLS is enabled but no policy grants the anon role insert access,
-- so the server-side API route (which uses the anon key) gets rejected.

-- Ensure the table exists with the expected schema
create table if not exists feedback (
  id          uuid default gen_random_uuid() primary key,
  user_id     text not null,
  message     text not null,
  created_at  timestamptz default now()
);

-- Enable RLS (idempotent)
alter table feedback enable row level security;

-- Drop existing policies if any (avoids "already exists" errors)
drop policy if exists "Allow all for anon"      on feedback;
drop policy if exists "Allow all for service_role" on feedback;

-- Allow the anon role full access (used by server-side API routes)
create policy "Allow all for anon"
  on feedback
  for all
  to anon
  using (true)
  with check (true);

-- Allow service_role full access as well
create policy "Allow all for service_role"
  on feedback
  for all
  to service_role
  using (true)
  with check (true);
