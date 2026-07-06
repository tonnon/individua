import { createFileRoute } from '@tanstack/react-router'

import { useProfile } from '@/features/auth/use-profile'
import { LEVEL_MILESTONES } from '@/features/gamification/engine/level-titles'
import { VIRTUE_CODES, VIRTUE_LABELS } from '@/features/gamification/engine/virtues'
import { xpToLevel } from '@/features/gamification/engine/xp-curve'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authenticated/skill-tree')({
  component: SkillTreePage,
})

const ATTRIBUTE_DOTS: Record<string, string> = {
  forca: '#f87462',
  vitalidade: '#4bce97',
  foco: '#579dff',
  carisma: '#e2b203',
  disciplina: '#00f0ff',
  sabedoria: '#9f8fef',
}

function SkillTreePage() {
  const { user } = Route.useRouteContext()
  const { data: profile } = useProfile(user.id)
  const level = profile ? xpToLevel(profile.xp) : 1

  // do início (base) ao topo — renderizamos do topo para a base
  const milestones = [...LEVEL_MILESTONES] // já vem em ordem decrescente

  return (
    <div className="mx-auto max-w-2xl space-y-6 text-center">
      <div>
        <h2 className="glitch-hover font-display text-3xl font-bold tracking-[0.2em] text-neon [text-shadow:0_0_16px_rgba(0,240,255,0.4)]">
          ÁRVORE DE EVOLUÇÃO
        </h2>
        <p className="mt-2 text-sm italic text-ink-dim">
          “Quanto mais fortes seus atributos, melhor será o seu caminho.”
        </p>
        <p className="mt-4 inline-block border border-neon/40 px-5 py-2 font-mono text-sm tracking-[0.25em] text-neon chamfer-sm">
          NÍVEL ATUAL <span className="ml-2 font-bold">{String(level).padStart(2, '0')}</span>
        </p>
      </div>

      {/* chips dos 6 atributos, como no HUD de referência */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {VIRTUE_CODES.map((code) => (
          <span
            key={code}
            className="chamfer-sm flex items-center gap-1.5 border border-border bg-panel px-2.5 py-1 font-mono text-[10px] tracking-wider text-ink"
          >
            <span
              aria-hidden
              className="size-1.5 rounded-full"
              style={{ backgroundColor: ATTRIBUTE_DOTS[code] }}
            />
            {VIRTUE_LABELS[code]}
            <span className="text-ink-dim">{profile?.[code] ?? 0}</span>
          </span>
        ))}
      </div>

      {/* o caminho: topo (futuro) → base (início) */}
      <ol className="flex flex-col items-center">
        {milestones.map((milestone, index) => {
          const reached = level >= milestone.minLevel
          const isCurrent =
            reached && (index === 0 || level < (milestones[index - 1]?.minLevel ?? Infinity))
          return (
            <li key={milestone.minLevel} className="flex flex-col items-center">
              <div
                className={cn(
                  'grid size-16 place-items-center border font-mono text-lg font-bold transition-all',
                  isCurrent &&
                    'border-2 border-dashed border-neon bg-neon/10 text-neon shadow-glow-neon',
                  reached && !isCurrent && 'border-neon/50 bg-panel text-neon',
                  !reached && 'border-border bg-panel/60 text-ink-dim opacity-60',
                )}
              >
                {milestone.minLevel}
              </div>
              <p
                className={cn(
                  'mt-2 font-display text-[11px] font-semibold tracking-[0.2em] uppercase',
                  isCurrent ? 'text-neon' : reached ? 'text-ink' : 'text-ink-dim',
                )}
              >
                {milestone.title}
              </p>
              {isCurrent && (
                <p className="font-mono text-[9px] tracking-[0.3em] text-magenta">
                  // você está aqui
                </p>
              )}
              {index < milestones.length - 1 && (
                <div
                  aria-hidden
                  className={cn('my-2 h-8 w-px', reached ? 'bg-neon/40' : 'bg-border')}
                />
              )}
            </li>
          )
        })}
      </ol>

      <p className="font-mono text-[10px] tracking-[0.3em] text-ink-dim uppercase">o início</p>
    </div>
  )
}
