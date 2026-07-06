-- ============================================================
-- Individua · Fase 3 — economia ("Loja do Tempo")
-- Catálogo pessoal de recompensas que o usuário troca por moedas
-- ganhas ao concluir missões.
-- ============================================================

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  cost_coins integer not null check (cost_coins > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.rewards enable row level security;

create policy "rewards: dono lê"
  on public.rewards for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "rewards: dono insere"
  on public.rewards for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "rewards: dono atualiza"
  on public.rewards for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "rewards: dono remove"
  on public.rewards for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ----- ledger imutável de resgates (mesmo padrão de activities) -----
create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  reward_id uuid not null references public.rewards (id) on delete cascade,
  coins_spent integer not null check (coins_spent > 0),
  redeemed_at timestamptz not null default now()
);

create index reward_redemptions_user_redeemed_idx
  on public.reward_redemptions (user_id, redeemed_at desc);

alter table public.reward_redemptions enable row level security;

create policy "reward_redemptions: dono lê"
  on public.reward_redemptions for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- inserção só via redeem_reward() (RPC atômico) — sem policy de insert.

-- ----- RPC atômico: desconta moedas e registra o resgate -----
create or replace function public.redeem_reward(p_reward_id uuid)
returns public.reward_redemptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_cost integer;
  v_redemption public.reward_redemptions;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select cost_coins into v_cost
  from public.rewards
  where id = p_reward_id and user_id = v_user_id and active;

  if v_cost is null then
    raise exception 'recompensa não encontrada ou inativa';
  end if;

  -- guard atômico contra double-spend em concorrência: o próprio WHERE
  -- da atualização garante saldo suficiente, sem precisar de lock explícito.
  update public.profiles
  set coins = coins - v_cost
  where id = v_user_id and coins >= v_cost;

  if not found then
    raise exception 'saldo insuficiente';
  end if;

  insert into public.reward_redemptions (user_id, reward_id, coins_spent)
  values (v_user_id, p_reward_id, v_cost)
  returning * into v_redemption;

  return v_redemption;
end;
$$;

revoke execute on function public.redeem_reward(uuid) from public;
grant execute on function public.redeem_reward(uuid) to authenticated;
