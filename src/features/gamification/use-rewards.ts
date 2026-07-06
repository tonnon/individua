import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export function rewardsQueryOptions(userId: string) {
  return queryOptions({
    queryKey: ['rewards', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .eq('user_id', userId)
        .eq('active', true)
        .order('cost_coins', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

export function useRewards(userId: string) {
  return useQuery(rewardsQueryOptions(userId))
}

export interface NewRewardInput {
  title: string
  description: string | null
  costCoins: number
}

export function useCreateReward(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewRewardInput) => {
      const { error } = await supabase.from('rewards').insert({
        user_id: userId,
        title: input.title,
        description: input.description,
        cost_coins: input.costCoins,
      })
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rewards', userId] })
    },
  })
}

export function useDeleteReward(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (rewardId: string) => {
      const { error } = await supabase.from('rewards').delete().eq('id', rewardId)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rewards', userId] })
    },
  })
}

export function useRedeemReward(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (rewardId: string) => {
      const { data, error } = await supabase.rpc('redeem_reward', { p_reward_id: rewardId })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile', userId] })
    },
  })
}
