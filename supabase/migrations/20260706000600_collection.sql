-- ============================================================
-- Individua · Fase 8 — Itens de Recompensa (coleção)
-- Catálogo global com raridades; desbloqueio via missões especiais
-- do Arquiteto com prazo, validadas 100% no servidor.
-- ============================================================

create type public.item_rarity as enum
  ('comum', 'incomum', 'raro', 'epico', 'lendario', 'mitico');

create type public.special_mission_status as enum ('active', 'completed', 'expired');

-- ----- catálogo global (somente leitura para o client) -----
create table public.collection_items (
  code text primary key,
  name text not null,
  description text not null,
  icon text not null,
  rarity public.item_rarity not null,
  xp_reward integer not null default 0 check (xp_reward >= 0)
);

alter table public.collection_items enable row level security;

create policy "collection_items: leitura autenticada"
  on public.collection_items for select
  to authenticated
  using (true);

-- ----- itens desbloqueados por usuário (só via RPC) -----
create table public.user_items (
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_code text not null references public.collection_items (code) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, item_code)
);

alter table public.user_items enable row level security;

create policy "user_items: dono lê"
  on public.user_items for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke insert on public.user_items from authenticated;

-- ----- missões especiais do Arquiteto (geridas pelo RPC) -----
create table public.special_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_code text not null references public.collection_items (code) on delete cascade,
  goal_count integer not null check (goal_count > 0),
  expires_at timestamptz not null,
  status public.special_mission_status not null default 'active',
  created_at timestamptz not null default now()
);

create index special_missions_user_status_idx
  on public.special_missions (user_id, status);

alter table public.special_missions enable row level security;

create policy "special_missions: dono lê"
  on public.special_missions for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke insert, update on public.special_missions from authenticated;

comment on table public.special_missions is 'Desafios com prazo emitidos pelo Arquiteto; concluir N conclusões dentro da janela desbloqueia o item.';

-- ----- catálogo inicial (goal/prazo/XP escalam com a raridade) -----
insert into public.collection_items (code, name, description, icon, rarity, xp_reward) values
  ('brasao-iniciante',      'Brasão do Iniciante',       'O primeiro símbolo de quem ousa iniciar a jornada da evolução.', 'rocket',         'comum',    25),
  ('selo-constancia',       'Selo da Constância',        'Forjado por quem aparece todos os dias, sem exceção.',           'calendar-check', 'comum',    25),
  ('emblema-foco',          'Emblema do Foco',           'Concedido a mentes que silenciam o ruído.',                      'crosshair',      'incomum',  50),
  ('insignia-vigor',        'Insígnia do Vigor',         'Energia vital acima da média detectada pelo sistema.',           'heart',          'incomum',  50),
  ('nucleo-energia',        'Núcleo de Energia',         'Um fragmento do core que alimenta operadores incansáveis.',      'zap',            'raro',     75),
  ('cristal-persistencia',  'Cristal da Persistência',   'Cresce uma lâmina por dia de esforço contínuo.',                 'gem',            'raro',     75),
  ('lamina-disciplina',     'Lâmina da Disciplina',      'Corta a procrastinação num único golpe.',                        'sword',          'raro',     75),
  ('coroa-operador',        'Coroa do Operador',         'Reservada a quem comanda o próprio tempo.',                      'crown',          'epico',   100),
  ('motor-vontade',         'Motor da Vontade',          'Converte intenção em execução sem atrito.',                      'cog',            'epico',   100),
  ('prisma-mental',         'Prisma Mental',             'Refrata um problema em mil soluções.',                          'brain',          'epico',   100),
  ('chama-eterna',          'Chama Eterna',              'Streak lendário: o fogo que não apaga.',                         'flame',          'lendario', 150),
  ('estrela-ascensao',      'Estrela da Ascensão',       'Brilha apenas para quem subiu sem atalhos.',                     'star',           'lendario', 150),
  ('olho-arquiteto',        'Olho do Arquiteto',         'Você viu o sistema — e o sistema viu você.',                     'eye',            'mitico',  200),
  ('nucleo-transcendencia', 'Núcleo da Transcendência',  'O ápice da coleção. Poucos operadores chegam aqui.',             'sparkles',       'mitico',  200)
on conflict (code) do nothing;

-- ----- RPC: avalia a missão especial ativa e emite a próxima -----
-- Chamar ao abrir a coleção e após conclusões. Idempotente.
-- Retorna os codes de itens recém-desbloqueados (para celebrar).
create or replace function public.sync_special_missions()
returns setof text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_mission record;
  v_count integer;
  v_new text[] := '{}';
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select * into v_mission
  from public.special_missions
  where user_id = v_user_id and status = 'active'
  order by created_at desc
  limit 1;

  if found then
    -- progresso: conclusões em nível de card/missão dentro da janela
    select count(*)::int into v_count
    from public.activities a
    where a.user_id = v_user_id
      and a.type <> 'trello_checkitem_done'
      and a.created_at >= v_mission.created_at
      and a.created_at <= least(now(), v_mission.expires_at);

    if v_count >= v_mission.goal_count then
      update public.special_missions set status = 'completed' where id = v_mission.id;
      insert into public.user_items (user_id, item_code)
      values (v_user_id, v_mission.item_code)
      on conflict do nothing;
      update public.profiles p
      set xp = p.xp + coalesce(
        (select ci.xp_reward from public.collection_items ci where ci.code = v_mission.item_code), 0
      )
      where p.id = v_user_id;
      v_new := array[v_mission.item_code];
    elsif now() > v_mission.expires_at then
      update public.special_missions set status = 'expired' where id = v_mission.id;
    end if;
  end if;

  -- sem missão ativa e ainda há itens bloqueados → o Arquiteto emite a
  -- próxima (determinística: raridade crescente, depois ordem do code)
  if not exists (
    select 1 from public.special_missions
    where user_id = v_user_id and status = 'active'
  ) then
    insert into public.special_missions (user_id, item_code, goal_count, expires_at)
    select
      v_user_id,
      ci.code,
      case ci.rarity
        when 'comum' then 2
        when 'incomum' then 3
        when 'raro' then 4
        when 'epico' then 6
        when 'lendario' then 8
        else 10
      end,
      now() + case ci.rarity
        when 'comum' then interval '24 hours'
        when 'incomum' then interval '36 hours'
        when 'raro' then interval '48 hours'
        when 'epico' then interval '72 hours'
        when 'lendario' then interval '96 hours'
        else interval '120 hours'
      end
    from public.collection_items ci
    where not exists (
      select 1 from public.user_items ui
      where ui.user_id = v_user_id and ui.item_code = ci.code
    )
    order by ci.rarity, ci.code
    limit 1;
  end if;

  return query select unnest(v_new);
end;
$$;

revoke execute on function public.sync_special_missions() from public;
grant execute on function public.sync_special_missions() to authenticated;
