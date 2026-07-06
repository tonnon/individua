import { createFileRoute } from '@tanstack/react-router'

import { PlaceholderPage } from '@/components/hud/placeholder-page'

export const Route = createFileRoute('/_authenticated/reminders')({
  component: RemindersPage,
})

function RemindersPage() {
  return (
    <PlaceholderPage
      title="Lembretes"
      description="Notificações de missões e prazos — a priorizar em uma fase futura."
    />
  )
}
