import { VIRTUE_MILESTONES, unlockedVirtues } from './level-virtues'

describe('unlockedVirtues', () => {
  it('nível baixo não destrava nada', () => {
    expect(unlockedVirtues(1)).toHaveLength(0)
    expect(unlockedVirtues(9)).toHaveLength(0)
  })

  it('destrava exatamente no marco', () => {
    expect(unlockedVirtues(10).map((v) => v.code)).toEqual(['disciplina'])
    expect(unlockedVirtues(20).map((v) => v.code)).toEqual(['disciplina', 'coragem'])
  })

  it('nível máximo destrava todas', () => {
    expect(unlockedVirtues(60)).toHaveLength(VIRTUE_MILESTONES.length)
  })
})
