import { createFileRoute } from '@tanstack/react-router'

import { PlaceholderPage } from '@/components/hud/placeholder-page'

export const Route = createFileRoute('/_authenticated/whats-new')({
  component: WhatsNewPage,
})

function WhatsNewPage() {
  return (
    <PlaceholderPage
      title="Novidades"
      description="Changelog do Individua — a priorizar em uma fase futura."
    />
  )
}
