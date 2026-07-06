import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { useCelebrationStore } from '@/features/gamification/celebration-store'
import { levelTitle } from '@/features/gamification/engine/level-titles'
import { xpToLevel } from '@/features/gamification/engine/xp-curve'
import {
  useAchievementsCatalog,
  useSyncAchievements,
} from '@/features/gamification/use-achievements'
import { useCompleteMission } from '@/features/gamification/use-missions'
import type { MissionRow, ProfileRow } from '@/lib/database.types'

/**
 * Fluxo completo de conclusão de missão, compartilhado entre as telas
 * (Missões, Dashboard): registra a atividade, detecta level up,
 * sincroniza conquistas e dispara as celebrações na ordem.
 */
export function useCompletionFlow(userId: string) {
  const queryClient = useQueryClient()
  const completeMission = useCompleteMission(userId)
  const syncAchievements = useSyncAchievements(userId)
  const catalog = useAchievementsCatalog()
  const celebrate = useCelebrationStore((s) => s.celebrate)

  const complete = (mission: MissionRow) => {
    const profileBefore = queryClient.getQueryData<ProfileRow>(['profile', userId])

    completeMission.mutate(mission, {
      onSuccess: (result) => {
        if (result.alreadyCompleted) {
          toast.info('Essa missão já foi concluída hoje.')
          return
        }

        toast.success(`Missão concluída — +${result.xpAwarded} XP // +${result.coinsAwarded} coins`)

        if (profileBefore) {
          const levelBefore = xpToLevel(profileBefore.xp)
          const levelAfter = xpToLevel(profileBefore.xp + result.xpAwarded)
          if (levelAfter > levelBefore) {
            celebrate({ type: 'levelup', level: levelAfter, title: levelTitle(levelAfter) })
          }
        }

        // conquistas: validação é do servidor; aqui só celebramos o retorno
        syncAchievements.mutate(undefined, {
          onSuccess: (newCodes) => {
            for (const code of newCodes) {
              const achievement = catalog.data?.find((a) => a.code === code)
              celebrate({
                type: 'achievement',
                name: achievement?.name ?? code,
                xpReward: achievement?.xp_reward ?? 0,
              })
            }
          },
        })

        void queryClient.invalidateQueries({ queryKey: ['activities', userId] })
      },
      onError: () => toast.error('Não foi possível concluir a missão.'),
    })
  }

  return { complete, isPending: completeMission.isPending }
}
