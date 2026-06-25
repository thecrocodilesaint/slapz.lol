create table if not exists public.app_users (
  id text primary key,
  email text unique not null,
  password_hash text not null,
  role text not null default 'user',
  account_status text not null default 'active',
  account_status_updated_at timestamptz,
  profile_handle text,
  profile_path text,
  profile_url text,
  dashboard_settings jsonb not null default '{}'::jsonb,
  snake_high_score integer not null default 0,
  onboarding_completed boolean not null default false,
  onboarding_skipped boolean not null default false,
  onboarding_updated_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.app_users
  add column if not exists profile_handle text,
  add column if not exists profile_path text,
  add column if not exists profile_url text,
  add column if not exists dashboard_settings jsonb not null default '{}'::jsonb,
  add column if not exists role text not null default 'user',
  add column if not exists account_status text not null default 'active',
  add column if not exists account_status_updated_at timestamptz,
  add column if not exists snake_high_score integer not null default 0,
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists onboarding_skipped boolean not null default false,
  add column if not exists onboarding_updated_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'app_users_role_check'
      and conrelid = 'public.app_users'::regclass
  ) then
    alter table public.app_users
      add constraint app_users_role_check check (role in ('user', 'admin'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'app_users_account_status_check'
      and conrelid = 'public.app_users'::regclass
  ) then
    alter table public.app_users
      add constraint app_users_account_status_check check (account_status in ('active', 'suspended', 'banned'));
  end if;
end $$;

create table if not exists public.app_sessions (
  token text primary key,
  user_id text not null references public.app_users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.app_password_resets (
  id text primary key,
  user_id text not null references public.app_users(id) on delete cascade,
  token_hash text unique not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.app_profiles (
  handle text primary key,
  owner_user_id text references public.app_users(id) on delete set null,
  views integer not null default 0,
  updated_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb
);

create index if not exists app_users_email_idx on public.app_users(email);
create index if not exists app_sessions_user_id_idx on public.app_sessions(user_id);
create index if not exists app_password_resets_token_hash_idx on public.app_password_resets(token_hash);
create index if not exists app_password_resets_user_id_idx on public.app_password_resets(user_id);
create index if not exists app_profiles_owner_user_id_idx on public.app_profiles(owner_user_id);

drop view if exists public.app_user_profiles;

create view public.app_user_profiles as
select
  u.id as user_id,
  u.email,
  u.created_at,
  u.account_status,
  u.account_status_updated_at,
  u.snake_high_score,
  u.dashboard_settings,
  u.onboarding_completed,
  u.onboarding_skipped,
  u.onboarding_updated_at,
  coalesce(u.profile_handle, p.handle) as profile_handle,
  coalesce(u.profile_path, p.data ->> 'profilePath', case when p.handle is not null then '/u/' || p.handle end) as profile_path,
  coalesce(u.profile_url, p.data ->> 'profileUrl') as profile_url,
  p.views,
  p.updated_at as profile_updated_at
from public.app_users u
left join lateral (
  select handle, views, updated_at, data
  from public.app_profiles
  where owner_user_id = u.id
  order by updated_at desc
  limit 1
) p on true;
