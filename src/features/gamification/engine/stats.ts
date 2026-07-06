/**
 * Séries derivadas de activities para gráficos e calendário.
 * Funções puras — datas em UTC (mesmo referencial do occurred_on).
 */

import type { ActivityRow } from '@/lib/database.types'
import { isoDate } from './architect'

type StatsActivity = Pick<ActivityRow, 'occurred_on' | 'xp_awarded'>

export interface DayPoint {
  /** AAAA-MM-DD (UTC) */
  date: string
  /** rótulo curto dd/MM */
  label: string
  xp: number
  count: number
}

/** Série diária dos últimos `days` dias (inclui hoje), zeros incluídos. */
export function dailyXpSeries(
  activities: StatsActivity[],
  days: number,
  today: Date = new Date(),
): DayPoint[] {
  const byDay = new Map<string, { xp: number; count: number }>()
  for (const activity of activities) {
    const bucket = byDay.get(activity.occurred_on) ?? { xp: 0, count: 0 }
    bucket.xp += activity.xp_awarded
    bucket.count += 1
    byDay.set(activity.occurred_on, bucket)
  }

  const series: DayPoint[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setUTCDate(d.getUTCDate() - i)
    const date = isoDate(d)
    const bucket = byDay.get(date)
    series.push({
      date,
      label: `${date.slice(8, 10)}/${date.slice(5, 7)}`,
      xp: bucket?.xp ?? 0,
      count: bucket?.count ?? 0,
    })
  }
  return series
}
