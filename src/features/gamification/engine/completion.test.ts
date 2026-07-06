import { computeCompletion } from './completion'

const BASE_DATE = new Date('2026-07-05T12:00:00Z')

describe('computeCompletion', () => {
  it('aplica só o XP base sem bônus nem prazo', () => {
    const result = computeCompletion({
      xpBase: 50,
      coinBase: 0,
      virtueWeights: {},
      completedAt: BASE_DATE,
    })
    expect(result.xp).toBe(50)
  })

  it('soma o bônus de conclusão antecipada quando termina antes do prazo', () => {
    const result = computeCompletion({
      xpBase: 50,
      coinBase: 0,
      virtueWeights: {},
      dueAt: '2026-07-06T00:00:00Z',
      completedAt: BASE_DATE,
    })
    expect(result.xp).toBe(75)
  })

  it('não soma o bônus de prazo quando termina depois do prazo', () => {
    const result = computeCompletion({
      xpBase: 50,
      coinBase: 0,
      virtueWeights: {},
      dueAt: '2026-07-01T00:00:00Z',
      completedAt: BASE_DATE,
    })
    expect(result.xp).toBe(50)
  })

  it('soma 10 XP por label de prioridade alta', () => {
    const result = computeCompletion({
      xpBase: 50,
      coinBase: 0,
      virtueWeights: {},
      highPriorityLabelCount: 2,
      completedAt: BASE_DATE,
    })
    expect(result.xp).toBe(70)
  })

  it('aplica o multiplicador do board por cima da soma de bônus', () => {
    const result = computeCompletion({
      xpBase: 50,
      coinBase: 0,
      virtueWeights: {},
      highPriorityLabelCount: 1,
      multiplier: 2,
      completedAt: BASE_DATE,
    })
    expect(result.xp).toBe(120)
  })

  it('deriva moedas do XP quando a missão não define coinBase', () => {
    const result = computeCompletion({
      xpBase: 100,
      coinBase: 0,
      virtueWeights: {},
      completedAt: BASE_DATE,
    })
    expect(result.coins).toBe(20)
  })

  it('respeita o coinBase explícito da missão em vez de derivar', () => {
    const result = computeCompletion({
      xpBase: 100,
      coinBase: 15,
      virtueWeights: {},
      completedAt: BASE_DATE,
    })
    expect(result.coins).toBe(15)
  })

  it('repassa os pesos de virtude como deltas, sem alterar os valores', () => {
    const result = computeCompletion({
      xpBase: 50,
      coinBase: 0,
      virtueWeights: { disciplina: 2, foco: 1 },
      completedAt: BASE_DATE,
    })
    expect(result.virtueDeltas).toEqual({ disciplina: 2, foco: 1 })
  })
})
