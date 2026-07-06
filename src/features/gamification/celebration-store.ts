import { create } from 'zustand'

// união discriminada — Omit<união> colapsaria nos campos comuns,
// então o input é um tipo próprio e o id entra na interseção
export type CelebrationInput =
  | { type: 'levelup'; level: number; title: string }
  | { type: 'achievement'; name: string; xpReward: number }

export type Celebration = CelebrationInput & { id: number }

interface CelebrationState {
  /** fila: uma celebração por vez, na ordem em que aconteceram */
  queue: Celebration[]
  celebrate: (celebration: CelebrationInput) => void
  dismiss: () => void
}

let nextId = 1

export const useCelebrationStore = create<CelebrationState>()((set) => ({
  queue: [],
  celebrate: (celebration) =>
    set((state) => ({
      queue: [...state.queue, { ...celebration, id: nextId++ }],
    })),
  dismiss: () => set((state) => ({ queue: state.queue.slice(1) })),
}))
