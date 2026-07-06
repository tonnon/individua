import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { HudPanel } from '@/components/hud/hud-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useProfile } from '@/features/auth/use-profile'
import { trelloAuthorizeUrl } from '@/features/trello/api'
import { useBoardConfigs, useDisconnectTrello } from '@/features/trello/use-trello'
import { useDisableWebhooks, useEnableWebhooks } from '@/features/trello/use-webhooks'
import { env } from '@/lib/env'
import { supabase } from '@/lib/supabase'
import { useUiStore } from '@/stores/ui'

export const Route = createFileRoute('/_authenticated/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const { user } = Route.useRouteContext()
  const queryClient = useQueryClient()
  const scanlines = useUiStore((s) => s.scanlines)
  const toggleScanlines = useUiStore((s) => s.toggleScanlines)
  const { data: profile } = useProfile(user.id)
  const { data: configs } = useBoardConfigs(user.id)
  const disconnectTrello = useDisconnectTrello(user.id)
  const enableWebhooks = useEnableWebhooks(user.id)
  const disableWebhooks = useDisableWebhooks(user.id)

  const [aiKey, setAiKey] = useState('')
  const [savingKey, setSavingKey] = useState(false)

  const trelloConnected = Boolean(profile?.trello_token)
  const gamified = (configs ?? []).filter((c) => c.active && c.done_list_id)
  const withWebhook = gamified.filter((c) => c.trello_webhook_id)

  const handleEnableWebhooks = () => {
    if (!profile?.trello_token) return
    enableWebhooks.mutate(
      { token: profile.trello_token, configs: configs ?? [] },
      {
        onSuccess: (created) =>
          toast.success(
            created > 0
              ? `Webhook ativado em ${created} ${created === 1 ? 'board' : 'boards'} — XP em tempo real, sem o app aberto.`
              : 'Todos os boards gamificados já têm webhook.',
          ),
        onError: () =>
          toast.error(
            'O Trello recusou o registro. A Edge Function está deployada? (ver README, Fase 9)',
          ),
      },
    )
  }

  const handleDisableWebhooks = () => {
    if (!profile?.trello_token) return
    disableWebhooks.mutate(
      { token: profile.trello_token, configs: configs ?? [] },
      {
        onSuccess: (removed) => toast.success(`Webhook removido de ${removed} boards.`),
        onError: () => toast.error('Não foi possível remover os webhooks.'),
      },
    )
  }

  const handleSaveAiKey = async () => {
    const value = aiKey.trim()
    if (!value) {
      toast.error('Cole sua chave da API da Anthropic.')
      return
    }
    setSavingKey(true)
    const { error } = await supabase
      .from('profiles')
      .update({ ai_api_key: value })
      .eq('id', user.id)
    setSavingKey(false)
    if (error) {
      toast.error('Não foi possível salvar a chave. A migration da Fase 9 já rodou?')
      return
    }
    setAiKey('')
    void queryClient.invalidateQueries({ queryKey: ['profile', user.id] })
    toast.success('Chave salva. O Arquiteto está online em Evolução Chat IA.')
  }

  const handleRemoveAiKey = async () => {
    const { error } = await supabase.from('profiles').update({ ai_api_key: null }).eq('id', user.id)
    if (error) {
      toast.error('Não foi possível remover a chave.')
      return
    }
    void queryClient.invalidateQueries({ queryKey: ['profile', user.id] })
    toast.success('Chave removida.')
  }

  const handleReconnect = () => {
    window.location.href = trelloAuthorizeUrl(`${window.location.origin}/trello-callback`)
  }

  const handleDisconnect = () => {
    disconnectTrello.mutate(undefined, {
      onSuccess: () => toast.success('Trello desconectado. Os boards param de sincronizar.'),
      onError: () => toast.error('Não foi possível desconectar. Tente de novo.'),
    })
  }

  return (
    <div className="max-w-2xl space-y-4">
      <HudPanel>
        <h2 className="font-display text-lg font-semibold tracking-wide text-ink">Aparência</h2>
        <div className="mt-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-ink">Scanlines</p>
            <p className="text-sm text-ink-dim">
              Overlay retrô de linhas de varredura sobre a interface.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            role="switch"
            aria-checked={scanlines}
            onClick={toggleScanlines}
          >
            {scanlines ? 'Desligar' : 'Ligar'}
          </Button>
        </div>
      </HudPanel>

      <HudPanel tone={trelloConnected ? 'neon' : 'dim'}>
        <h2 className="font-display text-lg font-semibold tracking-wide text-ink">Trello</h2>
        <p className="mt-1 font-mono text-xs tracking-wider text-ink-dim">
          {trelloConnected ? <span className="text-neon">// conectado</span> : '// não conectado'}
        </p>
        <p className="mt-2 text-sm text-ink-dim">
          {trelloConnected
            ? 'Cards que chegam nas listas "Concluído" dos boards gamificados viram XP a cada sincronização (60s com a aba aberta).'
            : 'Conecte para transformar cards concluídos em XP. O token fica protegido por RLS — só você lê.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {env.VITE_TRELLO_API_KEY ? (
            <>
              <Button
                size="sm"
                variant={trelloConnected ? 'outline' : 'default'}
                onClick={handleReconnect}
              >
                {trelloConnected ? 'Reconectar' : 'Conectar Trello'}
              </Button>
              {trelloConnected && (
                <>
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/boards">Configurar boards</Link>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={disconnectTrello.isPending}
                    onClick={handleDisconnect}
                  >
                    Desconectar
                  </Button>
                </>
              )}
            </>
          ) : (
            <p className="text-sm text-ink-dim">
              Preencha <span className="font-mono text-ink">VITE_TRELLO_API_KEY</span> no{' '}
              <span className="font-mono text-ink">.env</span> para habilitar (ver README).
            </p>
          )}
        </div>
      </HudPanel>

      {trelloConnected && gamified.length > 0 && (
        <HudPanel tone={withWebhook.length > 0 ? 'neon' : 'dim'}>
          <h2 className="font-display text-lg font-semibold tracking-wide text-ink">
            Webhook — XP em tempo real
          </h2>
          <p className="mt-1 font-mono text-xs tracking-wider text-ink-dim">
            {withWebhook.length > 0 ? (
              <span className="text-neon">
                // ativo em {withWebhook.length}/{gamified.length} boards
              </span>
            ) : (
              '// inativo — só polling (60s, com a aba aberta)'
            )}
          </p>
          <p className="mt-2 text-sm text-ink-dim">
            Com o webhook, o Trello avisa o servidor na hora — cards e checklists pontuam mesmo com
            o app fechado. Exige a Edge Function deployada no Supabase (passo a passo no README,
            Fase 9). A idempotência garante que webhook + polling juntos nunca duplicam XP.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={withWebhook.length > 0 ? 'outline' : 'default'}
              disabled={enableWebhooks.isPending}
              onClick={handleEnableWebhooks}
            >
              {withWebhook.length > 0 ? 'Reativar/faltantes' : 'Ativar webhook'}
            </Button>
            {withWebhook.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                disabled={disableWebhooks.isPending}
                onClick={handleDisableWebhooks}
              >
                Desativar
              </Button>
            )}
          </div>
        </HudPanel>
      )}

      <HudPanel tone={profile?.ai_api_key ? 'violet' : 'dim'}>
        <h2 className="font-display text-lg font-semibold tracking-wide text-ink">
          Evolução Chat IA
        </h2>
        <p className="mt-1 font-mono text-xs tracking-wider text-ink-dim">
          {profile?.ai_api_key ? (
            <span className="text-violet">// chave configurada — Arquiteto online</span>
          ) : (
            '// sem chave — chat indisponível'
          )}
        </p>
        <p className="mt-2 text-sm text-ink-dim">
          Converse com o Arquiteto de verdade usando a SUA chave da API da Anthropic
          (console.anthropic.com). É o único módulo com custo real — cobrado direto na sua conta,
          por uso. A chave fica no seu profile, protegida por RLS.
        </p>
        {profile?.ai_api_key ? (
          <div className="mt-4">
            <Button variant="destructive" size="sm" onClick={() => void handleRemoveAiKey()}>
              Remover chave
            </Button>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            <Label htmlFor="ai-key">Chave da API (sk-ant-…)</Label>
            <div className="flex gap-2">
              <Input
                id="ai-key"
                type="password"
                value={aiKey}
                onChange={(e) => setAiKey(e.target.value)}
                placeholder="sk-ant-api03-…"
                autoComplete="off"
              />
              <Button size="sm" disabled={savingKey} onClick={() => void handleSaveAiKey()}>
                Salvar
              </Button>
            </div>
          </div>
        )}
      </HudPanel>

      <HudPanel>
        <h2 className="font-display text-lg font-semibold tracking-wide text-ink">Conta</h2>
        <p className="mt-1 text-sm text-ink-dim">
          Sessão via Google (Supabase Auth). Para sair, use o botão no topo da tela. Preferência de
          ranking público fica na Arena Global.
        </p>
      </HudPanel>
    </div>
  )
}
