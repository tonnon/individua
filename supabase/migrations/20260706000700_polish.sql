-- ============================================================
-- Individua · Fase 9 — polimento
-- 1) Chave de IA do usuário (Evolução Chat IA — custo é do usuário)
-- 2) Webhook do Trello: id do webhook por board + RPC admin que a
--    Edge Function usa para registrar conclusões SEM sessão do
--    usuário (executável apenas pelo service_role).
-- ============================================================

-- ----- chave da API de IA (mesmo modelo do trello_token: RLS, só o dono lê) -----
alter table public.profiles
  add column ai_api_key text;

comment on column public.profiles.ai_api_key is 'Chave da API da Anthropic do PRÓPRIO usuário (Evolução Chat IA). Nunca expor em logs.';

grant update (ai_api_key) on public.profiles to authenticated;

-- ----- webhook por board (para conseguir desativar depois) -----
alter table public.boards_config
  add column trello_webhook_id text;

-- ----- RPC admin: mesmo efeito do record_activity, mas com user_id
-- explícito — a Edge Function roda sem JWT de usuário. Restrito ao
-- service_role; o corpo espelha record_activity (idempotência incluída).
create function public.record_activity_admin(
  p_user_id uuid,
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
  v_activity public.activities;
  v_streak integer;
begin
  if p_user_id is null then
    raise exception 'user_id obrigatório';
  end if;

  if p_source = 'trello' then
    insert into public.activities (
      user_id, source, trello_action_id, trello_board_id, card_id, card_name, type,
      xp_awarded, coins_awarded, virtue_deltas
    )
    values (
      p_user_id, p_source, p_trello_action_id, p_trello_board_id, p_card_id, p_card_name, p_type,
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
      p_user_id, p_source, p_mission_id, p_card_id, p_card_name, p_type,
      p_xp, p_coins, p_virtue_deltas
    )
    on conflict (mission_id, occurred_on) where mission_id is not null do nothing
    returning * into v_activity;
  end if;

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
  where p.id = p_user_id;

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
  where p.id = p_user_id;

  return v_activity;
end;
$$;

-- só a Edge Function (service_role) executa — nem authenticated, nem anon
revoke execute on function public.record_activity_admin(
  uuid, public.activity_source, text, uuid, text, text, text, text, integer, integer, jsonb
) from public, authenticated, anon;
grant execute on function public.record_activity_admin(
  uuid, public.activity_source, text, uuid, text, text, text, text, integer, integer, jsonb
) to service_role;
