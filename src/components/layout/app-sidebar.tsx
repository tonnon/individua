import type { User } from '@supabase/supabase-js'
import { Link } from '@tanstack/react-router'

import { AvatarFrame } from '@/components/hud/avatar-frame'
import { HudXpBar } from '@/components/hud/hud-xp-bar'
import { navSections } from '@/components/layout/nav-items'
import { useProfile } from '@/features/auth/use-profile'
import { architectMessage } from '@/features/gamification/engine/architect'
import { levelTitle } from '@/features/gamification/engine/level-titles'
import { levelProgress, rankForLevel } from '@/features/gamification/engine/xp-curve'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/stores/ui'

export function AppSidebar({ user }: { user: User }) {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen)
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen)
  const { data: profile } = useProfile(user.id)

  const progress = profile ? levelProgress(profile.xp) : null
  const rank = progress ? rankForLevel(progress.level) : 'E'

  return (
    <>
      {/* backdrop mobile */}
      {sidebarOpen && (
        <div
          aria-hidden
          className="fixed inset-0 z-30 bg-void/70 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-border bg-panel transition-transform duration-200 md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* logo */}
        <div className="flex h-14 items-center border-b border-border px-5">
          <Link
            to="/dashboard"
            className="glitch-hover font-display text-lg font-bold tracking-widest text-ink"
          >
            INDIVIDUA
          </Link>
        </div>

        {/* perfil: avatar com moldura evolutiva + nível/título + rank + XP */}
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-3">
            <AvatarFrame
              rank={rank}
              src={profile?.avatar_url}
              name={profile?.username ?? '?'}
              size="md"
            />
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-semibold tracking-wide text-neon">
                {profile?.username ?? '…'}
              </p>
              <p className="mt-0.5 truncate text-xs text-ink-dim">
                {progress ? `Nível ${progress.level} — ${levelTitle(progress.level)}` : '…'}
              </p>
              <p className="font-mono text-[10px] tracking-[0.2em] text-magenta">RANK {rank}</p>
            </div>
          </div>
          <HudXpBar
            progress={progress?.progress ?? 0}
            segments={16}
            className="mt-3"
            aria-label="Progresso para o próximo nível"
          />
          <p className="mt-1.5 text-right font-mono text-[10px] tracking-wider text-ink-dim">
            {progress ? `${progress.xpIntoLevel}/${progress.xpToNextLevel} XP` : '—'}
          </p>
        </div>

        {/* navegação */}
        <nav className="flex-1 space-y-4 overflow-y-auto p-3" aria-label="Navegação principal">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="px-3 pb-1 font-mono text-[10px] tracking-[0.2em] text-ink-dim uppercase">
                {section.label}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className="group flex items-center gap-3 border-l-2 border-transparent px-3 py-2.5 font-display text-sm font-medium tracking-wide text-ink-dim transition-colors hover:bg-accent hover:text-ink"
                    activeProps={{
                      className: 'border-l-neon bg-accent text-neon',
                      'aria-current': 'page',
                    }}
                  >
                    <item.icon className="size-4 shrink-0" aria-hidden />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* mensagem do arquiteto */}
        <div className="border-t border-border p-4">
          <p className="font-mono text-[10px] tracking-[0.2em] text-neon uppercase">
            Mensagem do Arquiteto
          </p>
          <ArchitectQuote />
        </div>
      </aside>
    </>
  )
}

function ArchitectQuote() {
  // determinística por dia — sem estado, sem rede
  return (
    <p className="mt-1.5 text-xs italic leading-relaxed text-ink-dim">
      “{architectMessage(new Date())}”
    </p>
  )
}
