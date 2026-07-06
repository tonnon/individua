import { createFileRoute } from '@tanstack/react-router'
import { Eye } from 'lucide-react'

import { HudPanel } from '@/components/hud/hud-panel'
import { HudStat } from '@/components/hud/hud-stat'
import { useProfile } from '@/features/auth/use-profile'
import { architectMessage, buildInsights } from '@/features/gamification/engine/architect'
import { useActivities } from '@/features/gamification/use-activities'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authenticated/architect')({
  component: ArchitectPage,
})

function ArchitectPage() {
  const { user } = Route.useRouteContext()
  const { data: profile } = useProfile(user.id)
  const { data: activities } = useActivities(user.id)

  const insights = profile
    ? buildInsights({ activities: activities ?? [], profile, today: new Date() })
    : []

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <HudPanel tone="violet" glow className="py-8 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full border border-violet/40 bg-violet/10 shadow-glow-violet">
          <Eye className="size-7 text-violet" aria-hidden />
        </div>
        <h2 className="mt-4 font-display text-xl font-bold tracking-[0.25em] text-violet uppercase">
          O Arquiteto
        </h2>
        <p className="mt-1 font-mono text-[10px] tracking-[0.3em] text-ink-dim uppercase">
          arquitetura da evolução // observa a sua forma
        </p>
        <p className="mx-auto mt-5 max-w-md text-balance text-lg italic text-ink">
          “{architectMessage(new Date())}”
        </p>
      </HudPanel>

      <HudPanel>
        <h3 className="font-display text-sm font-semibold tracking-widest text-ink uppercase">
          Insights do Arquiteto
        </h3>
        <p className="mt-1 text-xs text-ink-dim">
          Derivados dos seus dados reais, recalculados a cada visita — determinísticos e sem custo.
          O chat de verdade com o Arquiteto (Evolução Chat IA) chega na Fase 9.
        </p>
        <div className="mt-4 space-y-2">
          {insights.length === 0 && <p className="text-sm text-ink-dim">Carregando…</p>}
          {insights.map((insight) => (
            <div
              key={insight.text}
              className={cn(
                'chamfer-sm flex items-start gap-3 border px-4 py-3 text-sm',
                insight.tone === 'positive' && 'border-neon/30 text-ink',
                insight.tone === 'warning' && 'border-danger/40 text-ink',
                insight.tone === 'neutral' && 'border-border text-ink-dim',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'mt-1 size-2 shrink-0 rounded-full',
                  insight.tone === 'positive' && 'bg-neon shadow-glow-neon',
                  insight.tone === 'warning' && 'bg-danger',
                  insight.tone === 'neutral' && 'bg-ink-dim',
                )}
              />
              {insight.text}
            </div>
          ))}
        </div>
      </HudPanel>

      {profile && (
        <HudPanel size="sm">
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            <HudStat label="STREAK" value={`${profile.streak_count} dias`} tone="magenta" />
            <HudStat label="RECORDE" value={`${profile.longest_streak} dias`} tone="violet" />
            <HudStat label="XP TOTAL" value={String(profile.xp)} />
          </div>
        </HudPanel>
      )}
    </div>
  )
}
