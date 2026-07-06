import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createCard,
  getBoard,
  getBoardCards,
  getBoardLabels,
  getBoardLists,
  updateCard,
  type TrelloBoardCard,
} from '@/features/trello/api'

export function useBoardMeta(boardId: string, token: string | null) {
  return useQuery({
    queryKey: ['trello-board', boardId],
    queryFn: () => getBoard(boardId, token!),
    enabled: Boolean(token),
    staleTime: 5 * 60_000,
  })
}

export function useBoardLists(boardId: string, token: string | null) {
  return useQuery({
    queryKey: ['trello-lists', boardId],
    queryFn: () => getBoardLists(boardId, token!),
    enabled: Boolean(token),
    staleTime: 60_000,
  })
}

export function useBoardLabels(boardId: string, token: string | null) {
  return useQuery({
    queryKey: ['trello-labels', boardId],
    queryFn: () => getBoardLabels(boardId, token!),
    enabled: Boolean(token),
    staleTime: 5 * 60_000,
  })
}

export function useBoardCards(boardId: string, token: string | null) {
  return useQuery({
    queryKey: ['trello-cards', boardId],
    queryFn: () => getBoardCards(boardId, token!),
    enabled: Boolean(token),
    // espelho vivo do board: acompanha mudanças feitas fora do app
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

interface MoveCardInput {
  cardId: string
  toListId: string
  pos: number
}

/**
 * Mover card = PUT na API do Trello com update otimista no cache e
 * rollback em erro (o board continua respondendo instantâneo).
 */
export function useMoveCard(boardId: string, token: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ cardId, toListId, pos }: MoveCardInput) =>
      updateCard(cardId, token!, { idList: toListId, pos: String(pos) }),
    onMutate: async ({ cardId, toListId, pos }) => {
      await queryClient.cancelQueries({ queryKey: ['trello-cards', boardId] })
      const previous = queryClient.getQueryData<TrelloBoardCard[]>(['trello-cards', boardId])
      queryClient.setQueryData<TrelloBoardCard[]>(['trello-cards', boardId], (cards) =>
        (cards ?? []).map((card) =>
          card.id === cardId ? { ...card, idList: toListId, pos } : card,
        ),
      )
      return { previous }
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['trello-cards', boardId], context.previous)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['trello-cards', boardId] })
    },
  })
}

export interface UpdateCardInput {
  cardId: string
  name?: string
  desc?: string
  /** ISO ou '' para remover o prazo */
  due?: string
  /** ids das labels do card (lista completa) */
  idLabels?: string[]
  closed?: boolean
}

export function useUpdateCard(boardId: string, token: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ cardId, ...input }: UpdateCardInput) => {
      const params: Record<string, string> = {}
      if (input.name !== undefined) params.name = input.name
      if (input.desc !== undefined) params.desc = input.desc
      if (input.due !== undefined) params.due = input.due
      if (input.idLabels !== undefined) params.idLabels = input.idLabels.join(',')
      if (input.closed !== undefined) params.closed = String(input.closed)
      return updateCard(cardId, token!, params)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['trello-cards', boardId] })
    },
  })
}

export function useCreateCard(boardId: string, token: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ listId, name }: { listId: string; name: string }) =>
      createCard(listId, name, token!),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['trello-cards', boardId] })
    },
  })
}

/** Posição Trello para inserir um card no índice `index` da lista. */
export function positionForIndex(cardsInList: TrelloBoardCard[], index: number): number {
  if (cardsInList.length === 0) return 65536
  if (index <= 0) return cardsInList[0]!.pos / 2
  if (index >= cardsInList.length) return cardsInList[cardsInList.length - 1]!.pos + 65536
  return (cardsInList[index - 1]!.pos + cardsInList[index]!.pos) / 2
}
