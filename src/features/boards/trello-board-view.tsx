import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine'
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import {
  attachClosestEdge,
  extractClosestEdge,
  type Edge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge'
import { CalendarClock, Circle, CircleCheck, Plus, Settings2, SquareCheck } from 'lucide-react'
import { toast } from 'sonner'

import { HudStat } from '@/components/hud/hud-stat'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useProfile } from '@/features/auth/use-profile'
import { computeCompletion } from '@/features/gamification/engine/completion'
import {
  TRELLO_CARD_BASE_XP,
  TRELLO_CHECK_ITEM_BASE_XP,
  countHighPriorityLabels,
} from '@/features/gamification/engine/trello'
import {
  positionForIndex,
  useBoardCards,
  useBoardLabels,
  useBoardLists,
  useBoardMeta,
  useCreateCard,
  useMoveCard,
  useUpdateCard,
} from '@/features/boards/use-board-view'
import { CardChecklists, CardComments } from '@/features/boards/card-details-sections'
import { useBoardConfigs } from '@/features/trello/use-trello'
import type { TrelloBoardCard, TrelloLabel, TrelloList } from '@/features/trello/api'
import { cn } from '@/lib/utils'

/** cores de label do Trello → hex (aprox. da paleta oficial) */
const LABEL_COLORS: Record<string, string> = {
  green: '#4bce97',
  yellow: '#e2b203',
  orange: '#faa53d',
  red: '#f87462',
  purple: '#9f8fef',
  blue: '#579dff',
  sky: '#6cc3e0',
  lime: '#94c748',
  pink: '#e774bb',
  black: '#8590a2',
}

function labelColor(color: string | null): string {
  if (!color) return '#79809f'
  const base = color.replace(/_(light|dark)$/, '')
  return LABEL_COLORS[base] ?? '#79809f'
}

interface DragData {
  type: 'card'
  cardId: string
  listId: string
  [key: string]: unknown
}

