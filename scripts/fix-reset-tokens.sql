-- Fix password_reset_tokens table
-- Issue 1: user_id is uuid but subscribers.id is text (e.g. "sub_l0c6p2n8")
-- Issue 2: RLS policy is not working — recreate it

-- Drop the existing table and recreate with correct types
drop table if exists password_reset_tokens;

create table password_reset_tokens (
  id          uuid default gen_random_uuid() primary key,
  user_id     text not null,
  token       text not null unique,
  expires_at  timestamptz not null,
  created_at  timestamptz default now()
);

-- Index for fast token lookups
create index idx_password_reset_tokens_token
  on password_reset_tokens(token);

-- Index for cleanup queries by user
create index idx_password_reset_tokens_user_id
  on password_reset_tokens(user_id);

-- Enable RLS
alter table password_reset_tokens enable row level security;

-- Policy: allow all operations for anon and service_role (server-side API routes)
create policy "Allow all for anon"
  on password_reset_tokens
  for all
  to anon
  using (true)
  with check (true);

create policy "Allow all for service_role"
  on password_reset_tokens
  for all
  to service_role
  using (true)
  with check (true);
