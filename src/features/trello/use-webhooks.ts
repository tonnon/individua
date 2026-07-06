import { useMutation, useQueryClient } from '@tanstack/react-query'

import { createTrelloWebhook, deleteTrelloWebhook } from '@/features/trello/api'
import { env } from '@/lib/env'
import { supabase } from '@/lib/supabase'
import type { BoardConfigRow } from '@/lib/database.types'

/** URL pública da Edge Function que recebe os callbacks do Trello. */
export function webhookCallbackUrl(): string {
  return `${env.VITE_SUPABASE_URL}/functions/v1/trello-webhook`
}

/**
 * Registra webhooks no Trello para todos os boards gamificados que
 * ainda não têm um. Exige a Edge Function deployada (o Trello valida
 * o callbackURL com um HEAD no ato do registro).
 */
export function useEnableWebhooks(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      token,
      configs,
    }: {
      token: string
      configs: BoardConfigRow[]
    }): Promise<number> => {
      const pending = configs.filter((c) => c.active && c.done_list_id && !c.trello_webhook_id)
      let created = 0
      for (const config of pending) {
        const webhook = await createTrelloWebhook(
          config.trello_board_id,
          webhookCallbackUrl(),
          token,
        )
        const { error } = await supabase
          .from('boards_config')
          .update({ trello_webhook_id: webhook.id })
          .eq('id', config.id)
        if (error) throw error
        created += 1
      }
      return created
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['board-configs', userId] })
    },
  })
}

export function useDisableWebhooks(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      token,
      configs,
    }: {
      token: string
      configs: BoardConfigRow[]
    }): Promise<number> => {
      const withWebhook = configs.filter((c) => c.trello_webhook_id)
      let removed = 0
      for (const config of withWebhook) {
        // webhook pode já ter sido apagado no Trello — segue limpando o registro
        await deleteTrelloWebhook(config.trello_webhook_id!, token).catch(() => null)
        const { error } = await supabase
          .from('boards_config')
          .update({ trello_webhook_id: null })
          .eq('id', config.id)
        if (error) throw error
        removed += 1
      }
      return removed
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['board-configs', userId] })
    },
  })
}
