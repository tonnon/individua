import type { VirtueMap } from '@/lib/database.types'

/** Bônus por concluir antes do prazo (due date do card/missão). */
const EARLY_COMPLETION_BONUS_XP = 25
/** Bônus por label de prioridade alta, multiplicado pela contagem. */
const HIGH_PRIORITY_BONUS_XP = 10

export interface CompletionInput {
  xpBase: number
  /** 0 = sem recompensa fixa; nesse caso as moedas são derivadas do XP. */
  coinBase: number
  virtueWeights: VirtueMap
  /** ISO 8601, ou null/undefined se não houver prazo. */
  dueAt?: string | null
  completedAt: Date
  highPriorityLabelCount?: number
  /** xp_multiplier do board (Trello) ou 1 para missões manuais. */
  multiplier?: number
}

export interface CompletionEvent {
  xp: number
  coins: number
  virtueDeltas: VirtueMap
}

export function computeCompletion(input: CompletionInput): CompletionEvent {
  const multiplier = input.multiplier ?? 1

  let xp = input.xpBase
  if (input.dueAt && input.completedAt.getTime() < new Date(input.dueAt).getTime()) {
    xp += EARLY_COMPLETION_BONUS_XP
  }
  xp += (input.highPriorityLabelCount ?? 0) * HIGH_PRIORITY_BONUS_XP
  xp = Math.round(xp * multiplier)

  // recompensa fixa definida pelo usuário (missão manual) tem prioridade;
  // conclusões sem coinBase (ex.: cards do Trello) derivam moedas do XP.
  const coins = input.coinBase > 0 ? input.coinBase : Math.round(xp / 5)

  return { xp, coins, virtueDeltas: { ...input.virtueWeights } }
}
