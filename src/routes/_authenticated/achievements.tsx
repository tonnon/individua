import { useEffect, useRef } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  CalendarCheck,
  Clock,
  Crown,
  Flame,
  Layers,
  Lock,
  Medal,
  Moon,
  Rocket,
  Sunrise,
  Target,
  TrendingUp,
  Trophy,
  Zap,
  type LucideIcon,
} from 'lucide-react'

import { HudPanel } from '@/components/hud/hud-panel'
import { HudStat } from '@/components/hud/hud-stat'
import {
  useAchievementsCatalog,
  useSyncAchievements,
  useUserAchievements,
} from '@/features/gamification/use-achievements'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authenticated/achievements')({
  component: AchievementsPage,
})

/** ícones do seed (achievements.icon) → componentes Lucide */
const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  rocket: Rocket,
  target: Target,
  medal: Medal,
  crown: Crown,
  flame: Flame,
  'calendar-check': CalendarCheck,
  sunrise: Sunrise,
  moon: Moon,
  zap: Zap,
  clock: Clock,
  layers: Layers,
  'trending-up': TrendingUp,
}

function AchievementsPage() {
  const { user } = Route.useRouteContext()
  const catalog = useAchievementsCatalog()
  const unlocked = useUserAchievements(user.id)
  const syncAchievements = useSyncAchievements(user.id)

  // reavalia condições ao abrir a galeria (pega conquistas atrasadas);
  // celebração fica por conta do fluxo de conclusão — aqui é silencioso
  const synced = useRef(false)
  useEffect(() => {
    if (!synced.current) {
      synced.current = true
      syncAchievements.mutate()
    }
  }, [syncAchievements])

  const unlockedCodes = new Set((unlocked.data ?? []).map((u) => u.achievement_code))
  const unlockedAt = new Map((unlocked.data ?? []).map((u) => [u.achievement_code, u.unlocked_at]))
  const total = catalog.data?.length ?? 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-wide text-ink">
          <Trophy className="size-5 text-magenta" aria-hidden />
          Galeria de conquistas
        </h2>
        <HudStat
          label="DESBLOQUEADAS"
          value={`${unlockedCodes.size}/${total || '—'}`}
          tone="magenta"
        />
      </div>

      {catalog.isLoading && <p className="text-sm text-ink-dim">Carregando conquistas…</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {catalog.data?.map((achievement) => {
          const isUnlocked = unlockedCodes.has(achievement.code)
          const Icon = ACHIEVEMENT_ICONS[achievement.icon] ?? Trophy
          const date = unlockedAt.get(achievement.code)

          return (
            <HudPanel
              key={achievement.code}
              size="sm"
              tone={isUnlocked ? 'magenta' : 'dim'}
              glow={isUnlocked}
              className={cn(!isUnlocked && 'opacity-70')}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'chamfer-sm grid size-11 shrink-0 place-items-center',
                    isUnlocked ? 'bg-magenta/15 text-magenta' : 'bg-ink-dim/10 text-ink-dim',
                  )}
                >
                  {isUnlocked ? (
                    <Icon className="size-5" aria-hidden />
                  ) : (
                    <Lock className="size-5" aria-hidden />
                  )}
                </div>
                <div className="min-w-0">
                  <p
                    className={cn(
                      'font-display text-sm font-semibold tracking-wide',
                      isUnlocked ? 'text-ink' : 'text-ink-dim',
                    )}
                  >
                    {isUnlocked ? achievement.name : '???'}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-dim">
                    {isUnlocked ? achievement.description : `Dica: ${achievement.description}`}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                    {achievement.xp_reward > 0 && (
                      <span
                        className={cn(
                          'font-mono text-xs',
                          isUnlocked ? 'text-magenta' : 'text-ink-dim',
                        )}
                      >
                        +{achievement.xp_reward} XP
                      </span>
                    )}
                    {isUnlocked && date && (
                      <span className="font-mono text-[10px] tracking-wider text-ink-dim">
                        {new Date(date).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </HudPanel>
          )
        })}
      </div>
    </div>
  )
}
