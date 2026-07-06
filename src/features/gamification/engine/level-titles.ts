/**
 * Títulos de marco por nível — puramente derivados, como level/rank.
 * O título vigente é o do maior marco já alcançado.
 */

/** Marcos em ordem decrescente — a Árvore de Evolução usa a lista inteira. */
export const LEVEL_MILESTONES: ReadonlyArray<{ minLevel: number; title: string }> = [
  { minLevel: 50, title: 'Transcendência' },
  { minLevel: 45, title: 'Arquiteto de Si' },
  { minLevel: 40, title: 'Vontade de Aço' },
  { minLevel: 35, title: 'Sincronia Total' },
  { minLevel: 30, title: 'Operador de Elite' },
  { minLevel: 25, title: 'Protocolo Avançado' },
  { minLevel: 20, title: 'Disciplina Forjada' },
  { minLevel: 15, title: 'Ritmo Constante' },
  { minLevel: 10, title: 'Sistema Ativo' },
  { minLevel: 5, title: 'Caminho Desconhecido' },
  { minLevel: 1, title: 'O Despertar' },
]

export function levelTitle(level: number): string {
  const tier = LEVEL_MILESTONES.find((t) => level >= t.minLevel)
  return tier?.title ?? 'O Despertar'
}
