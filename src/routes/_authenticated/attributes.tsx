import { createFileRoute } from '@tanstack/react-router'

import { HudPanel } from '@/components/hud/hud-panel'
import { useProfile } from '@/features/auth/use-profile'
import { VIRTUE_CODES, VIRTUE_LABELS } from '@/features/gamification/engine/virtues'
import { levelProgress, rankForLevel } from '@/features/gamification/engine/xp-curve'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authenticated/attributes')({
  component: AttributesPage,
})

const PROGRESS_SEGMENTS = 20

function AttributesPage() {
  const { user } = Route.useRouteContext()
  const { data: profile } = useProfile(user.id)

  if (!profile) {
    return <p className="text-sm text-ink-dim">Carregando…</p>
  }

  const progress = levelProgress(profile.xp)
  const rank = rankForLevel(progress.level)
  const virtueValues = VIRTUE_CODES.map((code) => ({
    code,
    label: VIRTUE_LABELS[code],
    value: profile[code],
  }))
  const topVirtue = virtueValues.reduce((top, v) => (v.value > top.value ? v : top))
  const filledSegments = Math.round(progress.progress * PROGRESS_SEGMENTS)

  return (
    <div className="space-y-4">
      <HudPanel tone="violet" glow>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-widest text-ink-dim uppercase">
              Nível {progress.level}
            </p>
            <p className="font-display text-2xl font-bold text-ink">Rank {rank}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-xs tracking-widest text-ink-dim uppercase">
              Para o próximo nível
            </p>
            <p className="font-mono text-lg text-neon">
              {progress.xpIntoLevel}/{progress.xpToNextLevel} XP
            </p>
          </div>
        </div>
        <div
          className="mt-3 flex gap-1"
          role="progressbar"
          aria-valuenow={Math.round(progress.progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progresso para o próximo nível"
        >
          {Array.from({ length: PROGRESS_SEGMENTS }).map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-2 flex-1',
                i < filledSegments ? 'bg-neon shadow-glow-neon' : 'bg-ink-dim/15',
              )}
            />
          ))}
        </div>
      </HudPanel>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {virtueValues.map(({ code, label, value }) => (
          <HudPanel key={code} tone={code === topVirtue.code ? 'magenta' : 'dim'}>
            <p className="font-mono text-xs tracking-widest text-ink-dim uppercase">{label}</p>
            <p className="mt-1 font-display text-3xl font-bold text-ink">{value}</p>
          </HudPanel>
        ))}
      </div>
    </div>
  )
}
