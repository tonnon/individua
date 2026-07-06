import { createFileRoute } from '@tanstack/react-router'
import {
  BookOpen,
  Gem,
  HeartHandshake,
  Lightbulb,
  Lock,
  RefreshCcw,
  ShieldCheck,
  Sword,
  type LucideIcon,
} from 'lucide-react'

import { useProfile } from '@/features/auth/use-profile'
import { VIRTUE_MILESTONES } from '@/features/gamification/engine/level-virtues'
import { xpToLevel } from '@/features/gamification/engine/xp-curve'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authenticated/virtues')({
  component: VirtuesPage,
})

const VIRTUE_ICONS: Record<string, LucideIcon> = {
  'shield-check': ShieldCheck,
  sword: Sword,
  'book-open': BookOpen,
  'heart-handshake': HeartHandshake,
  'refresh-ccw': RefreshCcw,
  lightbulb: Lightbulb,
}

function VirtuesPage() {
  const { user } = Route.useRouteContext()
  const { data: profile } = useProfile(user.id)
  const level = profile ? xpToLevel(profile.xp) : 0

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="text-center">
        <h2 className="flex items-center justify-center gap-2 font-display text-2xl font-bold tracking-widest text-violet">
          <Gem className="size-6" aria-hidden />
          Virtudes
        </h2>
        <p className="mt-1 text-sm text-ink-dim">
          Fortaleça seu caráter e desbloqueie novas virtudes ao evoluir.
        </p>
        <p className="mt-2 font-mono text-xs tracking-wider text-neon">
          NÍVEL ATUAL: {String(level).padStart(2, '0')}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {VIRTUE_MILESTONES.map((virtue) => {
          const unlocked = level >= virtue.minLevel
          const Icon = VIRTUE_ICONS[virtue.icon] ?? Gem
          return (
            <div
              key={virtue.code}
              className={cn('chamfer border bg-panel p-5', !unlocked && 'opacity-70')}
              style={{
                borderColor: unlocked ? virtue.hex : `${virtue.hex}40`,
                boxShadow: unlocked ? `0 0 14px ${virtue.hex}40` : undefined,
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <p
                  className="font-display text-lg font-bold tracking-wide"
                  style={{ color: virtue.hex }}
                >
                  {virtue.name}
                </p>
                {unlocked ? (
                  <Icon aria-hidden className="size-5" style={{ color: virtue.hex }} />
                ) : (
                  <Lock aria-hidden className="size-4 text-ink-dim" />
                )}
              </div>
              <p className="mt-1 font-mono text-[10px] tracking-wider text-ink-dim">
                {unlocked ? '// desbloqueada' : `Desbloqueia no nível ${virtue.minLevel}`}
              </p>
              <div className="mt-4 flex min-h-24 flex-col items-center justify-center text-center">
                {unlocked ? (
                  <p className="text-sm leading-relaxed text-ink">{virtue.description}</p>
                ) : (
                  <>
                    <Lock aria-hidden className="size-8 text-ink-dim/60" />
                    <p className="mt-2 text-xs text-ink-dim">
                      Alcance o nível {virtue.minLevel} para desbloquear
                    </p>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
