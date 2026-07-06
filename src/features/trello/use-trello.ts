import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getBoardLists, getMe, getMyBoards } from '@/features/trello/api'
import { supabase } from '@/lib/supabase'

/** Boards do usuário no Trello (requer token conectado). */
export function useTrelloBoards(token: string | null) {
  return useQuery({
    queryKey: ['trello-boards'],
    queryFn: () => getMyBoards(token!),
    enabled: Boolean(token),
    staleTime: 5 * 60_000,
  })
}

/** Listas de um board (para escolher a "Concluído"). */
export function useTrelloLists(boardId: string, token: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['trello-lists', boardId],
    queryFn: () => getBoardLists(boardId, token!),
    enabled: Boolean(token) && enabled,
    staleTime: 5 * 60_000,
  })
}

/** Salva o token após o retorno do fluxo de autorização. */
export function useConnectTrello(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (token: string) => {
      // valida o token e captura o member id numa tacada só
      const me = await getMe(token)
      const { error } = await supabase
        .from('profiles')
        .update({ trello_token: token, trello_member_id: me.id })
        .eq('id', userId)
      if (error) throw error
      return me
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile', userId] })
    },
  })
}

export function useDisconnectTrello(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ trello_token: null, trello_member_id: null })
        .eq('id', userId)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile', userId] })
      void queryClient.removeQueries({ queryKey: ['trello-boards'] })
    },
  })
}

export function boardConfigsQueryOptions(userId: string) {
  return queryOptions({
    queryKey: ['board-configs', userId],
    queryFn: async () => {
      const { data, error } = await supabase.from('boards_config').select('*').eq('user_id', userId)
      if (error) throw error
      return data
    },
  })
}

export function useBoardConfigs(userId: string) {
  return useQuery(boardConfigsQueryOptions(userId))
}

export interface SaveBoardConfigInput {
  trelloBoardId: string
  boardName: string
  doneListId: string | null
  xpMultiplier: number
  active: boolean
}

export function useSaveBoardConfig(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: SaveBoardConfigInput) => {
      const { error } = await supabase.from('boards_config').upsert(
        {
          user_id: userId,
          trello_board_id: input.trelloBoardId,
          board_name: input.boardName,
          done_list_id: input.doneListId,
          xp_multiplier: input.xpMultiplier,
          active: input.active,
        },
        { onConflict: 'user_id,trello_board_id' },
      )
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['board-configs', userId] })
    },
  })
}
