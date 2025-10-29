-- Daily stats cache tables

create table if not exists auth_daily_stats_cache (
  month text not null,
  user_id uuid not null,
  total integer not null default 0,
  marked_days bit(31) not null default B'0',
  marked_dates text[] not null default ARRAY[]::text[],
  calculated_at timestamptz not null default now(),
  source_version text not null default 'bootstrap',
  primary key (month, user_id)
);

create index if not exists idx_auth_daily_stats_cache_user_month
  on auth_daily_stats_cache(user_id, month);

create table if not exists auth_daily_totals_cache (
  month text not null,
  day date not null,
  total integer not null default 0,
  calculated_at timestamptz not null default now(),
  source_version text not null default 'bootstrap',
  primary key (day)
);

create index if not exists idx_auth_daily_totals_cache_month
  on auth_daily_totals_cache(month);

create table if not exists auth_daily_stats_tasks (
  month text primary key,
  status text not null check (status in ('pending','running','succeeded','failed')),
  last_started_at timestamptz,
  last_finished_at timestamptz,
  last_error text
);

create table if not exists auth_daily_stats_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  entry_date date not null,
  action text not null check (action in ('add','remove')),
  source text not null,
  status text not null default 'pending' check (status in ('pending','processing','done','failed')),
  locked_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_auth_daily_stats_jobs_status_locked
  on auth_daily_stats_jobs(status, locked_at);
