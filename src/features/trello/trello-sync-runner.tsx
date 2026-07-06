import type { User } from '@supabase/supabase-js'

import { useProfile } from '@/features/auth/use-profile'
import { useTrelloSync } from '@/features/trello/use-trello-sync'
import { useBoardConfigs } from '@/features/trello/use-trello'

/**
 * Montado no layout autenticado: mantém o polling do Trello vivo em
 * qualquer tela (60s com aba visível). Não renderiza nada.
 */
export function TrelloSyncRunner({ user }: { user: User }) {
  const { data: profile } = useProfile(user.id)
  const { data: configs } = useBoardConfigs(user.id)

  useTrelloSync(user.id, profile?.trello_token ?? null, configs)

  return null
}
