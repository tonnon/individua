import type { User } from '@supabase/supabase-js'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { LogOut, Menu } from 'lucide-react'
import { toast } from 'sonner'

import { AvatarFrame } from '@/components/hud/avatar-frame'
import { HudTag } from '@/components/hud/hud-stat'
import { navItems } from '@/components/layout/nav-items'
import { Button } from '@/components/ui/button'
import { signOut } from '@/features/auth/api'
import { useProfile } from '@/features/auth/use-profile'
import { rankForLevel, xpToLevel } from '@/features/gamification/engine/xp-curve'
import { useUiStore } from '@/stores/ui'

export function Topbar({ user }: { user: User }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen)
  const navigate = useNavigate()
  const { data: profile } = useProfile(user.id)
  const current = navItems.find((item) => pathname.startsWith(item.to))
  const level = profile ? xpToLevel(profile.xp) : null

  const handleSignOut = async () => {
    try {
      await signOut()
      await navigate({ to: '/login' })
    } catch {
      toast.error('Não foi possível sair. Tente de novo.')
    }
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-void/80 px-4 backdrop-blur-md md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Abrir menu"
        onClick={() => setSidebarOpen(true)}
      >
        <Menu />
      </Button>

      <h1 className="font-display text-sm font-semibold uppercase tracking-widest text-ink">
        {current?.label ?? 'Individua'}
      </h1>

      <div className="ml-auto flex items-center gap-4">
        <HudTag
          label="LVL"
          value={level ? String(level).padStart(2, '0') : '--'}
          className="hidden sm:inline"
        />
        <HudTag
          label="RANK"
          value={level ? rankForLevel(level) : '-'}
          tone="magenta"
          className="hidden sm:inline"
        />

        <AvatarFrame
          rank={level ? rankForLevel(level) : 'E'}
          src={profile?.avatar_url}
          name={profile?.username ?? user.email ?? '?'}
          size="sm"
        />

        <Button variant="ghost" size="icon" aria-label="Sair" onClick={() => void handleSignOut()}>
          <LogOut />
        </Button>
      </div>
    </header>
  )
}
