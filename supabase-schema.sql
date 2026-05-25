create table if not exists public.app_users (
  id text primary key,
  email text unique not null,
  password_hash text not null,
  profile_handle text,
  profile_path text,
  profile_url text,
  snake_high_score integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.app_users
  add column if not exists profile_handle text,
  add column if not exists profile_path text,
  add column if not exists profile_url text,
  add column if not exists snake_high_score integer not null default 0;

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

create or replace view public.app_user_profiles as
select
  u.id as user_id,
  u.email,
  u.created_at,
  u.snake_high_score,
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
