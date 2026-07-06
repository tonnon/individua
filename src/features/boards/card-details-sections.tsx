import { useState } from 'react'
import { Eye, EyeOff, Plus, Square, SquareCheck, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  useAddCheckItem,
  useAddComment,
  useCardChecklists,
  useCardComments,
  useCreateChecklist,
  useDeleteCheckItem,
  useDeleteChecklist,
  useToggleCheckItem,
} from '@/features/boards/use-card-details'
import type { TrelloChecklist } from '@/features/trello/api'
import { cn } from '@/lib/utils'

// ————— checklists —————

export function CardChecklists({
  boardId,
  cardId,
  token,
  xpPerItem,
}: {
  boardId: string
  cardId: string
  token: string
  /** XP por item marcado (null se o board não é gamificado) */
  xpPerItem: number | null
}) {
  const checklists = useCardChecklists(cardId, token)
  const createChecklist = useCreateChecklist(boardId, cardId, token)
  const [addingList, setAddingList] = useState(false)
  const [newListName, setNewListName] = useState('')

  const handleCreateChecklist = () => {
    const name = newListName.trim()
    if (!name) return
    createChecklist.mutate(name, {
      onSuccess: () => {
        setNewListName('')
        setAddingList(false)
      },
      onError: () => toast.error('Não foi possível criar a checklist.'),
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="flex items-baseline gap-3">
          <Label>Checklists</Label>
          {xpPerItem !== null && (
            <span className="font-mono text-[10px] tracking-wider text-neon">
              // +{xpPerItem} XP por item marcado
            </span>
          )}
        </span>
        {addingList ? null : (
          <Button variant="ghost" size="sm" onClick={() => setAddingList(true)}>
            <Plus /> Nova checklist
          </Button>
        )}
      </div>

      {addingList && (
        <div className="flex gap-2">
          <Input
            autoFocus
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateChecklist()
              if (e.key === 'Escape') setAddingList(false)
            }}
            placeholder="Nome da checklist"
            aria-label="Nome da nova checklist"
          />
          <Button size="sm" disabled={createChecklist.isPending} onClick={handleCreateChecklist}>
            Criar
          </Button>
        </div>
      )}

      {checklists.isLoading && <p className="text-xs text-ink-dim">Carregando checklists…</p>}

      {checklists.data?.map((checklist) => (
        <ChecklistSection
          key={checklist.id}
          checklist={checklist}
          boardId={boardId}
          cardId={cardId}
          token={token}
        />
      ))}
    </div>
  )
}

