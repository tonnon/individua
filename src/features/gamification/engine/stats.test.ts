import { dailyXpSeries } from './stats'

const TODAY = new Date('2026-07-06T15:00:00Z')

describe('dailyXpSeries', () => {
  it('gera 7 dias em ordem cronológica com zeros preenchidos', () => {
    const series = dailyXpSeries([], 7, TODAY)
    expect(series).toHaveLength(7)
    expect(series[0]?.date).toBe('2026-06-30')
    expect(series[6]?.date).toBe('2026-07-06')
    expect(series.every((p) => p.xp === 0 && p.count === 0)).toBe(true)
  })

  it('agrega XP e contagem por dia', () => {
    const series = dailyXpSeries(
      [
        { occurred_on: '2026-07-05', xp_awarded: 50 },
        { occurred_on: '2026-07-05', xp_awarded: 25 },
        { occurred_on: '2026-07-06', xp_awarded: 10 },
      ],
      7,
      TODAY,
    )
    const day5 = series.find((p) => p.date === '2026-07-05')
    expect(day5?.xp).toBe(75)
    expect(day5?.count).toBe(2)
    expect(series.find((p) => p.date === '2026-07-06')?.xp).toBe(10)
  })

  it('ignora atividades fora da janela', () => {
    const series = dailyXpSeries([{ occurred_on: '2026-06-01', xp_awarded: 999 }], 7, TODAY)
    expect(series.every((p) => p.xp === 0)).toBe(true)
  })

  it('formata o rótulo como dd/MM', () => {
    const series = dailyXpSeries([], 1, TODAY)
    expect(series[0]?.label).toBe('06/07')
  })
})
