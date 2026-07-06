-- ============================================================
-- Individua · Fase 3 — núcleo do sistema
-- Generaliza "activities" para aceitar missões manuais além do
-- Trello, adiciona virtudes/moedas/rank ao profile e trava a
-- escrita dessas colunas atrás de um RPC atômico.
-- ============================================================

-- ----- profiles: remove level (vira função pura xpToLevel(xp) no
-- engine — evita duplicar a curva em SQL e TS) e adiciona
-- virtudes/coins/opt-in do leaderboard -----
alter table public.profiles
  drop column level,
  add column coins integer not null default 0 check (coins >= 0),
  add column forca integer not null default 0 check (forca >= 0),
  add column vitalidade integer not null default 0 check (vitalidade >= 0),
  add column foco integer not null default 0 check (foco >= 0),
  add column carisma integer not null default 0 check (carisma >= 0),
  add column disciplina integer not null default 0 check (disciplina >= 0),
  add column sabedoria integer not null default 0 check (sabedoria >= 0),
  -- username hoje vem do nome do Google (handle_new_user); como isso passa
  -- a poder aparecer num ranking global, o usuário precisa de um jeito de sair
  add column leaderboard_opt_in boolean not null default true;

comment on column public.profiles.leaderboard_opt_in is 'Se false, o usuário some do ranking público (get_leaderboard/get_my_rank).';

-- trava colunas de gameplay contra escrita direta do client: só
-- username/avatar_url continuam editáveis via update() comum; xp,
-- coins, virtudes e streak só mudam através de record_activity().
revoke update on public.profiles from authenticated;
grant update (username, avatar_url) on public.profiles to authenticated;

-- ----- missions: backlog de quests manuais (não vêm do Trello) -----
create type public.mission_status as enum ('pending', 'completed', 'archived');
create type public.mission_recurrence as enum ('none', 'daily', 'weekly');

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  -- pesos por virtude, ex.: {"disciplina": 2, "foco": 1} — chaves são os
  -- 6 códigos canônicos (ver VIRTUE_CODES em src/features/gamification/engine)
  virtue_weights jsonb not null default '{}',
  xp_base integer not null default 0 check (xp_base >= 0),
  coin_base integer not null default 0 check (coin_base >= 0),
  recurrence public.mission_recurrence not null default 'none',
  due_at timestamptz,
  status public.mission_status not null default 'pending',
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index missions_user_status_idx on public.missions (user_id, status);

alter table public.missions enable row level security;

create policy "missions: dono lê"
  on public.missions for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "missions: dono insere"
  on public.missions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "missions: dono atualiza"
  on public.missions for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "missions: dono remove"
  on public.missions for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ----- activities: generaliza para aceitar fonte manual além do Trello -----
create type public.activity_source as enum ('trello', 'manual');

alter table public.activities
  alter column trello_action_id drop not null,
  add column source public.activity_source not null default 'trello',
  add column mission_id uuid references public.missions (id) on delete set null,
  add column coins_awarded integer not null default 0 check (coins_awarded >= 0),
  add column virtue_deltas jsonb not null default '{}',
  -- timezone fixado em UTC: (created_at::date) puro depende do timezone
  -- da sessão e não é imutável — coluna gerada exige expressão imutável.
  -- UTC é consistente com o current_date do RPC (Supabase roda em UTC).
  add column occurred_on date generated always as ((created_at at time zone 'utc')::date) stored,
  add constraint activities_trello_needs_action_id
    check (source <> 'trello' or trello_action_id is not null),
  add constraint activities_manual_needs_mission
    check (source <> 'manual' or mission_id is not null);

comment on column public.activities.source is 'De onde veio a conclusão: trello (sync) ou manual (missão criada no app).';

-- idempotência de missões manuais/recorrentes: no máximo 1 conclusão
-- por missão por dia (UNIQUE em trello_action_id já cobre o Trello —
-- NULLs continuam distintos entre si, então relaxar para nullable
-- acima não afeta a idempotência existente do Trello)
create unique index activities_manual_once_per_day_idx
  on public.activities (mission_id, occurred_on)
  where mission_id is not null;

-- toda escrita em activities passa a ir só pelo RPC abaixo (atômico
-- com a atualização do profile); trava o insert direto da tabela.
revoke insert on public.activities from authenticated;

-- ----- RPC atômico: única porta de entrada para registrar uma
-- conclusão (Trello ou manual) e aplicar seus efeitos no profile -----
create or replace function public.record_activity(
  p_source public.activity_source,
  p_trello_action_id text,
  p_mission_id uuid,
  p_card_id text,
  p_card_name text,
  p_type text,
  p_xp integer,
  p_coins integer,
  p_virtue_deltas jsonb
)
returns public.activities
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_activity public.activities;
  v_streak integer;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if p_source = 'trello' then
    insert into public.activities (
      user_id, source, trello_action_id, card_id, card_name, type,
      xp_awarded, coins_awarded, virtue_deltas
    )
    values (
      v_user_id, p_source, p_trello_action_id, p_card_id, p_card_name, p_type,
      p_xp, p_coins, p_virtue_deltas
    )
    on conflict (trello_action_id) do nothing
    returning * into v_activity;
  else
    insert into public.activities (
      user_id, source, mission_id, card_id, card_name, type,
      xp_awarded, coins_awarded, virtue_deltas
    )
    values (
      v_user_id, p_source, p_mission_id, p_card_id, p_card_name, p_type,
      p_xp, p_coins, p_virtue_deltas
    )
    -- índice parcial: o predicado precisa ser repetido para o Postgres
    -- reconhecer o índice como árbitro do conflito
    on conflict (mission_id, occurred_on) where mission_id is not null do nothing
    returning * into v_activity;
  end if;

  -- idempotência: já processada antes (Trello reenviado, ou missão já
  -- concluída hoje) — não aplica efeitos de novo.
  if v_activity.id is null then
    return null;
  end if;

  -- streak: mantém se já agiu hoje, incrementa se agiu ontem, reseta caso
  -- contrário. Calculado uma vez e reaproveitado no update abaixo.
  select case
    when p.last_activity_date = current_date then p.streak_count
    when p.last_activity_date = current_date - 1 then p.streak_count + 1
    else 1
  end
  into v_streak
  from public.profiles p
  where p.id = v_user_id;

  update public.profiles p set
    xp = p.xp + p_xp,
    coins = p.coins + p_coins,
    forca = p.forca + coalesce((p_virtue_deltas ->> 'forca')::int, 0),
    vitalidade = p.vitalidade + coalesce((p_virtue_deltas ->> 'vitalidade')::int, 0),
    foco = p.foco + coalesce((p_virtue_deltas ->> 'foco')::int, 0),
    carisma = p.carisma + coalesce((p_virtue_deltas ->> 'carisma')::int, 0),
    disciplina = p.disciplina + coalesce((p_virtue_deltas ->> 'disciplina')::int, 0),
    sabedoria = p.sabedoria + coalesce((p_virtue_deltas ->> 'sabedoria')::int, 0),
    streak_count = v_streak,
    longest_streak = greatest(p.longest_streak, v_streak),
    last_activity_date = current_date
  where p.id = v_user_id;

  if p_mission_id is not null then
    update public.missions
    set status = 'completed', completed_at = now()
    where id = p_mission_id and user_id = v_user_id and recurrence = 'none';
  end if;

  return v_activity;
end;
$$;

revoke execute on function public.record_activity(
  public.activity_source, text, uuid, text, text, text, integer, integer, jsonb
) from public;
grant execute on function public.record_activity(
  public.activity_source, text, uuid, text, text, text, integer, integer, jsonb
) to authenticated;
