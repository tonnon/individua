/**
 * Curva de XP/nível/rank. Fonte única de verdade — nunca duplicar
 * esta fórmula no banco (o RPC record_activity só soma xp bruto;
 * level e rank são sempre derivados aqui, na hora de exibir).
 */

export function xpToLevel(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(xp, 0) / 100)) + 1
}

/** XP mínimo para alcançar `level` — inverso de xpToLevel. */
export function xpForLevel(level: number): number {
  return 100 * (level - 1) ** 2
}

export interface LevelProgress {
  level: number
  xpIntoLevel: number
  xpToNextLevel: number
  /** 0–1 */
  progress: number
}

export function levelProgress(xp: number): LevelProgress {
  const level = xpToLevel(xp)
  const floorXp = xpForLevel(level)
  const nextFloorXp = xpForLevel(level + 1)
  const xpToNextLevel = nextFloorXp - floorXp
  return {
    level,
    xpIntoLevel: xp - floorXp,
    xpToNextLevel,
    progress: xpToNextLevel > 0 ? (xp - floorXp) / xpToNextLevel : 1,
  }
}

export type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S'

const RANK_THRESHOLDS: ReadonlyArray<{ minLevel: number; rank: Rank }> = [
  { minLevel: 50, rank: 'S' },
  { minLevel: 35, rank: 'A' },
  { minLevel: 20, rank: 'B' },
  { minLevel: 10, rank: 'C' },
  { minLevel: 5, rank: 'D' },
  { minLevel: 1, rank: 'E' },
]

export function rankForLevel(level: number): Rank {
  const tier = RANK_THRESHOLDS.find((t) => level >= t.minLevel)
  return tier?.rank ?? 'E'
}
