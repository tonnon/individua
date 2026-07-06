import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

/** Catálogo global de conquistas (seed do banco). */
export function achievementsCatalogQueryOptions() {
  return queryOptions({
    queryKey: ['achievements-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .order('xp_reward', { ascending: true })
      if (error) throw error
      return data
    },
    staleTime: Infinity, // catálogo só muda com migration
  })
}

export function userAchievementsQueryOptions(userId: string) {
  return queryOptions({
    queryKey: ['user-achievements', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId)
      if (error) throw error
      return data
    },
  })
}

export function useAchievementsCatalog() {
  return useQuery(achievementsCatalogQueryOptions())
}

export function useUserAchievements(userId: string) {
  return useQuery(userAchievementsQueryOptions(userId))
}

/**
 * Reavalia as condições no servidor e devolve os codes recém-
 * desbloqueados. Chamar após conclusões de missão e ao abrir a
 * galeria — é idempotente e barato.
 */
export function useSyncAchievements(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.rpc('sync_achievements')
      if (error) throw error
      return data ?? []
    },
    onSuccess: (newCodes) => {
      if (newCodes.length > 0) {
        void queryClient.invalidateQueries({ queryKey: ['user-achievements', userId] })
        void queryClient.invalidateQueries({ queryKey: ['profile', userId] }) // XP bônus
      }
    },
  })
}
