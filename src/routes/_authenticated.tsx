import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { CelebrationLayer } from '@/components/hud/celebration-layer'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { Topbar } from '@/components/layout/topbar'
import { getSession } from '@/features/auth/api'
import { TrelloSyncRunner } from '@/features/trello/trello-sync-runner'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    const session = await getSession()
    if (!session) {
      throw redirect({ to: '/login' })
    }
    return { user: session.user }
  },
  component: AppLayout,
})

function AppLayout() {
  const { user } = Route.useRouteContext()

  return (
    <div className="min-h-svh">
      <AppSidebar user={user} />
      <div className="flex min-h-svh flex-col md:pl-60">
        <Topbar user={user} />
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
      <CelebrationLayer />
      <TrelloSyncRunner user={user} />
    </div>
  )
}
