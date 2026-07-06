import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { computeCompletion } from '@/features/gamification/engine/completion'
import {
  TRELLO_CARD_BASE_XP,
  TRELLO_CHECK_ITEM_BASE_XP,
  archiveActivityKey,
  checkItemActivityKey,
  countHighPriorityLabels,
  isDoneListArrival,
} from '@/features/gamification/engine/trello'
import { getBoardActions, getBoardChecklists, getCard, getClosedCards } from '@/features/trello/api'
import { supabase } from '@/lib/supabase'
import type { BoardConfigRow } from '@/lib/database.types'

const SYNC_INTERVAL_MS = 60_000

interface SyncResult {
  processed: number
  xpAwarded: number
}

/** Evento pontuável, já com a chave de idempotência resolvida. */
interface XpEvent {
  key: string
  type: 'trello_card_done' | 'trello_checkitem_done' | 'trello_card_archived'
  cardId: string
  cardName: string
  /** quando conhecido (actions); estado antigo usa o momento do sync */
  completedAt: Date
  /** due/labels quando já vieram na carga (cards arquivados) */
  due?: string | null
  highPriorityLabels?: number
  /** conclusões via action precisam buscar o card p/ bônus */
  needsCardFetch: boolean
}

/** `.in()` com listas grandes: consulta em lotes. */
async function fetchKnownKeys(keys: string[]): Promise<Set<string>> {
  const known = new Set<string>()
  for (let i = 0; i < keys.length; i += 150) {
    const batch = keys.slice(i, i + 150)
    const { data } = await supabase
      .from('activities')
      .select('trello_action_id')
      .in('trello_action_id', batch)
    for (const row of data ?? []) {
      if (row.trello_action_id) known.add(row.trello_action_id)
    }
  }
  return known
}

/**
 * Coleta os eventos pontuáveis de um board em duas frentes:
 * — ACTIONS recentes: chegada na lista "Concluído" (data precisa,
 *   re-concluir pontua de novo — chave é o id da action, como na spec);
 * — ESTADO ATUAL: itens de checklist marcados e cards arquivados,
 *   incluindo os que JÁ estavam assim antes de conectar o board.
 *   Chaves derivadas do item/card garantem que a retroativa acontece
 *   uma única vez e que marcar/desmarcar em loop não gera farm.
 */
async function collectBoardEvents(boardId: string, doneListId: string, token: string) {
  const [actions, checklists, closedCards] = await Promise.all([
    getBoardActions(boardId, token),
    getBoardChecklists(boardId, token),
    getClosedCards(boardId, token),
  ])

  const events: XpEvent[] = []

  for (const action of actions) {
    if (isDoneListArrival(action, doneListId) && action.data.card) {
      events.push({
        key: action.id,
        type: 'trello_card_done',
        cardId: action.data.card.id,
        cardName: action.data.card.name,
        completedAt: new Date(action.date),
        needsCardFetch: true,
      })
    }
  }

  for (const checklist of checklists) {
    for (const item of checklist.checkItems) {
      if (item.state !== 'complete') continue
      events.push({
        key: checkItemActivityKey(item.id),
        type: 'trello_checkitem_done',
        cardId: checklist.idCard,
        cardName: `${item.name} · ${checklist.name}`,
        completedAt: new Date(),
        needsCardFetch: false,
      })
    }
  }

  for (const card of closedCards) {
    events.push({
      key: archiveActivityKey(card.id),
      type: 'trello_card_archived',
      cardId: card.id,
      cardName: card.name,
      completedAt: new Date(),
      due: card.due,
      highPriorityLabels: countHighPriorityLabels(card.labels ?? []),
      needsCardFetch: false,
    })
  }

  return events
}

async function syncBoards(token: string, configs: BoardConfigRow[]): Promise<SyncResult> {
  let processed = 0
  let xpAwarded = 0

  for (const config of configs) {
    if (!config.active || !config.done_list_id) continue

    const events = await collectBoardEvents(config.trello_board_id, config.done_list_id, token)
    if (events.length === 0) continue

    // pré-filtro barato: pula tudo que já foi registrado (idempotência
    // final continua no ON CONFLICT do RPC)
    const known = await fetchKnownKeys(events.map((e) => e.key))

    for (const event of events) {
      if (known.has(event.key)) continue

      let xp: number
      let coins: number

      if (event.type === 'trello_checkitem_done') {
        xp = Math.round(TRELLO_CHECK_ITEM_BASE_XP * config.xp_multiplier)
        coins = Math.round(xp / 5)
      } else {
        // bônus de prazo/prioridade: usa os dados que já vieram
        // (arquivados) ou busca o card (conclusões via action)
        let due = event.due ?? null
        let priorityCount = event.highPriorityLabels ?? 0
        if (event.needsCardFetch) {
          const details = await getCard(event.cardId, token).catch(() => null)
          due = details?.due ?? null
          priorityCount = countHighPriorityLabels(details?.labels ?? [])
        }
        const completion = computeCompletion({
          xpBase: TRELLO_CARD_BASE_XP,
          coinBase: 0, // moedas derivadas do XP pelo engine
          virtueWeights: {},
          dueAt: due,
          completedAt: event.completedAt,
          highPriorityLabelCount: priorityCount,
          multiplier: config.xp_multiplier,
        })
        xp = completion.xp
        coins = completion.coins
      }

      const { data, error } = await supabase.rpc('record_activity', {
        p_source: 'trello',
        p_trello_action_id: event.key,
        p_mission_id: null,
        p_trello_board_id: config.trello_board_id,
        p_card_id: event.cardId,
        p_card_name: event.cardName,
        p_type: event.type,
        p_xp: xp,
        p_coins: coins,
        p_virtue_deltas: {},
      })
      if (error) throw error
      if (data) {
        processed += 1
        xpAwarded += xp
      }
    }
  }

  return { processed, xpAwarded }
}

/**
 * Polling inteligente: roda a cada 60s com a aba visível e pausa em
 * segundo plano (TanStack Query só refaz interval com a aba ativa por
 * padrão — refetchIntervalInBackground fica false).
 */
export function useTrelloSync(
  userId: string,
  token: string | null,
  configs: BoardConfigRow[] | undefined,
) {
  const queryClient = useQueryClient()
  const activeConfigs = (configs ?? []).filter((c) => c.active && c.done_list_id)

  return useQuery({
    queryKey: ['trello-sync', userId],
    queryFn: async () => {
      const result = await syncBoards(token!, activeConfigs)
      if (result.processed > 0) {
        toast.success(
          `Trello sincronizado: ${result.processed} ${result.processed === 1 ? 'conclusão' : 'conclusões'} // +${result.xpAwarded} XP`,
        )
        void queryClient.invalidateQueries({ queryKey: ['profile', userId] })
        void queryClient.invalidateQueries({ queryKey: ['activities', userId] })
        // conquistas podem ter destravado (ex.: multi-board)
        void supabase.rpc('sync_achievements').then(({ data }) => {
          if (data && data.length > 0) {
            void queryClient.invalidateQueries({ queryKey: ['user-achievements', userId] })
            void queryClient.invalidateQueries({ queryKey: ['profile', userId] })
          }
        })
      }
      return result
    },
    enabled: Boolean(token) && activeConfigs.length > 0,
    refetchInterval: SYNC_INTERVAL_MS,
    refetchOnWindowFocus: true,
    staleTime: SYNC_INTERVAL_MS / 2,
    retry: 1,
  })
}
