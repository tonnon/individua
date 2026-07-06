/**
 * Client mínimo da API REST do Trello (chamadas client-side, padrão
 * do Trello: key + token via query string). O token NUNCA deve ir
 * para logs — não logar URLs deste módulo.
 */

import { env } from '@/lib/env'

const TRELLO_API = 'https://api.trello.com/1'

export interface TrelloMember {
  id: string
  username: string
  fullName: string
}

export interface TrelloBoard {
  id: string
  name: string
  closed: boolean
  url: string
}

export interface TrelloList {
  id: string
  name: string
}

export interface TrelloLabel {
  id: string
  name: string
  color: string | null
}

export interface TrelloCard {
  id: string
  name: string
  due: string | null
  labels: TrelloLabel[]
}

/** Card completo para o board view (espelho do board no app). */
export interface TrelloBoardCard {
  id: string
  name: string
  desc: string
  due: string | null
  idList: string
  pos: number
  labels: TrelloLabel[]
  badges: {
    checkItems: number
    checkItemsChecked: number
    comments: number
  }
}

export interface TrelloCheckItem {
  id: string
  name: string
  state: 'complete' | 'incomplete'
  pos: number
}

export interface TrelloChecklist {
  id: string
  name: string
  idCard: string
  pos: number
  checkItems: TrelloCheckItem[]
}

export interface TrelloComment {
  id: string
  date: string
  data: { text: string }
  memberCreator: { id: string; fullName: string; username: string }
}

/** Ações que geram XP: chegada na lista Concluído, item de checklist
 * marcado e card arquivado. */
export interface TrelloAction {
  id: string
  type: string
  date: string
  data: {
    card?: { id: string; name: string; closed?: boolean }
    list?: { id: string; name?: string }
    listAfter?: { id: string; name?: string }
    checkItem?: { id: string; name: string; state: 'complete' | 'incomplete' }
    old?: Record<string, unknown>
  }
}

export function trelloAuthorizeUrl(returnUrl: string): string {
  const key = env.VITE_TRELLO_API_KEY
  if (!key) {
    throw new Error('VITE_TRELLO_API_KEY ausente no .env — veja o README.')
  }
  const params = new URLSearchParams({
    expiration: 'never',
    name: 'Individua',
    scope: 'read,write',
    response_type: 'token',
    key,
    return_url: returnUrl,
  })
  return `https://trello.com/1/authorize?${params.toString()}`
}

async function trelloFetch<T>(
  path: string,
  token: string,
  params?: Record<string, string>,
  method: 'GET' | 'PUT' | 'POST' | 'DELETE' = 'GET',
) {
  const key = env.VITE_TRELLO_API_KEY
  if (!key) {
    throw new Error('VITE_TRELLO_API_KEY ausente no .env — veja o README.')
  }
  const search = new URLSearchParams({ ...params, key, token })
  const response = await fetch(`${TRELLO_API}${path}?${search.toString()}`, { method })
  if (!response.ok) {
    // sem URL na mensagem: ela carrega o token
    throw new Error(`Trello respondeu ${response.status} em ${path}`)
  }
  return (await response.json()) as T
}

export function getMe(token: string) {
  return trelloFetch<TrelloMember>('/members/me', token, {
    fields: 'username,fullName',
  })
}

export function getMyBoards(token: string) {
  return trelloFetch<TrelloBoard[]>('/members/me/boards', token, {
    fields: 'name,closed,url',
    filter: 'open',
  })
}

export function getBoardLists(boardId: string, token: string) {
  return trelloFetch<TrelloList[]>(`/boards/${boardId}/lists`, token, {
    fields: 'name',
    filter: 'open',
  })
}

/** Últimas ações que podem gerar XP no board. */
export function getBoardActions(boardId: string, token: string) {
  return trelloFetch<TrelloAction[]>(`/boards/${boardId}/actions`, token, {
    filter: 'updateCard:idList,updateCard:closed,createCard,updateCheckItemStateOnCard',
    limit: '50',
  })
}

export function getCard(cardId: string, token: string) {
  return trelloFetch<TrelloCard>(`/cards/${cardId}`, token, {
    fields: 'name,due',
    labels: 'all',
  })
}

// ————— board view: gestão de cards dentro do app —————

