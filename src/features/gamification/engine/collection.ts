/**
 * Metadados de raridade da coleção (espelho client-side das regras
 * do RPC sync_special_missions — goal/prazo/XP escalam com a raridade).
 */

export const RARITY_ORDER = ['comum', 'incomum', 'raro', 'epico', 'lendario', 'mitico'] as const

export type Rarity = (typeof RARITY_ORDER)[number]

export interface RarityMeta {
  label: string
  /** cor de dado (mesma família das labels do Trello) */
  hex: string
  /** meta da missão especial: conclusões dentro do prazo */
  goal: number
  hours: number
  xpReward: number
}

export const RARITY_META: Record<Rarity, RarityMeta> = {
  comum: { label: 'Comum', hex: '#8590a2', goal: 2, hours: 24, xpReward: 25 },
  incomum: { label: 'Incomum', hex: '#4bce97', goal: 3, hours: 36, xpReward: 50 },
  raro: { label: 'Raro', hex: '#579dff', goal: 4, hours: 48, xpReward: 75 },
  epico: { label: 'Épico', hex: '#9f8fef', goal: 6, hours: 72, xpReward: 100 },
  lendario: { label: 'Lendário', hex: '#e2b203', goal: 8, hours: 96, xpReward: 150 },
  mitico: { label: 'Mítico', hex: '#f87462', goal: 10, hours: 120, xpReward: 200 },
}
