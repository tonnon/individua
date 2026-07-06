import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  addCardComment,
  addCheckItem,
  createChecklist,
  deleteCheckItem,
  deleteChecklist,
  getCardChecklists,
  getCardComments,
  setCheckItemState,
  type TrelloChecklist,
} from '@/features/trello/api'

/** invalida também os cards do board — os badges (✓ x/y) vêm de lá */
function useInvalidateCardData(boardId: string, cardId: string) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['trello-checklists', cardId] })
    void queryClient.invalidateQueries({ queryKey: ['trello-cards', boardId] })
  }
}

export function useCardChecklists(cardId: string, token: string | null) {
  return useQuery({
    queryKey: ['trello-checklists', cardId],
    queryFn: () => getCardChecklists(cardId, token!),
    enabled: Boolean(token),
  })
}

/** Marca/desmarca item com update otimista (checkbox responde na hora). */
export function useToggleCheckItem(boardId: string, cardId: string, token: string | null) {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateCardData(boardId, cardId)
  return useMutation({
    mutationFn: ({
      checkItemId,
      state,
    }: {
      checkItemId: string
      state: 'complete' | 'incomplete'
    }) => setCheckItemState(cardId, checkItemId, state, token!),
    onMutate: async ({ checkItemId, state }) => {
      await queryClient.cancelQueries({ queryKey: ['trello-checklists', cardId] })
      const previous = queryClient.getQueryData<TrelloChecklist[]>(['trello-checklists', cardId])
      queryClient.setQueryData<TrelloChecklist[]>(['trello-checklists', cardId], (checklists) =>
        (checklists ?? []).map((checklist) => ({
          ...checklist,
          checkItems: checklist.checkItems.map((item) =>
            item.id === checkItemId ? { ...item, state } : item,
          ),
        })),
      )
      return { previous }
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['trello-checklists', cardId], context.previous)
      }
    },
    onSuccess: (_data, { state }) => {
      // item marcado pontua: dispara o sync sem esperar o polling
      // (folga p/ a action registrar no Trello)
      if (state === 'complete') {
        window.setTimeout(() => {
          void queryClient.refetchQueries({ queryKey: ['trello-sync'] })
        }, 1500)
      }
    },
    onSettled: invalidate,
  })
}

export function useAddCheckItem(boardId: string, cardId: string, token: string | null) {
  const invalidate = useInvalidateCardData(boardId, cardId)
  return useMutation({
    mutationFn: ({ checklistId, name }: { checklistId: string; name: string }) =>
      addCheckItem(checklistId, name, token!),
    onSettled: invalidate,
  })
}

export function useDeleteCheckItem(boardId: string, cardId: string, token: string | null) {
  const invalidate = useInvalidateCardData(boardId, cardId)
  return useMutation({
    mutationFn: ({ checklistId, checkItemId }: { checklistId: string; checkItemId: string }) =>
      deleteCheckItem(checklistId, checkItemId, token!),
    onSettled: invalidate,
  })
}

export function useCreateChecklist(boardId: string, cardId: string, token: string | null) {
  const invalidate = useInvalidateCardData(boardId, cardId)
  return useMutation({
    mutationFn: (name: string) => createChecklist(cardId, name, token!),
    onSettled: invalidate,
  })
}

export function useDeleteChecklist(boardId: string, cardId: string, token: string | null) {
  const invalidate = useInvalidateCardData(boardId, cardId)
  return useMutation({
    mutationFn: (checklistId: string) => deleteChecklist(checklistId, token!),
    onSettled: invalidate,
  })
}

export function useCardComments(cardId: string, token: string | null) {
  return useQuery({
    queryKey: ['trello-comments', cardId],
    queryFn: () => getCardComments(cardId, token!),
    enabled: Boolean(token),
  })
}

export function useAddComment(cardId: string, token: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (text: string) => addCardComment(cardId, text, token!),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['trello-comments', cardId] })
    },
  })
}
