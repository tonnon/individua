// ============================================================
// Individua · Edge Function — webhook do Trello
// Recebe actions em tempo real e registra conclusões SEM o app
// aberto. Segurança: cada action recebida é re-verificada contra a
// API do Trello com o token do próprio usuário (GET /1/actions/{id})
// — payload forjado não passa. Idempotência: mesmas chaves do sync
// do client (action.id / checkitem-{id} / archive-{cardId}) + ON
// CONFLICT no banco; polling e webhook podem rodar juntos sem duplicar.
//
// Deploy:  npx supabase functions deploy trello-webhook --no-verify-jwt
// Secret:  npx supabase secrets set TRELLO_API_KEY=<sua key>
// ============================================================

import { createClient } from 'npm:@supabase/supabase-js@2'

const TRELLO_API = 'https://api.trello.com/1'

// mesmas regras do engine do client (src/features/gamification/engine)
const CARD_BASE_XP = 50
const CHECK_ITEM_BASE_XP = 10
const EARLY_BONUS_XP = 25
const PRIORITY_BONUS_XP = 10
const HIGH_PRIORITY_NAME = /priorid|urgent|alta|high/i

interface TrelloAction {
  id: string
  type: string
  date: string
  data: {
    board?: { id: string }
    card?: { id: string; name: string; closed?: boolean }
    list?: { id: string }
    listAfter?: { id: string }
    checkItem?: { id: string; name: string; state: string }
    old?: Record<string, unknown>
  }
}

function ok(): Response {
  // Trello desativa webhooks que respondem erro com frequência —
  // respondemos 200 mesmo quando ignoramos o payload
  return new Response('ok', { status: 200 })
}

Deno.serve(async (req) => {
  // verificação de registro do Trello (HEAD/GET no callbackURL)
  if (req.method === 'HEAD' || req.method === 'GET') return ok()
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })

  const trelloKey = Deno.env.get('TRELLO_API_KEY')
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const payload = await req.json().catch(() => null)
    const action: TrelloAction | undefined = payload?.action
    const boardId: string | undefined = payload?.model?.id ?? action?.data?.board?.id
    if (!trelloKey || !action?.id || !boardId || !action.data.card) return ok()

    // boards gamificados que apontam para este board (pode haver 1 por usuário)
    const { data: configs } = await supabase
      .from('boards_config')
      .select('user_id, trello_board_id, done_list_id, xp_multiplier, active')
      .eq('trello_board_id', boardId)
      .eq('active', true)

    for (const config of configs ?? []) {
      if (!config.done_list_id) continue

      const { data: profile } = await supabase
        .from('profiles')
        .select('trello_token')
        .eq('id', config.user_id)
        .single()
      const token = profile?.trello_token
      if (!token) continue

      // anti-forja: a action precisa existir de verdade no Trello
      const verifyResponse = await fetch(
        `${TRELLO_API}/actions/${action.id}?key=${trelloKey}&token=${token}`,
      )
      if (!verifyResponse.ok) continue
      const verified: TrelloAction = await verifyResponse.json()
      const card = verified.data.card
      if (!card) continue

      // classifica o evento (mesmas regras do sync do client)
      let key: string | null = null
      let type = ''
      let xp = 0
      let coins = 0
      let cardName = card.name

      const isDoneArrival =
        (verified.type === 'updateCard' && verified.data.listAfter?.id === config.done_list_id) ||
        (verified.type === 'createCard' && verified.data.list?.id === config.done_list_id)
      const isCheckItem =
        verified.type === 'updateCheckItemStateOnCard' &&
        verified.data.checkItem?.state === 'complete'
      const isArchive =
        verified.type === 'updateCard' &&
        card.closed === true &&
        verified.data.old !== undefined &&
        'closed' in verified.data.old

      if (isCheckItem) {
        key = `checkitem-${verified.data.checkItem!.id}`
        type = 'trello_checkitem_done'
        xp = Math.round(CHECK_ITEM_BASE_XP * config.xp_multiplier)
        coins = Math.round(xp / 5)
        cardName = `${verified.data.checkItem!.name} · ${card.name}`
      } else if (isDoneArrival || isArchive) {
        key = isDoneArrival ? verified.id : `archive-${card.id}`
        type = isDoneArrival ? 'trello_card_done' : 'trello_card_archived'

        // bônus de prazo/prioridade — busca o card (pode ter sido excluído)
        let due: string | null = null
        let priorityCount = 0
        const cardResponse = await fetch(
          `${TRELLO_API}/cards/${card.id}?fields=name,due&labels=all&key=${trelloKey}&token=${token}`,
        )
        if (cardResponse.ok) {
          const details = await cardResponse.json()
          due = details.due ?? null
          cardName = details.name ?? card.name
          priorityCount = (details.labels ?? []).filter(
            (label: { color: string | null; name: string }) =>
              label.color === 'red' || HIGH_PRIORITY_NAME.test(label.name),
          ).length
        }

        xp = CARD_BASE_XP
        if (due && new Date(verified.date).getTime() < new Date(due).getTime()) {
          xp += EARLY_BONUS_XP
        }
        xp += priorityCount * PRIORITY_BONUS_XP
        xp = Math.round(xp * config.xp_multiplier)
        coins = Math.round(xp / 5)
      }

      if (!key) continue

      await supabase.rpc('record_activity_admin', {
        p_user_id: config.user_id,
        p_source: 'trello',
        p_trello_action_id: key,
        p_mission_id: null,
        p_trello_board_id: config.trello_board_id,
        p_card_id: card.id,
        p_card_name: cardName,
        p_type: type,
        p_xp: xp,
        p_coins: coins,
        p_virtue_deltas: {},
      })
    }
  } catch (_error) {
    // nunca propagar erro para o Trello (desativaria o webhook);
    // o polling do client cobre qualquer evento perdido
  }

  return ok()
})
