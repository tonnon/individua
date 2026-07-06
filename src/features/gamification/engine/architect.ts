/**
 * O Arquiteto — mensagens e insights 100% determinísticos, derivados
 * dos dados locais. Sem LLM e sem custo: a "Evolução Chat IA" real
 * (Fase 9) é outro módulo. Funções puras, cobertas por testes.
 */

import type { ActivityRow, ProfileRow } from '@/lib/database.types'
import { VIRTUE_CODES, VIRTUE_LABELS, type VirtueCode } from './virtues'

const DAILY_MESSAGES = [
  'A perfeição não é destino, é jornada constante.',
  'O tempo não espera, mas respeita quem age.',
  'Toda ação constrói uma fundação.',
  'Disciplina é liberdade com outro nome.',
  'O sistema observa: consistência vale mais que intensidade.',
  'Pequenas vitórias compõem grandes níveis.',
  'Quem controla a manhã controla o dia.',
  'Falhar faz parte do protocolo. Parar não.',
  'Sua versão futura é construída nas missões de hoje.',
  'Energia segue o foco. Direcione-a.',
  'Um dia por vez. Um card por vez. Um nível por vez.',
  'O streak é um pacto com você mesmo.',
  'Evolução silenciosa também é evolução.',
  'Não negocie com a preguiça: registre a missão e execute.',
]

/** AAAA-MM-DD em UTC — mesmo referencial do occurred_on do banco. */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Mensagem do dia: determinística por data (mesmo dia → mesma frase). */
export function architectMessage(date: Date): string {
  const key = isoDate(date)
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  }
  return DAILY_MESSAGES[hash % DAILY_MESSAGES.length] ?? 'Toda ação constrói uma fundação.'
}

export interface ArchitectInsight {
  tone: 'positive' | 'warning' | 'neutral'
  text: string
}

type InsightActivity = Pick<ActivityRow, 'occurred_on' | 'xp_awarded' | 'virtue_deltas'>
type InsightProfile = Pick<ProfileRow, 'streak_count' | 'last_activity_date'>

interface InsightInput {
  /** Atividades recentes (idealmente ≥ 14 dias para o comparativo semanal). */
  activities: InsightActivity[]
  profile: InsightProfile
  today: Date
}

function daysAgo(today: Date, days: number): string {
  const d = new Date(today)
  d.setUTCDate(d.getUTCDate() - days)
  return isoDate(d)
}

export function buildInsights({ activities, profile, today }: InsightInput): ArchitectInsight[] {
  const insights: ArchitectInsight[] = []
  const todayIso = isoDate(today)
  const weekStart = daysAgo(today, 6)
  const prevWeekStart = daysAgo(today, 13)

  if (activities.length === 0) {
    return [
      {
        tone: 'neutral',
        text: 'Nenhuma atividade registrada ainda. Crie sua primeira missão e o sistema começa a te observar.',
      },
    ]
  }

  // streak em risco: já tem streak, mas hoje ainda não pontuou
  if (profile.streak_count > 0 && profile.last_activity_date !== todayIso) {
    insights.push({
      tone: 'warning',
      text: `Seu streak de ${profile.streak_count} ${profile.streak_count === 1 ? 'dia' : 'dias'} está em risco — conclua uma missão hoje para mantê-lo.`,
    })
  }

  // virtude mais treinada nos últimos 7 dias
  const weekActivities = activities.filter((a) => a.occurred_on >= weekStart)
  const virtueTotals = new Map<VirtueCode, number>()
  for (const activity of weekActivities) {
    for (const code of VIRTUE_CODES) {
      const delta = Number(activity.virtue_deltas[code] ?? 0)
      if (delta > 0) virtueTotals.set(code, (virtueTotals.get(code) ?? 0) + delta)
    }
  }
  const topVirtue = [...virtueTotals.entries()].sort((a, b) => b[1] - a[1])[0]
  if (topVirtue) {
    insights.push({
      tone: 'positive',
      text: `Você treinou mais ${VIRTUE_LABELS[topVirtue[0]]} nos últimos 7 dias. Continue assim!`,
    })
  }

  // tendência de XP: esta semana vs anterior
  const weekXp = weekActivities.reduce((sum, a) => sum + a.xp_awarded, 0)
  const prevWeekXp = activities
    .filter((a) => a.occurred_on >= prevWeekStart && a.occurred_on < weekStart)
    .reduce((sum, a) => sum + a.xp_awarded, 0)
  if (prevWeekXp > 0 && weekXp > prevWeekXp) {
    const pct = Math.round(((weekXp - prevWeekXp) / prevWeekXp) * 100)
    insights.push({
      tone: 'positive',
      text: `Ritmo em alta: +${pct}% de XP em relação à semana anterior.`,
    })
  } else if (prevWeekXp > 0 && weekXp < prevWeekXp / 2) {
    insights.push({
      tone: 'warning',
      text: 'Seu XP caiu bastante em relação à semana anterior. Que tal uma missão curta para retomar o ritmo?',
    })
  }

  // maratona hoje
  const todayCount = activities.filter((a) => a.occurred_on === todayIso).length
  if (todayCount >= 3) {
    insights.push({
      tone: 'positive',
      text: `Maratona em andamento: ${todayCount} missões concluídas hoje.`,
    })
  }

  if (insights.length === 0) {
    insights.push({
      tone: 'neutral',
      text: 'Sistema estável. Mantenha o ritmo de missões para gerar novos insights.',
    })
  }

  return insights
}
