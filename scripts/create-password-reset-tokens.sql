-- Password Reset Tokens table for IQsea
-- Run this in Supabase SQL Editor

create table if not exists password_reset_tokens (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid not null references subscribers(id) on delete cascade,
  token       text not null unique,
  expires_at  timestamptz not null,
  created_at  timestamptz default now()
);

-- Index for fast token lookups
create index if not exists idx_password_reset_tokens_token
  on password_reset_tokens(token);

-- Index for cleanup queries by user
create index if not exists idx_password_reset_tokens_user_id
  on password_reset_tokens(user_id);

-- Enable RLS (but allow service-role / anon key full access for server-side usage)
alter table password_reset_tokens enable row level security;

-- Policy: allow all operations via the anon/service key (server-side only)
create policy "Server-side access for password_reset_tokens"
  on password_reset_tokens
  for all
  using (true)
  with check (true);
