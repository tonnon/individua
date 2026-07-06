import { Link, createFileRoute } from '@tanstack/react-router'
import {
  BookOpen,
  Crosshair,
  Dumbbell,
  Eye,
  Heart,
  ShieldCheck,
  Star,
  Swords,
  type LucideIcon,
} from 'lucide-react'

import { AvatarFrame } from '@/components/hud/avatar-frame'
import { HudPanel } from '@/components/hud/hud-panel'
import { HudStat } from '@/components/hud/hud-stat'
import { HudXpBar } from '@/components/hud/hud-xp-bar'
import { Button } from '@/components/ui/button'
import { useProfile } from '@/features/auth/use-profile'
import { architectMessage, buildInsights } from '@/features/gamification/engine/architect'
import { levelTitle } from '@/features/gamification/engine/level-titles'
import {
  VIRTUE_CODES,
  VIRTUE_LABELS,
  type VirtueCode,
} from '@/features/gamification/engine/virtues'
import { levelProgress, rankForLevel } from '@/features/gamification/engine/xp-curve'
import { todayStats, useActivities } from '@/features/gamification/use-activities'
import { useCompletionFlow } from '@/features/gamification/use-completion-flow'
import { useMyRank } from '@/features/gamification/use-leaderboard'
import { useMissions } from '@/features/gamification/use-missions'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
})

const ATTRIBUTE_ICONS: Record<VirtueCode, LucideIcon> = {
  forca: Dumbbell,
  vitalidade: Heart,
  foco: Crosshair,
  carisma: Star,
  disciplina: ShieldCheck,
  sabedoria: BookOpen,
}

const ATTRIBUTE_TONES: Record<VirtueCode, string> = {
  forca: 'text-danger',
  vitalidade: 'text-violet',
  foco: 'text-neon',
  carisma: 'text-magenta',
  disciplina: 'text-neon',
  sabedoria: 'text-violet',
}

