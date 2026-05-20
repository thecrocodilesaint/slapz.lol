create table if not exists public.app_users (
  id text primary key,
  email text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.app_sessions (
  token text primary key,
  user_id text not null references public.app_users(id) on delete cascade,
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
create index if not exists app_profiles_owner_user_id_idx on public.app_profiles(owner_user_id);
