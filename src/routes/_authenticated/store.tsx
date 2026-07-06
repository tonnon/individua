import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { HudPanel } from '@/components/hud/hud-panel'
import { HudStat } from '@/components/hud/hud-stat'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useProfile } from '@/features/auth/use-profile'
import {
  useCreateReward,
  useDeleteReward,
  useRedeemReward,
  useRewards,
} from '@/features/gamification/use-rewards'

export const Route = createFileRoute('/_authenticated/store')({
  component: StorePage,
})

function StorePage() {
  const { user } = Route.useRouteContext()
  const { data: profile } = useProfile(user.id)
  const { data: rewards, isLoading } = useRewards(user.id)
  const createReward = useCreateReward(user.id)
  const deleteReward = useDeleteReward(user.id)
  const redeemReward = useRedeemReward(user.id)

  const [formOpen, setFormOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [costCoins, setCostCoins] = useState(10)

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setCostCoins(10)
  }

  const handleCreate = () => {
    if (!title.trim()) {
      toast.error('Dê um título para a recompensa.')
      return
    }
    createReward.mutate(
      { title: title.trim(), description: description.trim() || null, costCoins },
      {
        onSuccess: () => {
          toast.success('Recompensa criada.')
          resetForm()
          setFormOpen(false)
        },
        onError: () => toast.error('Não foi possível criar a recompensa.'),
      },
    )
  }

  const handleRedeem = (rewardId: string) => {
    redeemReward.mutate(rewardId, {
      onSuccess: () => toast.success('Recompensa resgatada — aproveite!'),
      onError: (error) =>
        toast.error(
          error.message === 'saldo insuficiente'
            ? 'Moedas insuficientes.'
            : 'Não foi possível resgatar.',
        ),
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold tracking-wide text-ink">Loja do Tempo</h2>
        <div className="flex items-center gap-4">
          <HudStat label="COINS" value={String(profile?.coins ?? 0)} tone="magenta" />
          <Button size="sm" onClick={() => setFormOpen((v) => !v)}>
            <Plus />
            Nova recompensa
          </Button>
        </div>
      </div>

      {formOpen && (
        <HudPanel tone="magenta">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="reward-title">Título</Label>
              <Input
                id="reward-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Assistir um episódio"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="reward-description">Descrição (opcional)</Label>
              <Textarea
                id="reward-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="reward-cost">Custo em moedas</Label>
              <Input
                id="reward-cost"
                type="number"
                min={1}
                value={costCoins}
                onChange={(e) => setCostCoins(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" disabled={createReward.isPending} onClick={handleCreate}>
              Criar recompensa
            </Button>
          </div>
        </HudPanel>
      )}

      {isLoading && <p className="text-sm text-ink-dim">Carregando recompensas…</p>}

      {!isLoading && rewards?.length === 0 && (
        <HudPanel>
          <p className="text-sm text-ink-dim">
            Nenhuma recompensa cadastrada ainda. Crie a primeira e comece a trocar moedas por tempo
            livre.
          </p>
        </HudPanel>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rewards?.map((reward) => {
          const affordable = (profile?.coins ?? 0) >= reward.cost_coins
          return (
            <HudPanel key={reward.id} tone="magenta">
              <div className="flex items-start justify-between gap-2">
                <p className="font-display text-sm font-semibold text-ink">{reward.title}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Excluir recompensa"
                  onClick={() => deleteReward.mutate(reward.id)}
                >
                  <Trash2 />
                </Button>
              </div>
              {reward.description && (
                <p className="mt-1 text-sm text-ink-dim">{reward.description}</p>
              )}
              <div className="mt-3 flex items-center justify-between">
                <HudStat label="CUSTO" value={`${reward.cost_coins} coins`} tone="magenta" />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!affordable || redeemReward.isPending}
                  onClick={() => handleRedeem(reward.id)}
                >
                  Resgatar
                </Button>
              </div>
            </HudPanel>
          )
        })}
      </div>
    </div>
  )
}
