import { levelTitle } from './level-titles'

describe('levelTitle', () => {
  it('começa em O Despertar', () => {
    expect(levelTitle(1)).toBe('O Despertar')
    expect(levelTitle(4)).toBe('O Despertar')
  })

  it('troca de título exatamente nos marcos', () => {
    expect(levelTitle(5)).toBe('Caminho Desconhecido')
    expect(levelTitle(9)).toBe('Caminho Desconhecido')
    expect(levelTitle(10)).toBe('Sistema Ativo')
    expect(levelTitle(20)).toBe('Disciplina Forjada')
    expect(levelTitle(50)).toBe('Transcendência')
  })

  it('mantém o último título acima do teto', () => {
    expect(levelTitle(120)).toBe('Transcendência')
  })

  it('não quebra com nível inválido', () => {
    expect(levelTitle(0)).toBe('O Despertar')
    expect(levelTitle(-3)).toBe('O Despertar')
  })
})
