import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useCelebrationStore } from '@/features/gamification/celebration-store'
import { supabase } from '@/lib/supabase'

export function collectionCatalogQueryOptions() {
  return queryOptions({
    queryKey: ['collection-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase.from('collection_items').select('*')
      if (error) throw error
      return data
    },
    staleTime: Infinity, // catálogo só muda com migration
  })
}

export function useCollectionCatalog() {
  return useQuery(collectionCatalogQueryOptions())
}

export function useUserItems(userId: string) {
  return useQuery({
    queryKey: ['user-items', userId],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_items').select('*').eq('user_id', userId)
      if (error) throw error
      return data
    },
  })
}

/** Missão especial ativa do Arquiteto (no máximo uma por vez). */
export function useActiveSpecialMission(userId: string) {
  return useQuery({
    queryKey: ['special-mission', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('special_missions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

/**
 * Avalia a missão ativa no servidor (conclui/expira/emite a próxima)
 * e celebra itens recém-forjados. Idempotente — chamar ao abrir a
 * coleção e no botão de verificação.
 */
export function useSyncSpecialMissions(userId: string) {
  const queryClient = useQueryClient()
  const celebrate = useCelebrationStore((s) => s.celebrate)

  return useMutation({
    mutationFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.rpc('sync_special_missions')
      if (error) throw error
      return data ?? []
    },
    onSuccess: async (newCodes) => {
      void queryClient.invalidateQueries({ queryKey: ['special-mission', userId] })
      if (newCodes.length === 0) return
      void queryClient.invalidateQueries({ queryKey: ['user-items', userId] })
      void queryClient.invalidateQueries({ queryKey: ['profile', userId] }) // XP bônus
      const { data: catalog } = await supabase
        .from('collection_items')
        .select('*')
        .in('code', newCodes)
      for (const code of newCodes) {
        const item = catalog?.find((i) => i.code === code)
        celebrate({
          type: 'achievement',
          name: item?.name ?? code,
          xpReward: item?.xp_reward ?? 0,
        })
      }
    },
  })
}
