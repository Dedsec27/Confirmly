-- Confirmly core workspace persistence
-- Run this once in Supabase SQL Editor after customers.sql.

create table if not exists public.workspace_state (
  workspace_key text primary key,
  state jsonb not null default '{"settings":{},"appointments":[],"customers":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists workspace_state_updated_at_idx
  on public.workspace_state (updated_at desc);

alter table public.workspace_state enable row level security;
