import { createFileRoute } from '@tanstack/react-router'

import { PlaceholderPage } from '@/components/hud/placeholder-page'

export const Route = createFileRoute('/_authenticated/failure-zone')({
  component: FailureZonePage,
})

function FailureZonePage() {
  return (
    <PlaceholderPage
      title="Zona de Falha"
      description="Consequências de streaks perdidos — a priorizar em uma fase futura."
    />
  )
}
