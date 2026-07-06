import { createFileRoute } from '@tanstack/react-router'

import { PlaceholderPage } from '@/components/hud/placeholder-page'

export const Route = createFileRoute('/_authenticated/avatars')({
  component: AvatarsPage,
})

function AvatarsPage() {
  return (
    <PlaceholderPage
      title="Avatares"
      description="Personalização visual do seu personagem — a priorizar em uma fase futura."
    />
  )
}
