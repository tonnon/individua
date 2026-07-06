-- ============================================================
-- Individua · Fase 5 — conquistas e arena
-- Desbloqueio de conquistas validado no servidor (RPC) e
-- opt-out do leaderboard editável pelo dono.
-- ============================================================

-- o usuário pode sair/voltar ao ranking; grant de colunas é aditivo
grant update (leaderboard_opt_in) on public.profiles to authenticated;

-- desbloqueio deixa de ser insert direto do client (qualquer um se
-- daria qualquer conquista) e passa a ser só via sync_achievements()
drop policy "user_achievements: dono insere" on public.user_achievements;
revoke insert on public.user_achievements from authenticated;

-- ----- RPC: avalia condições a partir dos dados reais, insere as
-- conquistas recém-atingidas, credita o XP bônus e devolve os codes
-- novos (para o client celebrar). Idempotente por construção. -----
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
  v_new text[];
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select count(*)::int into v_total
  from public.activities a where a.user_id = v_user_id;

  select p.longest_streak, p.xp into v_longest, v_xp
  from public.profiles p where p.id = v_user_id;

  -- Madrugador/Coruja usam o fuso do público-alvo (America/Sao_Paulo);
  -- occurred_on/streak seguem em UTC — trocar o fuso aqui não quebra nada
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
      -- 'multi-board' fica bloqueada até o Trello connect (não há board_id
      -- em activities ainda); a condição entra na fase do Trello
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

  -- XP bônus das conquistas novas (pode encadear level-10 → próxima chamada pega)
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

revoke execute on function public.sync_achievements() from public;
grant execute on function public.sync_achievements() to authenticated;
