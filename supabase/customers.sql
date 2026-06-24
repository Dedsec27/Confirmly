create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  workspace_key text not null,
  name text not null,
  phone text,
  email text,
  preferred_channel text not null default 'Email',
  reminder_consent boolean not null default false,
  marketing_consent boolean not null default false,
  whatsapp_opt_in boolean not null default false,
  source text not null default 'qr_form',
  created_at timestamptz not null default now()
);

create index if not exists customers_workspace_key_idx
  on public.customers (workspace_key, created_at desc);

alter table public.customers enable row level security;
