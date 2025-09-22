-- Schema for DailyPing
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Keep users.email in sync from auth if desired (optional)
-- You can create a trigger to mirror auth.users.email.

create table if not exists public.entries (
  id bigserial primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  entry_date date not null default ((now() at time zone 'Asia/Tokyo')::date),
  edited_by_admin uuid references public.users(id),
  edit_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trig_entries_updated_at on public.entries;
create trigger trig_entries_updated_at before update on public.entries
for each row execute function public.set_updated_at();

-- Trusted device/session registry (admin can revoke)
create extension if not exists pgcrypto;
create table if not exists public.trusted_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  device_id text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked boolean not null default false
);
create index if not exists idx_trusted_sessions_user on public.trusted_sessions(user_id);

