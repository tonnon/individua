export const VIRTUE_CODES = [
  'forca',
  'vitalidade',
  'foco',
  'carisma',
  'disciplina',
  'sabedoria',
] as const

export type VirtueCode = (typeof VIRTUE_CODES)[number]

export const VIRTUE_LABELS: Record<VirtueCode, string> = {
  forca: 'Força',
  vitalidade: 'Vitalidade',
  foco: 'Foco',
  carisma: 'Carisma',
  disciplina: 'Disciplina',
  sabedoria: 'Sabedoria',
}
