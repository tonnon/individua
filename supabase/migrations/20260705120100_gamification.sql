-- ============================================================
-- Individua · Fase 2
-- boards_config, activities, achievements, user_achievements
-- ============================================================

-- ----- boards gamificados por usuário -----
create table public.boards_config (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  trello_board_id text not null,
  board_name text not null,
  done_list_id text,
  xp_multiplier numeric(4, 2) not null default 1.0 check (xp_multiplier > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, trello_board_id)
);

comment on table public.boards_config is 'Boards do Trello que o usuário escolheu gamificar e qual lista representa "Concluído".';

-- ----- auditoria de XP / feed do dashboard -----
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- idempotência: a MESMA action do Trello nunca gera XP duas vezes,
  -- mesmo com polling + webhook simultâneos
  trello_action_id text not null unique,
  card_id text not null,
  card_name text not null,
  type text not null,
  xp_awarded integer not null default 0,
  created_at timestamptz not null default now()
);

create index activities_user_created_idx
  on public.activities (user_id, created_at desc);

comment on column public.activities.trello_action_id is 'Chave de idempotência: id da action do Trello (unique).';

-- ----- catálogo de conquistas (global, somente leitura) -----
create table public.achievements (
  code text primary key,
  name text not null,
  description text not null,
  icon text not null,
  xp_reward integer not null default 0 check (xp_reward >= 0)
);

-- ----- conquistas desbloqueadas por usuário -----
create table public.user_achievements (
  user_id uuid not null references public.profiles (id) on delete cascade,
  achievement_code text not null references public.achievements (code) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_code)
);

-- ============================================================
-- RLS
-- ============================================================

alter table public.boards_config enable row level security;
alter table public.activities enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;

-- boards_config: CRUD completo restrito ao dono
create policy "boards_config: dono lê"
  on public.boards_config for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "boards_config: dono insere"
  on public.boards_config for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "boards_config: dono atualiza"
  on public.boards_config for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "boards_config: dono remove"
  on public.boards_config for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- activities: dono lê e insere; auditoria é imutável (sem update/delete)
create policy "activities: dono lê"
  on public.activities for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "activities: dono insere"
  on public.activities for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- achievements: catálogo global, leitura para autenticados
create policy "achievements: leitura autenticada"
  on public.achievements for select
  to authenticated
  using (true);

-- user_achievements: dono lê e insere (desbloqueio); sem update/delete
create policy "user_achievements: dono lê"
  on public.user_achievements for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "user_achievements: dono insere"
  on public.user_achievements for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
