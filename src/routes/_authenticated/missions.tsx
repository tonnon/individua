import { useState, type ReactNode } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Plus, SquareKanban, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { HudPanel } from '@/components/hud/hud-panel'
import { HudStat } from '@/components/hud/hud-stat'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  VIRTUE_CODES,
  VIRTUE_LABELS,
  type VirtueCode,
} from '@/features/gamification/engine/virtues'
import { TrelloBoardView } from '@/features/boards/trello-board-view'
import { useCompletionFlow } from '@/features/gamification/use-completion-flow'
import {
  useCreateMission,
  useDeleteMission,
  useMissions,
} from '@/features/gamification/use-missions'
import { useBoardConfigs } from '@/features/trello/use-trello'
import type { MissionRecurrence } from '@/lib/database.types'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authenticated/missions')({
  component: MissionsPage,
})

const RECURRENCE_LABELS: Record<MissionRecurrence, string> = {
  none: 'Única',
  daily: 'Diária',
  weekly: 'Semanal',
}

function MissionsPage() {
  const { user } = Route.useRouteContext()
  const { data: missions, isLoading } = useMissions(user.id)
  const createMission = useCreateMission(user.id)
  const completionFlow = useCompletionFlow(user.id)
  const deleteMission = useDeleteMission(user.id)

  // abas: missões manuais + um board do Trello por aba
  const { data: configs } = useBoardConfigs(user.id)
  const gamifiedBoards = (configs ?? []).filter((c) => c.active && c.done_list_id)
  const [tab, setTab] = useState<'missions' | string>('missions')
  const activeBoard = gamifiedBoards.find((b) => b.trello_board_id === tab)

  const [formOpen, setFormOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [xpBase, setXpBase] = useState(50)
  const [coinBase, setCoinBase] = useState(0)
  const [recurrence, setRecurrence] = useState<MissionRecurrence>('none')
  const [dueAt, setDueAt] = useState('')
  const [virtues, setVirtues] = useState<VirtueCode[]>([])

  const toggleVirtue = (code: VirtueCode) => {
    setVirtues((prev) => (prev.includes(code) ? prev.filter((v) => v !== code) : [...prev, code]))
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setXpBase(50)
    setCoinBase(0)
    setRecurrence('none')
    setDueAt('')
    setVirtues([])
  }

  const handleCreate = () => {
    if (!title.trim()) {
      toast.error('Dê um título para a missão.')
      return
    }
    const virtueWeights = Object.fromEntries(virtues.map((code) => [code, 1]))
    createMission.mutate(
      {
        title: title.trim(),
        description: description.trim() || null,
        virtueWeights,
        xpBase,
        coinBase,
        recurrence,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
      },
      {
        onSuccess: () => {
          toast.success('Missão criada.')
          resetForm()
          setFormOpen(false)
        },
        onError: () => toast.error('Não foi possível criar a missão.'),
      },
    )
  }

  return (
    <div className="space-y-4">
      {/* abas: sistema + boards do Trello — a integração vive aqui */}
      <div
        role="tablist"
        aria-label="Fontes de missões"
        className="flex flex-wrap items-center gap-2 border-b border-border pb-3"
      >
        <TabButton active={tab === 'missions'} onClick={() => setTab('missions')}>
          Missões do sistema
        </TabButton>
        {gamifiedBoards.map((board) => (
          <TabButton
            key={board.trello_board_id}
            active={tab === board.trello_board_id}
            onClick={() => setTab(board.trello_board_id)}
          >
            <SquareKanban className="size-3.5" aria-hidden />
            {board.board_name}
          </TabButton>
        ))}
        {gamifiedBoards.length === 0 && (
          <Link
            to="/boards"
            className="ml-auto font-mono text-xs text-neon underline-offset-4 hover:underline"
          >
            // conectar Trello →
          </Link>
        )}
      </div>

      {activeBoard ? (
        <TrelloBoardView userId={user.id} boardId={activeBoard.trello_board_id} />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold tracking-wide text-ink">
              Missões ativas
            </h2>
            <Button size="sm" onClick={() => setFormOpen((v) => !v)}>
              <Plus />
              Nova missão
            </Button>
          </div>

          {formOpen && (
            <HudPanel tone="neon">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="mission-title">Título</Label>
                  <Input
                    id="mission-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex.: Treinar 30 minutos"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="mission-description">Descrição (opcional)</Label>
                  <Textarea
                    id="mission-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="mission-xp">XP base</Label>
                  <Input
                    id="mission-xp"
                    type="number"
                    min={0}
                    value={xpBase}
                    onChange={(e) => setXpBase(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="mission-coins">Moedas (0 = automático)</Label>
                  <Input
                    id="mission-coins"
                    type="number"
                    min={0}
                    value={coinBase}
                    onChange={(e) => setCoinBase(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="mission-recurrence">Recorrência</Label>
                  <select
                    id="mission-recurrence"
                    value={recurrence}
                    onChange={(e) => setRecurrence(e.target.value as MissionRecurrence)}
                    className="chamfer-sm flex h-10 w-full border border-input bg-panel-2 px-3 text-sm text-ink outline-none focus-visible:border-neon"
                  >
                    {(Object.entries(RECURRENCE_LABELS) as [MissionRecurrence, string][]).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <div>
                  <Label htmlFor="mission-due">Prazo (opcional)</Label>
                  <Input
                    id="mission-due"
                    type="datetime-local"
                    value={dueAt}
                    onChange={(e) => setDueAt(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Virtudes alimentadas</Label>
                  <div className="flex flex-wrap gap-2">
                    {VIRTUE_CODES.map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => toggleVirtue(code)}
                        className={cn(
                          'chamfer-sm border px-3 py-1.5 font-mono text-xs tracking-wide transition-colors',
                          virtues.includes(code)
                            ? 'border-neon bg-neon/10 text-neon shadow-glow-neon'
                            : 'border-border text-ink-dim hover:text-ink',
                        )}
                      >
                        {VIRTUE_LABELS[code]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setFormOpen(false)}>
                  Cancelar
                </Button>
                <Button size="sm" disabled={createMission.isPending} onClick={handleCreate}>
                  Criar missão
                </Button>
              </div>
            </HudPanel>
          )}

          {isLoading && <p className="text-sm text-ink-dim">Carregando missões…</p>}

          {!isLoading && missions?.length === 0 && (
            <HudPanel>
              <p className="text-sm text-ink-dim">
                Nenhuma missão ativa. Crie novas missões para continuar evoluindo.
              </p>
            </HudPanel>
          )}

          <div className="space-y-3">
            {missions?.map((mission) => (
              <HudPanel key={mission.id} size="sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-sm font-semibold text-ink">{mission.title}</p>
                    {mission.description && (
                      <p className="mt-1 text-sm text-ink-dim">{mission.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-3">
                      <HudStat label="XP" value={String(mission.xp_base)} />
                      {mission.coin_base > 0 && (
                        <HudStat label="COINS" value={String(mission.coin_base)} tone="magenta" />
                      )}
                      {mission.recurrence !== 'none' && (
                        <HudStat
                          label="RECORRÊNCIA"
                          value={RECURRENCE_LABELS[mission.recurrence]}
                          tone="violet"
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      disabled={completionFlow.isPending}
                      onClick={() => completionFlow.complete(mission)}
                    >
                      Concluir
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Excluir missão"
                      onClick={() => deleteMission.mutate(mission.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              </HudPanel>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'chamfer-sm flex items-center gap-1.5 border px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-wider transition-colors',
        active
          ? 'border-neon/60 bg-neon/10 text-neon shadow-glow-neon'
          : 'border-border text-ink-dim hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}
