import { architectMessage, buildInsights, isoDate } from './architect'

const TODAY = new Date('2026-07-06T15:00:00Z')

function activity(overrides: {
  occurred_on: string
  xp_awarded?: number
  virtue_deltas?: Record<string, number>
}) {
  return {
    occurred_on: overrides.occurred_on,
    xp_awarded: overrides.xp_awarded ?? 50,
    virtue_deltas: overrides.virtue_deltas ?? {},
  }
}

describe('architectMessage', () => {
  it('é determinística para a mesma data', () => {
    const a = architectMessage(new Date('2026-07-06T08:00:00Z'))
    const b = architectMessage(new Date('2026-07-06T23:00:00Z'))
    expect(a).toBe(b)
    expect(a.length).toBeGreaterThan(0)
  })

  it('varia entre datas diferentes (ao longo de um mês)', () => {
    const messages = new Set<string>()
    for (let day = 1; day <= 28; day++) {
      messages.add(architectMessage(new Date(Date.UTC(2026, 6, day))))
    }
    expect(messages.size).toBeGreaterThan(1)
  })
})

describe('buildInsights', () => {
  const baseProfile = { streak_count: 0, last_activity_date: null }

  it('sem atividades → convite para começar', () => {
    const insights = buildInsights({ activities: [], profile: baseProfile, today: TODAY })
    expect(insights).toHaveLength(1)
    expect(insights[0]?.tone).toBe('neutral')
  })

  it('avisa streak em risco quando hoje ainda não pontuou', () => {
    const insights = buildInsights({
      activities: [activity({ occurred_on: '2026-07-05' })],
      profile: { streak_count: 4, last_activity_date: '2026-07-05' },
      today: TODAY,
    })
    expect(insights.some((i) => i.tone === 'warning' && i.text.includes('streak de 4'))).toBe(true)
  })

  it('não avisa streak quando já pontuou hoje', () => {
    const insights = buildInsights({
      activities: [activity({ occurred_on: isoDate(TODAY) })],
      profile: { streak_count: 4, last_activity_date: isoDate(TODAY) },
      today: TODAY,
    })
    expect(insights.some((i) => i.tone === 'warning')).toBe(false)
  })

  it('aponta a virtude mais treinada da semana', () => {
    const insights = buildInsights({
      activities: [
        activity({ occurred_on: '2026-07-04', virtue_deltas: { foco: 3, forca: 1 } }),
        activity({ occurred_on: '2026-07-05', virtue_deltas: { foco: 2 } }),
      ],
      profile: { streak_count: 1, last_activity_date: isoDate(TODAY) },
      today: TODAY,
    })
    expect(insights.some((i) => i.text.includes('Foco'))).toBe(true)
  })

  it('detecta tendência de XP em alta vs semana anterior', () => {
    const insights = buildInsights({
      activities: [
        // semana anterior (23/06–29/06): 100 XP
        activity({ occurred_on: '2026-06-25', xp_awarded: 100 }),
        // semana atual (30/06–06/07): 250 XP → +150%
        activity({ occurred_on: '2026-07-04', xp_awarded: 150 }),
        activity({ occurred_on: '2026-07-05', xp_awarded: 100 }),
      ],
      profile: { streak_count: 1, last_activity_date: isoDate(TODAY) },
      today: TODAY,
    })
    expect(insights.some((i) => i.text.includes('+150%'))).toBe(true)
  })

  it('celebra maratona com 3+ conclusões hoje', () => {
    const today = isoDate(TODAY)
    const insights = buildInsights({
      activities: [
        activity({ occurred_on: today }),
        activity({ occurred_on: today }),
        activity({ occurred_on: today }),
      ],
      profile: { streak_count: 1, last_activity_date: today },
      today: TODAY,
    })
    expect(insights.some((i) => i.text.includes('Maratona'))).toBe(true)
  })
})
