import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export function leaderboardQueryOptions(limit = 50) {
  return queryOptions({
    queryKey: ['leaderboard', limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_leaderboard', {
        p_limit: limit,
        p_offset: 0,
      })
      if (error) throw error
      return data ?? []
    },
    staleTime: 60_000,
  })
}

export function myRankQueryOptions() {
  return queryOptions({
    queryKey: ['my-rank'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_rank', {})
      if (error) throw error
      return data
    },
    staleTime: 60_000,
  })
}

export function useLeaderboard(limit?: number) {
  return useQuery(leaderboardQueryOptions(limit))
}

export function useMyRank() {
  return useQuery(myRankQueryOptions())
}

/** Entrar/sair do ranking público (leaderboard_opt_in). */
export function useSetLeaderboardOptIn(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (optIn: boolean) => {
      const { error } = await supabase
        .from('profiles')
        .update({ leaderboard_opt_in: optIn })
        .eq('id', userId)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile', userId] })
      void queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
      void queryClient.invalidateQueries({ queryKey: ['my-rank'] })
    },
  })
}
