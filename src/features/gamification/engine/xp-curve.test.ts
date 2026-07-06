import { levelProgress, rankForLevel, xpForLevel, xpToLevel } from './xp-curve'

describe('xpToLevel', () => {
  it('começa no nível 1 com 0 XP', () => {
    expect(xpToLevel(0)).toBe(1)
  })

  it('permanece no nível 1 logo abaixo do próximo limiar', () => {
    expect(xpToLevel(99)).toBe(1)
  })

  it('sobe de nível exatamente no limiar', () => {
    expect(xpToLevel(100)).toBe(2)
  })

  it('nunca fica abaixo do nível 1 com XP negativo', () => {
    expect(xpToLevel(-50)).toBe(1)
  })
})

describe('xpForLevel', () => {
  it('é a inversa de xpToLevel nos limiares', () => {
    for (const level of [1, 2, 3, 5, 10]) {
      expect(xpToLevel(xpForLevel(level))).toBe(level)
    }
  })
})

describe('levelProgress', () => {
  it('reporta 50% no meio do nível 1', () => {
    const progress = levelProgress(50)
    expect(progress).toEqual({
      level: 1,
      xpIntoLevel: 50,
      xpToNextLevel: 100,
      progress: 0.5,
    })
  })

  it('reseta para 0% logo ao subir de nível', () => {
    const progress = levelProgress(100)
    expect(progress.level).toBe(2)
    expect(progress.xpIntoLevel).toBe(0)
  })
})

describe('rankForLevel', () => {
  it.each([
    [1, 'E'],
    [4, 'E'],
    [5, 'D'],
    [9, 'D'],
    [10, 'C'],
    [19, 'C'],
    [20, 'B'],
    [34, 'B'],
    [35, 'A'],
    [49, 'A'],
    [50, 'S'],
    [200, 'S'],
  ] as const)('nível %i vira rank %s', (level, rank) => {
    expect(rankForLevel(level)).toBe(rank)
  })
})
