-- ============================================================
-- Individua · Fase 2
-- profiles: perfil do jogador, 1:1 com auth.users
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text,
  avatar_url text,
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  streak_count integer not null default 0 check (streak_count >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_activity_date date,
  -- token do Trello: protegido por RLS (só o dono lê), nunca vai a logs
  trello_token text,
  trello_member_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Perfil gamificado do usuário; criado automaticamente via trigger em auth.users.';
comment on column public.profiles.trello_token is 'Token OAuth do Trello. Nunca expor em logs nem no client de terceiros.';

-- ----- updated_at automático -----
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ----- criação automática do profile no signup -----
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'full_name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----- RLS: cada usuário só enxerga e altera o próprio perfil -----
alter table public.profiles enable row level security;

create policy "profiles: dono lê"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles: dono atualiza"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- inserção só via trigger (security definer); sem policy de insert/delete.
