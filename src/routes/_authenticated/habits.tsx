import { createFileRoute } from '@tanstack/react-router'

import { PlaceholderPage } from '@/components/hud/placeholder-page'

export const Route = createFileRoute('/_authenticated/habits')({
  component: HabitsPage,
})

function HabitsPage() {
  return (
    <PlaceholderPage
      title="Libertar Vícios"
      description="Acompanhamento de hábitos a abandonar — a priorizar em uma fase futura."
    />
  )
}
