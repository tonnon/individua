/**
 * Virtudes de caráter destravadas por marcos de nível — sistema
 * distinto dos 6 atributos de status (que crescem por missão).
 * Puramente derivado do nível: sem tabela no banco.
 */

export interface VirtueMilestone {
  code: string
  name: string
  minLevel: number
  description: string
  /** ícone Lucide */
  icon: string
  /** cor de dado (mesma família das labels do Trello) */
  hex: string
}

export const VIRTUE_MILESTONES: readonly VirtueMilestone[] = [
  {
    code: 'disciplina',
    name: 'Disciplina',
    minLevel: 10,
    description: 'A base de tudo: fazer o combinado mesmo sem vontade.',
    icon: 'shield-check',
    hex: '#f87462',
  },
  {
    code: 'coragem',
    name: 'Coragem',
    minLevel: 20,
    description: 'Encarar a missão difícil primeiro, não por último.',
    icon: 'sword',
    hex: '#faa53d',
  },
  {
    code: 'sabedoria',
    name: 'Sabedoria',
    minLevel: 30,
    description: 'Saber o que NÃO fazer vale tanto quanto executar.',
    icon: 'book-open',
    hex: '#9f8fef',
  },
  {
    code: 'empatia',
    name: 'Empatia',
    minLevel: 40,
    description: 'Evoluir sem pisar em ninguém — nem em você mesmo.',
    icon: 'heart-handshake',
    hex: '#e774bb',
  },
  {
    code: 'resiliencia',
    name: 'Resiliência',
    minLevel: 50,
    description: 'Quebrar o streak e voltar no dia seguinte, sem drama.',
    icon: 'refresh-ccw',
    hex: '#4bce97',
  },
  {
    code: 'criatividade',
    name: 'Criatividade',
    minLevel: 60,
    description: 'Transformar restrição em vantagem. O nível máximo do jogo.',
    icon: 'lightbulb',
    hex: '#e2b203',
  },
]

export function unlockedVirtues(level: number): VirtueMilestone[] {
  return VIRTUE_MILESTONES.filter((v) => level >= v.minLevel)
}
