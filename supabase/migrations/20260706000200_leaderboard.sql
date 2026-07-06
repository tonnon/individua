-- ============================================================
-- Individua · Fase 3 — Arena Global (leaderboard público)
-- Funções security definer com colunas explícitas (nunca select *)
-- para nunca vazar trello_token: a policy de SELECT restrita em
-- profiles não muda, o acesso público existe só por aqui.
-- ============================================================

create index profiles_xp_desc_idx on public.profiles (xp desc);

create or replace function public.get_leaderboard(p_limit int default 20, p_offset int default 0)
returns table (
  user_id uuid,
  username text,
  avatar_url text,
  xp integer,
  rnk bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select id, username, avatar_url, xp,
         dense_rank() over (order by xp desc) as rnk
  from public.profiles
  where leaderboard_opt_in
  order by xp desc
  limit p_limit offset p_offset;
$$;

create or replace function public.get_my_rank()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) + 1
  from public.profiles
  where leaderboard_opt_in
    and xp > (select xp from public.profiles where id = auth.uid());
$$;

revoke execute on function public.get_leaderboard(int, int) from public;
revoke execute on function public.get_my_rank() from public;
grant execute on function public.get_leaderboard(int, int) to authenticated;
grant execute on function public.get_my_rank() to authenticated;
