create extension if not exists pgcrypto;

create table if not exists public.auth_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  name text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.auth_entries (
  id bigserial primary key,
  user_id uuid not null references public.auth_users(id) on delete cascade,
  entry_date date not null,
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

drop trigger if exists trig_auth_entries_updated_at on public.auth_entries;
create trigger trig_auth_entries_updated_at before update on public.auth_entries
for each row execute function public.set_updated_at();

