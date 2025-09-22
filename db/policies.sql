-- Enable RLS
alter table public.users enable row level security;
alter table public.entries enable row level security;
alter table public.trusted_sessions enable row level security;

-- Helper: is current user admin?
create or replace function public.is_admin(uid uuid)
returns boolean language sql stable as $$
  select coalesce((select is_admin from public.users where id = uid), false);
$$;

-- Users policies
drop policy if exists users_self_select on public.users;
create policy users_self_select on public.users
  for select using (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists users_self_update on public.users;
create policy users_self_update on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Entries policies
drop policy if exists entries_member_select on public.entries;
create policy entries_member_select on public.entries
  for select using (
    user_id = auth.uid() or public.is_admin(auth.uid())
  );

drop policy if exists entries_member_insert_today on public.entries;
create policy entries_member_insert_today on public.entries
  for insert with check (
    user_id = auth.uid()
    and entry_date = (now() at time zone 'Asia/Tokyo')::date
  );

drop policy if exists entries_admin_all on public.entries;
create policy entries_admin_all on public.entries
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Trusted sessions: user sees/manages own; admin all
drop policy if exists trusted_sessions_member on public.trusted_sessions;
create policy trusted_sessions_member on public.trusted_sessions
  for all using (user_id = auth.uid() or public.is_admin(auth.uid()))
  with check (user_id = auth.uid() or public.is_admin(auth.uid()));