export function getBoard(boardId: string, token: string) {
  return trelloFetch<TrelloBoard>(`/boards/${boardId}`, token, { fields: 'name,url' })
}

export function getBoardCards(boardId: string, token: string) {
  return trelloFetch<TrelloBoardCard[]>(`/boards/${boardId}/cards`, token, {
    fields: 'name,desc,due,idList,pos,labels,badges',
  })
}

export function getBoardLabels(boardId: string, token: string) {
  return trelloFetch<TrelloLabel[]>(`/boards/${boardId}/labels`, token, {
    fields: 'name,color',
  })
}

/** PUT genérico no card (mover, renomear, prazo, labels, arquivar…). */
export function updateCard(cardId: string, token: string, params: Record<string, string>) {
  return trelloFetch<TrelloBoardCard>(`/cards/${cardId}`, token, params, 'PUT')
}

export function createCard(listId: string, name: string, token: string) {
  return trelloFetch<TrelloBoardCard>('/cards', token, { idList: listId, name }, 'POST')
}

// ————— checklists —————

export function getCardChecklists(cardId: string, token: string) {
  return trelloFetch<TrelloChecklist[]>(`/cards/${cardId}/checklists`, token, {
    fields: 'name,idCard,pos',
    checkItems: 'all',
    checkItem_fields: 'name,state,pos',
  })
}

/** TODAS as checklists do board numa chamada — base da varredura de
 * estado (pontua itens marcados antes mesmo de conectar o board). */
export function getBoardChecklists(boardId: string, token: string) {
  return trelloFetch<TrelloChecklist[]>(`/boards/${boardId}/checklists`, token, {
    fields: 'name,idCard,pos',
    checkItems: 'all',
    checkItem_fields: 'name,state,pos',
  })
}

/** Cards arquivados do board (para XP retroativo de arquivamento). */
export function getClosedCards(boardId: string, token: string) {
  return trelloFetch<TrelloCard[]>(`/boards/${boardId}/cards/closed`, token, {
    fields: 'name,due,labels',
  })
}

export function setCheckItemState(
  cardId: string,
  checkItemId: string,
  state: 'complete' | 'incomplete',
  token: string,
) {
  return trelloFetch<TrelloCheckItem>(
    `/cards/${cardId}/checkItem/${checkItemId}`,
    token,
    { state },
    'PUT',
  )
}

export function addCheckItem(checklistId: string, name: string, token: string) {
  return trelloFetch<TrelloCheckItem>(
    `/checklists/${checklistId}/checkItems`,
    token,
    { name },
    'POST',
  )
}

export function deleteCheckItem(checklistId: string, checkItemId: string, token: string) {
  return trelloFetch<unknown>(
    `/checklists/${checklistId}/checkItems/${checkItemId}`,
    token,
    {},
    'DELETE',
  )
}

export function createChecklist(cardId: string, name: string, token: string) {
  return trelloFetch<TrelloChecklist>('/checklists', token, { idCard: cardId, name }, 'POST')
}

export function deleteChecklist(checklistId: string, token: string) {
  return trelloFetch<unknown>(`/checklists/${checklistId}`, token, {}, 'DELETE')
}

// ————— comentários —————

export function getCardComments(cardId: string, token: string) {
  return trelloFetch<TrelloComment[]>(`/cards/${cardId}/actions`, token, {
    filter: 'commentCard',
    limit: '50',
  })
}

export function addCardComment(cardId: string, text: string, token: string) {
  return trelloFetch<TrelloComment>(`/cards/${cardId}/actions/comments`, token, { text }, 'POST')
}

// ————— webhooks (XP em tempo real, sem o app aberto) —————

export interface TrelloWebhook {
  id: string
  idModel: string
  callbackURL: string
}

/** Registra um webhook do board → Edge Function (o Trello valida o
 * callbackURL com um HEAD na hora — a function precisa estar no ar). */
export function createTrelloWebhook(boardId: string, callbackUrl: string, token: string) {
  return trelloFetch<TrelloWebhook>(
    `/tokens/${token}/webhooks`,
    token,
    { idModel: boardId, callbackURL: callbackUrl, description: `Individua — ${boardId}` },
    'POST',
  )
}

export function deleteTrelloWebhook(webhookId: string, token: string) {
  return trelloFetch<unknown>(`/webhooks/${webhookId}`, token, {}, 'DELETE')
}
