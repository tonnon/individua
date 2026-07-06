import { createFileRoute } from '@tanstack/react-router'

import { PlaceholderPage } from '@/components/hud/placeholder-page'

export const Route = createFileRoute('/_authenticated/how-it-works')({
  component: HowItWorksPage,
})

function HowItWorksPage() {
  return (
    <PlaceholderPage
      title="Como Usar"
      description="Guia de uso do sistema — a priorizar em uma fase futura."
    />
  )
}
