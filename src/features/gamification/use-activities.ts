import { queryOptions, useQuery } from '@tanstack/react-query'

import { isoDate } from '@/features/gamification/engine/architect'
import { supabase } from '@/lib/supabase'
import type { ActivityRow } from '@/lib/database.types'

/** Últimas atividades (janela suficiente p/ insights de 2 semanas). */
export function activitiesQueryOptions(userId: string) {
  return queryOptions({
    queryKey: ['activities', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(300)
      if (error) throw error
      return data
    },
  })
}

export function useActivities(userId: string) {
  return useQuery(activitiesQueryOptions(userId))
}

export interface TodayStats {
  xpToday: number
  coinsToday: number
  completedToday: number
}

export function todayStats(activities: ActivityRow[], today = new Date()): TodayStats {
  const todayIso = isoDate(today)
  const ofToday = activities.filter((a) => a.occurred_on === todayIso)
  return {
    xpToday: ofToday.reduce((sum, a) => sum + a.xp_awarded, 0),
    coinsToday: ofToday.reduce((sum, a) => sum + a.coins_awarded, 0),
    completedToday: ofToday.length,
  }
}
