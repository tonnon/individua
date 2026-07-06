import { createFileRoute } from '@tanstack/react-router'

import { PlaceholderPage } from '@/components/hud/placeholder-page'

export const Route = createFileRoute('/_authenticated/minigame')({
  component: MinigamePage,
})

function MinigamePage() {
  return (
    <PlaceholderPage
      title="Minigame"
      description="Um minigame para variar o ritmo — a priorizar em uma fase futura."
    />
  )
}
