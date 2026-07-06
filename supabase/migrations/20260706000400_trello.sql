-- ============================================================
-- Individua · Fase 4 — Trello connect
-- Token do Trello editável pelo dono, board de origem nas
-- activities (para a conquista multi-board e o board view) e
-- record_activity ganhando o parâmetro do board.
-- ============================================================

-- o dono conecta/desconecta o Trello (token protegido por RLS; as
-- colunas de gameplay continuam travadas)
grant update (trello_token, trello_member_id) on public.profiles to authenticated;

-- board de origem da conclusão (null para missões manuais)
alter table public.activities
  add column trello_board_id text;

comment on column public.activities.trello_board_id is 'Board do Trello de onde veio a conclusão (null se manual).';

-- ----- record_activity v2: assinatura nova (p_trello_board_id) -----
-- assinatura muda ⇒ drop + create (create or replace exigiria a mesma)
drop function public.record_activity(
  public.activity_source, text, uuid, text, text, text, integer, integer, jsonb
);

create function public.record_activity(
  p_source public.activity_source,
  p_trello_action_id text,
  p_mission_id uuid,
  p_trello_board_id text,
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
      user_id, source, trello_action_id, trello_board_id, card_id, card_name, type,
      xp_awarded, coins_awarded, virtue_deltas
    )
    values (
      v_user_id, p_source, p_trello_action_id, p_trello_board_id, p_card_id, p_card_name, p_type,
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
  public.activity_source, text, uuid, text, text, text, text, integer, integer, jsonb
) from public;
grant execute on function public.record_activity(
  public.activity_source, text, uuid, text, text, text, text, integer, integer, jsonb
) to authenticated;

-- ----- sync_achievements: agora com a condição da multi-board -----
create or replace function public.sync_achievements()
returns setof text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_total integer;
  v_longest integer;
  v_xp integer;
  v_early boolean;
  v_night boolean;
  v_marathon boolean;
  v_punctual integer;
  v_boards integer;
  v_new text[];
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select count(*)::int into v_total
  from public.activities a where a.user_id = v_user_id;

  select p.longest_streak, p.xp into v_longest, v_xp
  from public.profiles p where p.id = v_user_id;

  select exists (
    select 1 from public.activities a
    where a.user_id = v_user_id
      and extract(hour from a.created_at at time zone 'America/Sao_Paulo') < 9
  ) into v_early;

  select exists (
    select 1 from public.activities a
    where a.user_id = v_user_id
      and extract(hour from a.created_at at time zone 'America/Sao_Paulo') >= 23
  ) into v_night;

  select exists (
    select 1 from public.activities a
    where a.user_id = v_user_id
    group by a.occurred_on
    having count(*) >= 5
  ) into v_marathon;

  select count(*)::int into v_punctual
  from public.activities a
  join public.missions m on m.id = a.mission_id
  where a.user_id = v_user_id
    and m.due_at is not null
    and a.created_at <= m.due_at;

  select count(distinct a.trello_board_id)::int into v_boards
  from public.activities a
  where a.user_id = v_user_id and a.trello_board_id is not null;

  with met(code) as (
    select t.code from (values
      ('first-mission',  v_total >= 1),
      ('ten-cards',      v_total >= 10),
      ('fifty-cards',    v_total >= 50),
      ('hundred-cards',  v_total >= 100),
      ('streak-7',       v_longest >= 7),
      ('streak-30',      v_longest >= 30),
      ('early-bird',     v_early),
      ('night-owl',      v_night),
      ('marathon',       v_marathon),
      ('punctual',       v_punctual >= 10),
      ('multi-board',    v_boards >= 3),
      -- xpForLevel(10) da curva TS (xp-curve.ts): 100 * (10-1)^2 = 8100
      ('level-10',       v_xp >= 8100)
    ) as t(code, ok)
    where t.ok
  ),
  inserted as (
    insert into public.user_achievements (user_id, achievement_code)
    select v_user_id, m.code
    from met m
    where exists (select 1 from public.achievements a where a.code = m.code)
      and not exists (
        select 1 from public.user_achievements ua
        where ua.user_id = v_user_id and ua.achievement_code = m.code
      )
    returning achievement_code
  )
  select coalesce(array_agg(i.achievement_code), '{}') into v_new from inserted i;

  if coalesce(array_length(v_new, 1), 0) > 0 then
    update public.profiles p
    set xp = p.xp + coalesce(
      (select sum(a.xp_reward) from public.achievements a where a.code = any (v_new)), 0
    )
    where p.id = v_user_id;
  end if;

  return query select unnest(v_new);
end;
$$;