function DashboardPage() {
  const { user } = Route.useRouteContext()
  const { data: profile } = useProfile(user.id)
  const { data: activities } = useActivities(user.id)
  const { data: missions } = useMissions(user.id)
  const myRank = useMyRank()
  const completionFlow = useCompletionFlow(user.id)

  if (!profile) {
    return <p className="text-sm text-ink-dim">Carregando…</p>
  }

  const progress = levelProgress(profile.xp)
  const rank = rankForLevel(progress.level)
  const title = levelTitle(progress.level)
  const stats = todayStats(activities ?? [])

  const topAttribute = [...VIRTUE_CODES].sort((a, b) => profile[b] - profile[a])[0] ?? 'foco'
  const maxAttribute = Math.max(10, ...VIRTUE_CODES.map((code) => profile[code]))

  const insights = buildInsights({
    activities: activities ?? [],
    profile,
    today: new Date(),
  })

  const pendingToday = (missions ?? []).slice(0, 5)

  return (
    <div className="space-y-4">
      {/* ————— hero: identidade do operador ————— */}
      <HudPanel tone="violet" glow className="py-8">
        <div className="flex flex-col items-center text-center">
          <AvatarFrame
            rank={rank}
            src={profile.avatar_url}
            name={profile.username ?? '?'}
            size="lg"
          />
          <h2 className="glitch-hover mt-4 font-display text-3xl font-bold tracking-widest text-neon [text-shadow:0_0_18px_rgba(0,240,255,0.4)]">
            {profile.username ?? 'Operador'}
          </h2>
          <p className="mt-3 border border-neon/30 bg-void/40 px-4 py-1.5 font-mono text-xs tracking-[0.25em] text-neon chamfer-sm">
            • NÍVEL {progress.level} — {title.toUpperCase()} •
          </p>
          <p className="mt-2 font-mono text-xs tracking-[0.3em] text-magenta">RANK {rank}</p>
        </div>
      </HudPanel>

      {/* ————— hoje ————— */}
      <div className="grid gap-3 sm:grid-cols-3">
        <HudPanel size="sm">
          <p className="font-mono text-[10px] tracking-[0.2em] text-ink-dim uppercase">
            Virtude top
          </p>
          <p className={cn('mt-1 font-display text-xl font-bold', ATTRIBUTE_TONES[topAttribute])}>
            {VIRTUE_LABELS[topAttribute]}
          </p>
        </HudPanel>
        <HudPanel size="sm">
          <p className="font-mono text-[10px] tracking-[0.2em] text-ink-dim uppercase">
            Completas hoje
          </p>
          <p className="mt-1 font-display text-xl font-bold text-ink">{stats.completedToday}</p>
        </HudPanel>
        <HudPanel size="sm">
          <p className="font-mono text-[10px] tracking-[0.2em] text-ink-dim uppercase">
            XP de hoje
          </p>
          <p className="mt-1 font-display text-xl font-bold text-neon">{stats.xpToday}</p>
        </HudPanel>
      </div>

      {/* ————— nível, arena e economia ————— */}
      <div className="grid gap-3 lg:grid-cols-3">
        <HudPanel tone="magenta">
          <p className="font-mono text-[10px] tracking-[0.2em] text-magenta uppercase">
            Arena Global
          </p>
          <p className="mt-2 font-display text-3xl font-bold text-ink">
            {myRank.data ? `#${myRank.data}` : '#—'}
          </p>
          <p className="text-xs text-ink-dim">Sua posição</p>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link to="/arena">Ver classificação</Link>
          </Button>
        </HudPanel>

        <HudPanel tone="neon">
          <div className="flex items-baseline justify-between">
            <p className="font-mono text-xs tracking-wider text-neon">
              NÍVEL {progress.level} — {title}
            </p>
            <p className="font-mono text-xs text-ink-dim">
              {progress.xpIntoLevel} / {progress.xpToNextLevel} XP
            </p>
          </div>
          <HudXpBar progress={progress.progress} className="mt-3" />
          <p className="mt-3">
            <HudStat label="XP TOTAL" value={String(profile.xp)} />
          </p>
        </HudPanel>

        <HudPanel>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] tracking-[0.2em] text-ink-dim uppercase">Coins</p>
              <p className="mt-1 font-display text-3xl font-bold text-ink">{profile.coins}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[10px] tracking-[0.2em] text-ink-dim uppercase">Rank</p>
              <p className="mt-1 font-display text-3xl font-bold text-magenta">{rank}</p>
            </div>
          </div>
          <Button asChild variant="ghost" size="sm" className="mt-3">
            <Link to="/store">Loja do Tempo →</Link>
          </Button>
        </HudPanel>
      </div>

      {/* ————— seu status: os 6 atributos ————— */}
      <HudPanel tone="neon">
        <h3 className="text-center font-display text-lg font-semibold tracking-widest text-neon">
          Seu Status
        </h3>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {VIRTUE_CODES.map((code) => {
            const Icon = ATTRIBUTE_ICONS[code]
            const value = profile[code]
            return (
              <div key={code} className="chamfer-sm border border-border bg-void/40 p-3">
                <div className="flex items-center justify-between">
                  <Icon className={cn('size-5', ATTRIBUTE_TONES[code])} aria-hidden />
                  <span className={cn('font-display text-xl font-bold', ATTRIBUTE_TONES[code])}>
                    {value}
                  </span>
                </div>
                <p
                  className={cn(
                    'mt-2 font-mono text-[10px] tracking-[0.15em] uppercase',
                    ATTRIBUTE_TONES[code],
                  )}
                >
                  {VIRTUE_LABELS[code]}
                </p>
                <div className="mt-1.5 h-1 bg-ink-dim/15">
                  <div
                    className={cn('h-full', value > 0 ? 'bg-current' : '')}
                    style={{ width: `${(value / maxAttribute) * 100}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </HudPanel>

      {/* ————— o arquiteto ————— */}
      <HudPanel tone="violet">
        <div className="text-center">
          <p className="flex items-center justify-center gap-2 font-display text-sm font-semibold tracking-[0.25em] text-violet uppercase">
            <Eye className="size-4" aria-hidden /> O Arquiteto
          </p>
          <p className="mt-1 font-mono text-[10px] tracking-[0.3em] text-ink-dim uppercase">
            observa a sua forma
          </p>
          <p className="mt-3 text-sm italic text-ink">“{architectMessage(new Date())}”</p>
        </div>
        <div className="mt-4 space-y-2">
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

      {/* ————— missões ativas de hoje ————— */}
      <HudPanel>
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold tracking-wide text-danger">
            <Swords className="size-4" aria-hidden /> Missões Ativas de Hoje
          </h3>
          <Button asChild variant="ghost" size="sm">
            <Link to="/missions">Ver todas →</Link>
          </Button>
        </div>
        {pendingToday.length === 0 ? (
          <div className="mt-4 py-6 text-center">
            <p className="text-sm text-ink-dim">Nenhuma missão para hoje.</p>
            <p className="mt-1 text-xs text-ink-dim italic">
              Crie novas missões para continuar evoluindo.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {pendingToday.map((mission) => (
              <div
                key={mission.id}
                className="chamfer-sm flex items-center justify-between gap-4 border border-border bg-void/40 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-semibold text-ink">
                    {mission.title}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-ink-dim">
                    +{mission.xp_base} XP
                    {mission.coin_base > 0 && ` // +${mission.coin_base} coins`}
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={completionFlow.isPending}
                  onClick={() => completionFlow.complete(mission)}
                >
                  Concluir
                </Button>
              </div>
            ))}
          </div>
        )}
      </HudPanel>
    </div>
  )
}
