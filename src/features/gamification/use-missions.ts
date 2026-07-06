import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { computeCompletion } from '@/features/gamification/engine/completion'
import { supabase } from '@/lib/supabase'
import type { MissionRecurrence, MissionRow, VirtueMap } from '@/lib/database.types'

export function missionsQueryOptions(userId: string) {
  return queryOptions({
    queryKey: ['missions', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('missions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useMissions(userId: string) {
  return useQuery(missionsQueryOptions(userId))
}

export interface NewMissionInput {
  title: string
  description: string | null
  virtueWeights: VirtueMap
  xpBase: number
  coinBase: number
  recurrence: MissionRecurrence
  dueAt: string | null
}

export function useCreateMission(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewMissionInput) => {
      const { error } = await supabase.from('missions').insert({
        user_id: userId,
        title: input.title,
        description: input.description,
        virtue_weights: input.virtueWeights,
        xp_base: input.xpBase,
        coin_base: input.coinBase,
        recurrence: input.recurrence,
        due_at: input.dueAt,
      })
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['missions', userId] })
    },
  })
}

export function useDeleteMission(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (missionId: string) => {
      const { error } = await supabase.from('missions').delete().eq('id', missionId)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['missions', userId] })
    },
  })
}

export interface CompleteMissionResult {
  alreadyCompleted: boolean
  xpAwarded: number
  coinsAwarded: number
}

export function useCompleteMission(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (mission: MissionRow): Promise<CompleteMissionResult> => {
      const completion = computeCompletion({
        xpBase: mission.xp_base,
        coinBase: mission.coin_base,
        virtueWeights: mission.virtue_weights,
        dueAt: mission.due_at,
        completedAt: new Date(),
      })
      const { data, error } = await supabase.rpc('record_activity', {
        p_source: 'manual',
        p_trello_action_id: null,
        p_mission_id: mission.id,
        p_trello_board_id: null,
        p_card_id: mission.id,
        p_card_name: mission.title,
        p_type: 'mission_completed',
        p_xp: completion.xp,
        p_coins: completion.coins,
        p_virtue_deltas: completion.virtueDeltas,
      })
      if (error) throw error
      return {
        alreadyCompleted: data === null,
        xpAwarded: completion.xp,
        coinsAwarded: completion.coins,
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['missions', userId] })
      void queryClient.invalidateQueries({ queryKey: ['profile', userId] })
    },
  })
}