function ChecklistSection({
  checklist,
  boardId,
  cardId,
  token,
}: {
  checklist: TrelloChecklist
  boardId: string
  cardId: string
  token: string
}) {
  const toggleItem = useToggleCheckItem(boardId, cardId, token)
  const addItem = useAddCheckItem(boardId, cardId, token)
  const deleteItem = useDeleteCheckItem(boardId, cardId, token)
  const deleteChecklist = useDeleteChecklist(boardId, cardId, token)

  // como no Trello: dá para ocultar os itens já marcados
  const [hideChecked, setHideChecked] = useState(false)
  const [newItem, setNewItem] = useState('')

  const items = [...checklist.checkItems].sort((a, b) => a.pos - b.pos)
  const checkedCount = items.filter((i) => i.state === 'complete').length
  const percent = items.length > 0 ? Math.round((checkedCount / items.length) * 100) : 0
  const visible = hideChecked ? items.filter((i) => i.state !== 'complete') : items

  const handleAddItem = () => {
    const name = newItem.trim()
    if (!name) return
    addItem.mutate(
      { checklistId: checklist.id, name },
      {
        onSuccess: () => setNewItem(''),
        onError: () => toast.error('Não foi possível adicionar o item.'),
      },
    )
  }

  return (
    <div className="chamfer-sm border border-border bg-void/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-sm font-semibold text-ink">{checklist.name}</p>
        <div className="flex items-center gap-1">
          {checkedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              aria-pressed={hideChecked}
              onClick={() => setHideChecked((v) => !v)}
            >
              {hideChecked ? (
                <>
                  <Eye /> Mostrar marcados ({checkedCount})
                </>
              ) : (
                <>
                  <EyeOff /> Ocultar marcados
                </>
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Excluir checklist ${checklist.name}`}
            onClick={() => deleteChecklist.mutate(checklist.id)}
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      {/* barra de progresso fina, estilo Trello */}
      <div className="mt-2 flex items-center gap-2">
        <span className="w-9 shrink-0 text-right font-mono text-[10px] text-ink-dim">
          {percent}%
        </span>
        <div className="h-1.5 flex-1 bg-ink-dim/15">
          <div
            className={cn(
              'h-full transition-all',
              percent === 100 ? 'bg-neon shadow-glow-neon' : 'bg-neon/60',
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <ul className="mt-3 space-y-1">
        {visible.map((item) => {
          const done = item.state === 'complete'
          return (
            <li key={item.id} className="group flex items-start gap-2">
              <button
                type="button"
                role="checkbox"
                aria-checked={done}
                aria-label={item.name}
                onClick={() =>
                  toggleItem.mutate({
                    checkItemId: item.id,
                    state: done ? 'incomplete' : 'complete',
                  })
                }
                className={cn(
                  'mt-0.5 shrink-0 transition-colors',
                  done ? 'text-neon' : 'text-ink-dim hover:text-ink',
                )}
              >
                {done ? <SquareCheck className="size-4" /> : <Square className="size-4" />}
              </button>
              <span
                className={cn(
                  'min-w-0 flex-1 break-words text-sm',
                  done ? 'text-ink-dim line-through' : 'text-ink',
                )}
              >
                {item.name}
              </span>
              <button
                type="button"
                aria-label={`Excluir item ${item.name}`}
                onClick={() =>
                  deleteItem.mutate({ checklistId: checklist.id, checkItemId: item.id })
                }
                className="mt-0.5 shrink-0 text-ink-dim opacity-0 transition-opacity hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          )
        })}
        {visible.length === 0 && (
          <li className="font-mono text-[10px] text-ink-dim">
            {hideChecked ? '// tudo concluído aqui' : '// checklist vazia'}
          </li>
        )}
      </ul>

      <div className="mt-2 flex gap-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddItem()
          }}
          placeholder="Adicionar um item"
          aria-label={`Novo item em ${checklist.name}`}
          className="h-8 text-xs"
        />
        <Button size="sm" variant="outline" disabled={addItem.isPending} onClick={handleAddItem}>
          <Plus />
        </Button>
      </div>
    </div>
  )
}

// ————— comentários —————

export function CardComments({ cardId, token }: { cardId: string; token: string }) {
  const comments = useCardComments(cardId, token)
  const addComment = useAddComment(cardId, token)
  const [text, setText] = useState('')

  const handleAdd = () => {
    const value = text.trim()
    if (!value) return
    addComment.mutate(value, {
      onSuccess: () => setText(''),
      onError: () => toast.error('Não foi possível comentar.'),
    })
  }

  return (
    <div className="space-y-3">
      <Label>Comentários e atividade</Label>

      <div className="flex gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="Escrever um comentário…"
          aria-label="Novo comentário"
        />
        <Button size="sm" disabled={addComment.isPending || !text.trim()} onClick={handleAdd}>
          Enviar
        </Button>
      </div>

      {comments.isLoading && <p className="text-xs text-ink-dim">Carregando comentários…</p>}

      <ul className="space-y-2">
        {comments.data?.map((comment) => (
          <li key={comment.id} className="chamfer-sm border border-border bg-void/30 px-3 py-2">
            <p className="flex items-baseline justify-between gap-2">
              <span className="font-display text-xs font-semibold text-ink">
                {comment.memberCreator.fullName}
              </span>
              <span className="font-mono text-[10px] text-ink-dim">
                {new Date(comment.date).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink-dim">
              {comment.data.text}
            </p>
          </li>
        ))}
        {!comments.isLoading && (comments.data?.length ?? 0) === 0 && (
          <li className="font-mono text-[10px] text-ink-dim">// sem comentários ainda</li>
        )}
      </ul>
    </div>
  )
}
