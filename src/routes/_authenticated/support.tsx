import { createFileRoute } from '@tanstack/react-router'

import { PlaceholderPage } from '@/components/hud/placeholder-page'

export const Route = createFileRoute('/_authenticated/support')({
  component: SupportPage,
})

function SupportPage() {
  return (
    <PlaceholderPage
      title="Suporte e Instalação"
      description="Central de ajuda e instalação — a priorizar em uma fase futura."
    />
  )
}
