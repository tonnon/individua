import { createFileRoute } from '@tanstack/react-router'

import { PlaceholderPage } from '@/components/hud/placeholder-page'

export const Route = createFileRoute('/_authenticated/finance')({
  component: FinancePage,
})

function FinancePage() {
  return (
    <PlaceholderPage
      title="Finanças"
      description="Um módulo financeiro pessoal — a priorizar em uma fase futura."
    />
  )
}