export function TrelloBoardView({ userId, boardId }: { userId: string; boardId: string }) {
  const queryClient = useQueryClient()

  const { data: profile } = useProfile(userId)
  const token = profile?.trello_token ?? null
  const { data: configs } = useBoardConfigs(userId)
  const config = (configs ?? []).find((c) => c.trello_board_id === boardId)

  const boardMeta = useBoardMeta(boardId, token)
  const lists = useBoardLists(boardId, token)
  const cards = useBoardCards(boardId, token)
  const labels = useBoardLabels(boardId, token)
  const moveCard = useMoveCard(boardId, token)

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)

  const cardsByList = useMemo(() => {
    const map = new Map<string, TrelloBoardCard[]>()
    for (const card of cards.data ?? []) {
      const bucket = map.get(card.idList) ?? []
      bucket.push(card)
      map.set(card.idList, bucket)
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) => a.pos - b.pos)
    }
    return map
  }, [cards.data])

  const doneListId = config?.done_list_id ?? null

  /** dispara o sync (com folga p/ a action registrar no Trello) */
  const triggerSyncSoon = () => {
    window.setTimeout(() => {
      void queryClient.refetchQueries({ queryKey: ['trello-sync'] })
    }, 1500)
  }

  const moveTo = (cardId: string, toListId: string, pos: number) => {
    moveCard.mutate(
      { cardId, toListId, pos },
      {
        onError: () => toast.error('O Trello recusou o movimento — desfizemos aqui.'),
        onSuccess: () => {
          if (toListId === doneListId) triggerSyncSoon()
        },
      },
    )
  }

  // um monitor por board: resolve o drop (em card ou em lista) e move
  useEffect(() => {
    return monitorForElements({
      canMonitor: ({ source }) => source.data.type === 'card',
      onDrop: ({ source, location }) => {
        const target = location.current.dropTargets[0]
        if (!target) return
        const drag = source.data as DragData

        let toListId: string
        let index: number

        if (target.data.type === 'card-slot') {
          toListId = target.data.listId as string
          const targetCardId = target.data.cardId as string
          if (targetCardId === drag.cardId) return
          const bucket = (cardsByList.get(toListId) ?? []).filter((c) => c.id !== drag.cardId)
          const targetIndex = bucket.findIndex((c) => c.id === targetCardId)
          if (targetIndex === -1) return
          const edge: Edge | null = extractClosestEdge(target.data)
          index = edge === 'bottom' ? targetIndex + 1 : targetIndex
          moveTo(drag.cardId, toListId, positionForIndex(bucket, index))
          return
        }

        if (target.data.type === 'list-drop') {
          toListId = target.data.listId as string
          const bucket = (cardsByList.get(toListId) ?? []).filter((c) => c.id !== drag.cardId)
          moveTo(drag.cardId, toListId, positionForIndex(bucket, bucket.length))
        }
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardsByList, doneListId])

  if (!token) {
    return (
      <div className="chamfer border border-border bg-panel p-6">
        <p className="text-sm text-ink-dim">
          Conecte seu Trello em{' '}
          <Link to="/boards" className="text-neon underline-offset-4 hover:underline">
            Boards
          </Link>{' '}
          para abrir o board view.
        </p>
      </div>
    )
  }

  const selectedCard = (cards.data ?? []).find((c) => c.id === selectedCardId) ?? null

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-wide text-ink">
            {boardMeta.data?.name ?? 'Board'}
          </h2>
          <p className="mt-0.5 font-mono text-[10px] tracking-wider text-ink-dim">
            {config?.active && doneListId ? (
              <span className="text-neon">
                // gamificado ×{config.xp_multiplier} — arraste para a lista de conclusão para
                pontuar
              </span>
            ) : (
              '// board não gamificado — configure em Boards para pontuar'
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <HudStat label="CARDS" value={String(cards.data?.length ?? 0)} tone="ink" />
          <Button asChild variant="ghost" size="icon" aria-label="Configurar board">
            <Link to="/boards">
              <Settings2 />
            </Link>
          </Button>
        </div>
      </div>

      {lists.isLoading && <p className="text-sm text-ink-dim">Carregando board…</p>}

      <div className="flex flex-1 items-start gap-3 overflow-x-auto pb-4">
        {lists.data?.map((list) => (
          <ListColumn
            key={list.id}
            list={list}
            cards={cardsByList.get(list.id) ?? []}
            isDoneList={list.id === doneListId}
            multiplier={config?.xp_multiplier ?? 1}
            boardId={boardId}
            token={token}
            onCardClick={setSelectedCardId}
            onQuickComplete={
              doneListId && list.id !== doneListId
                ? (card) => {
                    const bucket = (cardsByList.get(doneListId) ?? []).filter(
                      (c) => c.id !== card.id,
                    )
                    moveTo(card.id, doneListId, positionForIndex(bucket, bucket.length))
                  }
                : null
            }
          />
        ))}
      </div>

      {selectedCard && (
        <CardModal
          card={selectedCard}
          lists={lists.data ?? []}
          boardLabels={labels.data ?? []}
          boardId={boardId}
          token={token}
          multiplier={config?.xp_multiplier ?? 1}
          doneListId={doneListId}
          onMoveToDone={(pos) => {
            if (doneListId) moveTo(selectedCard.id, doneListId, pos)
          }}
          onArchived={triggerSyncSoon}
          cardsByList={cardsByList}
          onClose={() => setSelectedCardId(null)}
        />
      )}
    </div>
  )
}

// ————— coluna (lista) —————

function ListColumn({
  list,
  cards,
  isDoneList,
  multiplier,
  boardId,
  token,
  onCardClick,
  onQuickComplete,
}: {
  list: TrelloList
  cards: TrelloBoardCard[]
  isDoneList: boolean
  multiplier: number
  boardId: string
  token: string
  onCardClick: (cardId: string) => void
  onQuickComplete: ((card: TrelloBoardCard) => void) | null
}) {
  const columnRef = useRef<HTMLDivElement>(null)
  const [isOver, setIsOver] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const createCard = useCreateCard(boardId, token)

  useEffect(() => {
    const element = columnRef.current
    if (!element) return
    return dropTargetForElements({
      element,
      getData: () => ({ type: 'list-drop', listId: list.id }),
      canDrop: ({ source }) => source.data.type === 'card',
      onDragEnter: () => setIsOver(true),
      onDragLeave: () => setIsOver(false),
      onDrop: () => setIsOver(false),
    })
  }, [list.id])

  const handleCreate = () => {
    const title = newTitle.trim()
    if (!title) return
    createCard.mutate(
      { listId: list.id, name: title },
      {
        onSuccess: () => setNewTitle(''),
        onError: () => toast.error('Não foi possível criar o card.'),
      },
    )
  }

  return (
    <div
      ref={columnRef}
      className={cn(
        'chamfer-sm flex w-72 shrink-0 flex-col border bg-panel/80 transition-colors',
        isDoneList ? 'border-neon/40' : 'border-border',
        isOver && 'border-neon bg-neon/5',
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <p
          className={cn(
            'truncate font-display text-xs font-semibold uppercase tracking-widest',
            isDoneList ? 'text-neon' : 'text-ink',
          )}
        >
          {list.name}
        </p>
        <span className="font-mono text-[10px] text-ink-dim">
          {isDoneList && <span className="mr-2 text-neon">// concluído</span>}
          {cards.length}
        </span>
      </div>

      <div className="flex max-h-[calc(100vh-20rem)] flex-col gap-2 overflow-y-auto p-2">
        {cards.map((card) => (
          <BoardCardItem
            key={card.id}
            card={card}
            multiplier={multiplier}
            isDoneList={isDoneList}
            onClick={() => onCardClick(card.id)}
            onQuickComplete={onQuickComplete ? () => onQuickComplete(card) : null}
          />
        ))}
        {cards.length === 0 && (
          <p className="px-2 py-6 text-center font-mono text-[10px] text-ink-dim">
            // solte um card aqui
          </p>
        )}
      </div>

      <div className="border-t border-border p-2">
        {adding ? (
          <div className="space-y-2">
            <Input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate()
                if (e.key === 'Escape') setAdding(false)
              }}
              placeholder="Título do card"
              aria-label={`Novo card em ${list.name}`}
            />
            <div className="flex gap-2">
              <Button size="sm" disabled={createCard.isPending} onClick={handleCreate}>
                Criar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" size="sm" className="w-full" onClick={() => setAdding(true)}>
            <Plus /> Novo card
          </Button>
        )}
      </div>
    </div>
  )
}

// ————— card —————

function BoardCardItem({
  card,
  multiplier,
  isDoneList,
  onClick,
  onQuickComplete,
}: {
  card: TrelloBoardCard
  multiplier: number
  isDoneList: boolean
  onClick: () => void
  onQuickComplete: (() => void) | null
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null)

  const xp = computeCompletion({
    xpBase: TRELLO_CARD_BASE_XP,
    coinBase: 0,
    virtueWeights: {},
    dueAt: card.due,
    completedAt: new Date(),
    highPriorityLabelCount: countHighPriorityLabels(card.labels),
    multiplier,
  }).xp

  useEffect(() => {
    const element = ref.current
    if (!element) return
    return combine(
      draggable({
        element,
        getInitialData: (): DragData => ({ type: 'card', cardId: card.id, listId: card.idList }),
        onDragStart: () => setDragging(true),
        onDrop: () => setDragging(false),
      }),
      dropTargetForElements({
        element,
        canDrop: ({ source }) => source.data.type === 'card',
        getData: ({ input }) =>
          attachClosestEdge(
            { type: 'card-slot', cardId: card.id, listId: card.idList },
            { element, input, allowedEdges: ['top', 'bottom'] },
          ),
        onDrag: ({ self }) => setClosestEdge(extractClosestEdge(self.data)),
        onDragLeave: () => setClosestEdge(null),
        onDrop: () => setClosestEdge(null),
      }),
    )
  }, [card.id, card.idList])

  return (
    // div com role=button (e não <button>): o círculo de concluir é um
    // botão de verdade aninhado, e botão dentro de botão é inválido
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      aria-label={`Abrir card ${card.name}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        'chamfer-sm relative cursor-grab border-l-2 border-neon/35 bg-panel-2 p-3 text-left transition-all',
        'hover:-translate-y-0.5 hover:shadow-glow-neon',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        dragging && 'opacity-40',
        closestEdge === 'top' && 'shadow-[0_-2px_0_0_#00f0ff]',
        closestEdge === 'bottom' && 'shadow-[0_2px_0_0_#00f0ff]',
      )}
    >
      {card.labels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {card.labels.map((label) => (
            <span
              key={label.id}
              title={label.name || undefined}
              className="h-1.5 w-8 rounded-full"
              style={{ backgroundColor: labelColor(label.color) }}
            />
          ))}
        </div>
      )}
      <div className="flex items-start gap-2">
        {onQuickComplete && (
          <button
            type="button"
            aria-label={`Concluir ${card.name} (+${xp} XP)`}
            title={`Concluir (+${xp} XP)`}
            onClick={(e) => {
              e.stopPropagation()
              onQuickComplete()
            }}
            className="mt-0.5 shrink-0 text-ink-dim transition-colors hover:text-neon hover:drop-shadow-[0_0_6px_rgba(0,240,255,0.6)]"
          >
            <Circle className="size-4" />
          </button>
        )}
        {isDoneList && <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-neon" />}
        <p className="min-w-0 flex-1 text-sm font-medium text-ink">{card.name}</p>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-3">
          {card.due && (
            <span className="flex items-center gap-1 font-mono text-[10px] text-ink-dim">
              <CalendarClock className="size-3" aria-hidden />
              {new Date(card.due).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            </span>
          )}
          {card.badges.checkItems > 0 && (
            <span
              className={cn(
                'flex items-center gap-1 font-mono text-[10px]',
                card.badges.checkItemsChecked === card.badges.checkItems
                  ? 'text-neon'
                  : 'text-ink-dim',
              )}
            >
              <SquareCheck className="size-3" aria-hidden />
              {card.badges.checkItemsChecked}/{card.badges.checkItems}
            </span>
          )}
        </span>
        <span className="chamfer-sm border border-neon/35 px-1.5 py-0.5 font-mono text-[10px] text-neon">
          +{xp} XP
        </span>
      </div>
    </div>
  )
}

// ————— modal de detalhes —————

function CardModal({
  card,
  lists,
  boardLabels,
  boardId,
  token,
  multiplier,
  doneListId,
  cardsByList,
  onMoveToDone,
  onArchived,
  onClose,
}: {
  card: TrelloBoardCard
  lists: TrelloList[]
  boardLabels: TrelloLabel[]
  boardId: string
  token: string
  multiplier: number
  doneListId: string | null
  cardsByList: Map<string, TrelloBoardCard[]>
  onMoveToDone: (pos: number) => void
  onArchived: () => void
  onClose: () => void
}) {
  const updateCard = useUpdateCard(boardId, token)
  const moveCard = useMoveCard(boardId, token)

  const [name, setName] = useState(card.name)
  const [desc, setDesc] = useState(card.desc)
  const [due, setDue] = useState(card.due ? card.due.slice(0, 16) : '')
  const [labelIds, setLabelIds] = useState<string[]>(card.labels.map((l) => l.id))
  const [listId, setListId] = useState(card.idList)

  const potential = computeCompletion({
    xpBase: TRELLO_CARD_BASE_XP,
    coinBase: 0,
    virtueWeights: {},
    dueAt: due ? new Date(due).toISOString() : null,
    completedAt: new Date(),
    highPriorityLabelCount: countHighPriorityLabels(
      boardLabels.filter((l) => labelIds.includes(l.id)),
    ),
    multiplier,
  })

  const toggleLabel = (id: string) => {
    setLabelIds((prev) => (prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]))
  }

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('O card precisa de um título.')
      return
    }
    updateCard.mutate(
      {
        cardId: card.id,
        name: name.trim(),
        desc,
        due: due ? new Date(due).toISOString() : '',
        idLabels: labelIds,
      },
      {
        onSuccess: () => {
          if (listId !== card.idList) {
            const bucket = (cardsByList.get(listId) ?? []).filter((c) => c.id !== card.id)
            moveCard.mutate({
              cardId: card.id,
              toListId: listId,
              pos: positionForIndex(bucket, bucket.length),
            })
          }
          toast.success('Card atualizado no Trello.')
          onClose()
        },
        onError: () => toast.error('Não foi possível salvar o card.'),
      },
    )
  }

  const handleArchive = () => {
    updateCard.mutate(
      { cardId: card.id, closed: true },
      {
        onSuccess: () => {
          toast.success('Card arquivado.')
          onArchived() // arquivar pontua — sync sem esperar o polling
          onClose()
        },
        onError: () => toast.error('Não foi possível arquivar.'),
      },
    )
  }

  const handleCompleteNow = () => {
    if (!doneListId) return
    const bucket = (cardsByList.get(doneListId) ?? []).filter((c) => c.id !== card.id)
    onMoveToDone(positionForIndex(bucket, bucket.length))
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogTitle>Editar card</DialogTitle>

        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="card-name">Título</Label>
            <Input id="card-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="card-desc">Descrição</Label>
            <Textarea
              id="card-desc"
              rows={3}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="card-due">Prazo</Label>
              <Input
                id="card-due"
                type="datetime-local"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="card-list">Lista</Label>
              <select
                id="card-list"
                value={listId}
                onChange={(e) => setListId(e.target.value)}
                className="chamfer-sm flex h-10 w-full border border-input bg-panel-2 px-3 text-sm text-ink outline-none focus-visible:border-neon"
              >
                {lists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                    {list.id === doneListId ? ' (concluído)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {boardLabels.length > 0 && (
            <div>
              <Label>Labels</Label>
              <div className="flex flex-wrap gap-2">
                {boardLabels.map((label) => {
                  const active = labelIds.includes(label.id)
                  return (
                    <button
                      key={label.id}
                      type="button"
                      onClick={() => toggleLabel(label.id)}
                      aria-pressed={active}
                      className={cn(
                        'chamfer-sm flex items-center gap-2 border px-2.5 py-1 font-mono text-xs transition-colors',
                        active ? 'border-neon/60 text-ink' : 'border-border text-ink-dim',
                      )}
                    >
                      <span
                        aria-hidden
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: labelColor(label.color) }}
                      />
                      {label.name || label.color || 'sem nome'}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="border-t border-border pt-4">
            <CardChecklists
              boardId={boardId}
              cardId={card.id}
              token={token}
              xpPerItem={doneListId ? Math.round(TRELLO_CHECK_ITEM_BASE_XP * multiplier) : null}
            />
          </div>

          <div className="border-t border-border pt-4">
            <CardComments cardId={card.id} token={token} />
          </div>

          <p className="font-mono text-xs text-ink-dim">
            Vale <span className="text-neon">+{potential.xp} XP</span> concluindo agora
            {due && ' (inclui bônus de prazo)'} · ×{multiplier}
          </p>

          <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4">
            <div className="flex gap-2">
              <Button variant="destructive" size="sm" onClick={handleArchive}>
                Arquivar
              </Button>
              {doneListId && card.idList !== doneListId && (
                <Button variant="outline" size="sm" onClick={handleCompleteNow}>
                  Concluir agora
                </Button>
              )}
            </div>
            <Button size="sm" disabled={updateCard.isPending} onClick={handleSave}>
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
