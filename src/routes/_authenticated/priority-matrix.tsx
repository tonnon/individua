import { createFileRoute } from '@tanstack/react-router'

import { PlaceholderPage } from '@/components/hud/placeholder-page'

export const Route = createFileRoute('/_authenticated/priority-matrix')({
  component: PriorityMatrixPage,
})

function PriorityMatrixPage() {
  return (
    <PlaceholderPage
      title="Matriz de Prioridades"
      description="Organização de missões por urgência e importância — a priorizar em uma fase futura."
    />
  )
}
