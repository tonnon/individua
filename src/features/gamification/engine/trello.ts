/**
 * Regras puras da integração Trello: o que conta como "chegou na
 * lista Concluído" e o que conta como label de prioridade alta.
 */

import type { TrelloAction, TrelloLabel } from '@/features/trello/api'

/** XP base por card concluído no Trello (spec: 50). */
export const TRELLO_CARD_BASE_XP = 50

/** XP base por item de checklist marcado (frequente → valor pequeno). */
export const TRELLO_CHECK_ITEM_BASE_XP = 10

/**
 * True se a ação representa um card chegando na lista "Concluído":
 * movido para ela (updateCard com listAfter) ou criado direto nela.
 */
export function isDoneListArrival(action: TrelloAction, doneListId: string): boolean {
  if (!action.data.card) return false
  if (action.type === 'updateCard') return action.data.listAfter?.id === doneListId
  if (action.type === 'createCard') return action.data.list?.id === doneListId
  return false
}

/** True quando um item de checklist foi MARCADO (desmarcar não conta). */
export function isCheckItemCompleted(action: TrelloAction): boolean {
  return (
    action.type === 'updateCheckItemStateOnCard' &&
    action.data.checkItem?.state === 'complete' &&
    Boolean(action.data.card)
  )
}

/** True quando o card foi ARQUIVADO (desarquivar não conta). */
export function isCardArchived(action: TrelloAction): boolean {
  return (
    action.type === 'updateCard' &&
    action.data.card?.closed === true &&
    action.data.old !== undefined &&
    'closed' in action.data.old
  )
}

/**
 * Chaves de idempotência anti-farm: marcar → desmarcar → marcar (ou
 * arquivar → desarquivar → arquivar) gera actions novas no Trello,
 * mas a chave é derivada do ITEM/CARD — só pontua uma vez na vida.
 * (Chegada na lista Concluído segue usando o id da action, como na spec.)
 */
export function checkItemActivityKey(checkItemId: string): string {
  return `checkitem-${checkItemId}`
}

export function archiveActivityKey(cardId: string): string {
  return `archive-${cardId}`
}

const HIGH_PRIORITY_NAME = /priorid|urgent|alta|high/i

/**
 * Labels de prioridade alta: vermelhas, ou com nome sugestivo
 * ("prioridade", "urgente", "alta", "high").
 */
export function countHighPriorityLabels(labels: TrelloLabel[]): number {
  return labels.filter((label) => label.color === 'red' || HIGH_PRIORITY_NAME.test(label.name))
    .length
}
