import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ExternalLink, SquareKanban } from 'lucide-react'
import { toast } from 'sonner'

import { HudPanel } from '@/components/hud/hud-panel'
import { HudStat } from '@/components/hud/hud-stat'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useProfile } from '@/features/auth/use-profile'
import { trelloAuthorizeUrl, type TrelloBoard } from '@/features/trello/api'
import {
  useBoardConfigs,
  useSaveBoardConfig,
  useTrelloBoards,
  useTrelloLists,
} from '@/features/trello/use-trello'
import { env } from '@/lib/env'
import type { BoardConfigRow } from '@/lib/database.types'

export const Route = createFileRoute('/_authenticated/boards/')({
  component: BoardsPage,
})

function BoardsPage() {
  const { user } = Route.useRouteContext()
  const { data: profile } = useProfile(user.id)
  const { data: configs } = useBoardConfigs(user.id)
  const token = profile?.trello_token ?? null
  const boards = useTrelloBoards(token)

  const handleConnect = () => {
    window.location.href = trelloAuthorizeUrl(`${window.location.origin}/trello-callback`)
  }

  if (!env.VITE_TRELLO_API_KEY) {
    return (
      <HudPanel tone="magenta">
        <h2 className="font-display text-lg font-semibold tracking-wide text-ink">
          Falta a API key do Trello
        </h2>
        <p className="mt-1 text-sm text-ink-dim">
          Preencha <span className="font-mono text-ink">VITE_TRELLO_API_KEY</span> no seu{' '}
          <span className="font-mono text-ink">.env</span> (crie um Power-Up em
          trello.com/power-ups/admin — passo a passo no README) e reinicie o dev server.
        </p>
      </HudPanel>
    )
  }

  if (!token) {
    return (
      <HudPanel tone="neon" glow className="py-10 text-center">
        <SquareKanban className="mx-auto size-10 text-neon" aria-hidden />
        <h2 className="mt-4 font-display text-xl font-bold tracking-wide text-ink">
          Conecte seu Trello
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-dim">
          Autorize o acesso, escolha quais boards gamificar e qual lista representa
          &quot;Concluído&quot; — cada card que chegar lá vira XP automaticamente.
        </p>
        <Button className="mt-6" onClick={handleConnect}>
          Conectar Trello
        </Button>
        <p className="mt-3 font-mono text-[10px] tracking-wider text-ink-dim">
          token guardado com RLS // só você lê
        </p>
      </HudPanel>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold tracking-wide text-ink">
          Boards do Trello
        </h2>
        <HudStat
          label="GAMIFICADOS"
          value={String((configs ?? []).filter((c) => c.active && c.done_list_id).length)}
        />
      </div>

      {boards.isLoading && <p className="text-sm text-ink-dim">Carregando boards…</p>}
      {boards.isError && (
        <HudPanel tone="magenta">
          <p className="text-sm text-ink-dim">
            Não foi possível listar seus boards — o token pode ter sido revogado. Reconecte o Trello
            em Configurações.
          </p>
        </HudPanel>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {boards.data?.map((board) => (
          <BoardConfigCard
            key={board.id}
            board={board}
            token={token}
            userId={user.id}
            config={(configs ?? []).find((c) => c.trello_board_id === board.id)}
          />
        ))}
      </div>
    </div>
  )
}

function BoardConfigCard({
  board,
  token,
  userId,
  config,
}: {
  board: TrelloBoard
  token: string
  userId: string
  config: BoardConfigRow | undefined
}) {
  const isConfigured = Boolean(config?.active && config.done_list_id)
  const [open, setOpen] = useState(false)
  const [doneListId, setDoneListId] = useState(config?.done_list_id ?? '')
  const [multiplier, setMultiplier] = useState(config?.xp_multiplier ?? 1)

  const lists = useTrelloLists(board.id, token, open)
  const saveConfig = useSaveBoardConfig(userId)

  const handleSave = (active: boolean) => {
    if (active && !doneListId) {
      toast.error('Escolha qual lista representa "Concluído".')
      return
    }
    saveConfig.mutate(
      {
        trelloBoardId: board.id,
        boardName: board.name,
        doneListId: doneListId || null,
        xpMultiplier: multiplier > 0 ? multiplier : 1,
        active,
      },
      {
        onSuccess: () => {
          toast.success(active ? `${board.name} gamificado.` : `${board.name} pausado.`)
          if (active) setOpen(false)
        },
        onError: () => toast.error('Não foi possível salvar a configuração.'),
      },
    )
  }

  return (
    <HudPanel size="sm" tone={isConfigured ? 'neon' : 'dim'}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-semibold text-ink">{board.name}</p>
          <p className="mt-1 font-mono text-[10px] tracking-wider text-ink-dim">
            {isConfigured ? (
              <span className="text-neon">// gamificado ×{config?.xp_multiplier}</span>
            ) : (
              '// não gamificado'
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button asChild variant="ghost" size="icon" aria-label={`Abrir ${board.name} no Trello`}>
            <a href={board.url} target="_blank" rel="noreferrer">
              <ExternalLink />
            </a>
          </Button>
          <Button asChild size="sm">
            <Link to="/boards/$boardId" params={{ boardId: board.id }}>
              Abrir board
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
            {open ? 'Fechar' : 'Configurar'}
          </Button>
        </div>
      </div>

      {open && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <div>
            <Label htmlFor={`done-list-${board.id}`}>Lista &quot;Concluído&quot;</Label>
            <select
              id={`done-list-${board.id}`}
              value={doneListId}
              onChange={(e) => setDoneListId(e.target.value)}
              className="chamfer-sm flex h-10 w-full border border-input bg-panel-2 px-3 text-sm text-ink outline-none focus-visible:border-neon"
            >
              <option value="">
                {lists.isLoading ? 'Carregando listas…' : 'Selecione a lista'}
              </option>
              {lists.data?.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor={`multiplier-${board.id}`}>Multiplicador de XP</Label>
            <Input
              id={`multiplier-${board.id}`}
              type="number"
              min={0.1}
              step={0.1}
              value={multiplier}
              onChange={(e) => setMultiplier(Number(e.target.value))}
            />
          </div>
          <div className="flex justify-end gap-2">
            {isConfigured && (
              <Button
                variant="ghost"
                size="sm"
                disabled={saveConfig.isPending}
                onClick={() => handleSave(false)}
              >
                Pausar
              </Button>
            )}
            <Button size="sm" disabled={saveConfig.isPending} onClick={() => handleSave(true)}>
              {isConfigured ? 'Salvar' : 'Gamificar board'}
            </Button>
          </div>
        </div>
      )}
    </HudPanel>
  )
}
