import { createFileRoute } from '@tanstack/react-router'
import { Swords } from 'lucide-react'
import { toast } from 'sonner'

import { AvatarFrame } from '@/components/hud/avatar-frame'
import { HudPanel } from '@/components/hud/hud-panel'
import { Button } from '@/components/ui/button'
import { useProfile } from '@/features/auth/use-profile'
import { rankForLevel, xpToLevel } from '@/features/gamification/engine/xp-curve'
import {
  useLeaderboard,
  useMyRank,
  useSetLeaderboardOptIn,
} from '@/features/gamification/use-leaderboard'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authenticated/arena')({
  component: ArenaPage,
})

function ArenaPage() {
  const { user } = Route.useRouteContext()
  const { data: profile } = useProfile(user.id)
  const leaderboard = useLeaderboard(50)
  const myRank = useMyRank()
  const setOptIn = useSetLeaderboardOptIn(user.id)

  const optedIn = profile?.leaderboard_opt_in ?? true

  const handleToggleOptIn = () => {
    setOptIn.mutate(!optedIn, {
      onSuccess: () =>
        toast.success(optedIn ? 'Você saiu do ranking público.' : 'Você voltou ao ranking.'),
      onError: () => toast.error('Não foi possível atualizar sua preferência.'),
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-wide text-ink">
          <Swords className="size-5 text-magenta" aria-hidden />
          Arena Global
        </h2>
        <Button
          variant="outline"
          size="sm"
          role="switch"
          aria-checked={optedIn}
          disabled={setOptIn.isPending}
          onClick={handleToggleOptIn}
        >
          {optedIn ? 'Sair do ranking' : 'Entrar no ranking'}
        </Button>
      </div>

      <HudPanel tone="magenta" glow>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-magenta uppercase">
              Sua posição
            </p>
            <p className="mt-1 font-display text-4xl font-bold text-ink">
              {optedIn && myRank.data ? `#${myRank.data}` : '#—'}
            </p>
            {!optedIn && (
              <p className="mt-1 text-xs text-ink-dim">
                Você está fora do ranking — entre para competir.
              </p>
            )}
          </div>
          <p className="max-w-xs text-right text-xs text-ink-dim">
            O ranking compara XP total entre todos os operadores que optaram por participar. Apenas
            nome e avatar são exibidos.
          </p>
        </div>
      </HudPanel>

      <HudPanel>
        <p className="font-mono text-[10px] tracking-[0.2em] text-ink-dim uppercase">
          Classificação de operadores
        </p>

        {leaderboard.isLoading && <p className="mt-3 text-sm text-ink-dim">Carregando ranking…</p>}

        {!leaderboard.isLoading && (leaderboard.data?.length ?? 0) === 0 && (
          <p className="mt-3 text-sm text-ink-dim">
            Ninguém no ranking ainda. Seja o primeiro operador a pontuar.
          </p>
        )}

        <div className="mt-3 space-y-1.5">
          {leaderboard.data?.map((entry) => {
            const level = xpToLevel(entry.xp)
            const isMe = entry.user_id === user.id
            return (
              <div
                key={entry.user_id}
                className={cn(
                  'chamfer-sm flex items-center gap-3 border px-3 py-2',
                  isMe ? 'border-neon/50 bg-neon/5' : 'border-border bg-void/30',
                )}
              >
                <span
                  className={cn(
                    'w-10 shrink-0 font-mono text-sm',
                    entry.rnk <= 3 ? 'text-magenta' : 'text-ink-dim',
                  )}
                >
                  #{entry.rnk}
                </span>
                <AvatarFrame
                  rank={rankForLevel(level)}
                  src={entry.avatar_url}
                  name={entry.username ?? '?'}
                  size="sm"
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                  {entry.username ?? 'Operador anônimo'}
                  {isMe && <span className="ml-2 font-mono text-xs text-neon">// você</span>}
                </span>
                <span className="hidden font-mono text-xs text-ink-dim sm:inline">
                  LVL {String(level).padStart(2, '0')}
                </span>
                <span className="w-24 shrink-0 text-right font-mono text-xs text-neon">
                  {entry.xp.toLocaleString('pt-BR')} XP
                </span>
              </div>
            )
          })}
        </div>
      </HudPanel>
    </div>
  )
}
