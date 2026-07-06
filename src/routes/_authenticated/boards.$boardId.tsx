import { createFileRoute } from '@tanstack/react-router'

import { TrelloBoardView } from '@/features/boards/trello-board-view'

export const Route = createFileRoute('/_authenticated/boards/$boardId')({
  component: BoardViewPage,
})

function BoardViewPage() {
  const { user } = Route.useRouteContext()
  const { boardId } = Route.useParams()
  return <TrelloBoardView userId={user.id} boardId={boardId} />
}
