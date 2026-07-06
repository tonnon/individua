import { queryOptions, useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export function profileQueryOptions(userId: string) {
  return queryOptions({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (error) throw error
      return data
    },
  })
}

export function useProfile(userId: string) {
  return useQuery(profileQueryOptions(userId))
}
