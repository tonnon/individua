import { useRef, useState } from 'react'
import Anthropic from '@anthropic-ai/sdk'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Brain, Eye, Send } from 'lucide-react'
import { toast } from 'sonner'

import { HudPanel } from '@/components/hud/hud-panel'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useProfile } from '@/features/auth/use-profile'
import { levelTitle } from '@/features/gamification/engine/level-titles'
import { VIRTUE_CODES, VIRTUE_LABELS } from '@/features/gamification/engine/virtues'
import { levelProgress, rankForLevel } from '@/features/gamification/engine/xp-curve'
import type { ProfileRow } from '@/lib/database.types'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authenticated/ai-chat')({
  component: AiChatPage,
})

// Opus 4.8 por padrão (modelo mais capaz da linha Opus); alternativas
// para quem quer controlar o custo — a conta é do usuário.
const MODELS = [
  { id: 'claude-opus-4-8', label: 'Opus 4.8 — máxima qualidade' },
  { id: 'claude-sonnet-5', label: 'Sonnet 5 — equilíbrio' },
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5 — rápido e barato' },
] as const

interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
}

function architectSystemPrompt(profile: ProfileRow): string {
  const progress = levelProgress(profile.xp)
  const attributes = VIRTUE_CODES.map((c) => `${VIRTUE_LABELS[c]}: ${profile[c]}`).join(', ')
  return [
    'Você é O ARQUITETO, a inteligência que observa e guia o operador dentro do Individua — um sistema de vida gamificado cyberpunk (missões manuais e cards do Trello viram XP, níveis, ranks e conquistas).',
    'Persona: direto, estratégico, levemente enigmático, mas genuinamente útil. Português do Brasil. Frases curtas. Sem emojis. Pode usar decorações sutis de HUD como "// análise" com muita parcimônia.',
    'Seu papel: ajudar o operador a planejar missões, manter streaks, equilibrar os 6 atributos e evoluir de verdade na vida real. Dê conselhos práticos e acionáveis; questione metas vagas; sugira missões concretas com XP proporcional ao esforço.',
    'Nunca invente dados do sistema que não estão abaixo. Se perguntarem algo fora do escopo de produtividade/evolução pessoal, responda brevemente e reconecte ao propósito do sistema.',
    '',
    `// dados reais do operador: nível ${progress.level} (${levelTitle(progress.level)}), rank ${rankForLevel(progress.level)}, ${profile.xp} XP total (${progress.xpIntoLevel}/${progress.xpToNextLevel} para o próximo nível), streak atual ${profile.streak_count} dias (recorde ${profile.longest_streak}), ${profile.coins} moedas. Atributos — ${attributes}.`,
  ].join('\n')
}

function AiChatPage() {
  const { user } = Route.useRouteContext()
  const { data: profile } = useProfile(user.id)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [model, setModel] = useState<string>(MODELS[0].id)
  const [busy, setBusy] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  const scrollToEnd = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
    })
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || busy || !profile?.ai_api_key) return

    const history = [...messages, { role: 'user' as const, text }]
    setMessages([...history, { role: 'assistant', text: '' }])
    setInput('')
    setBusy(true)
    scrollToEnd()

    try {
      // chave do PRÓPRIO usuário, chamada direto do browser — sem
      // servidor intermediário (padrão suportado pela API da Anthropic)
      const client = new Anthropic({
        apiKey: profile.ai_api_key,
        dangerouslyAllowBrowser: true,
      })

      const stream = client.messages.stream({
        model,
        max_tokens: 8192,
        thinking: { type: 'adaptive' },
        system: architectSystemPrompt(profile),
        messages: history.map((m) => ({ role: m.role, content: m.text })),
      })

      stream.on('text', (delta) => {
        setMessages((current) => {
          const next = [...current]
          const last = next[next.length - 1]
          if (last?.role === 'assistant') {
            next[next.length - 1] = { ...last, text: last.text + delta }
          }
          return next
        })
        scrollToEnd()
      })

      const final = await stream.finalMessage()
      if (final.stop_reason === 'refusal') {
        toast.error('O modelo recusou esta solicitação.')
      }
    } catch (error) {
      const message =
        error instanceof Anthropic.AuthenticationError
          ? 'Chave inválida — confira em Configurações.'
          : error instanceof Anthropic.RateLimitError
            ? 'Limite de requisições atingido. Aguarde um instante.'
            : 'Falha ao falar com o Arquiteto. Tente de novo.'
      toast.error(message)
      // remove a resposta vazia que ficou pendurada
      setMessages((current) =>
        current[current.length - 1]?.role === 'assistant' &&
        current[current.length - 1]?.text === ''
          ? current.slice(0, -1)
          : current,
      )
    } finally {
      setBusy(false)
    }
  }

  if (profile && !profile.ai_api_key) {
    return (
      <HudPanel tone="violet" className="mx-auto max-w-2xl py-10 text-center">
        <Brain className="mx-auto size-10 text-violet" aria-hidden />
        <h2 className="mt-4 font-display text-xl font-bold tracking-wide text-ink">
          Evolução Chat IA
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-dim">
          Converse com o Arquiteto de verdade. Este é o único módulo com custo real: usa a SUA chave
          da API da Anthropic, cobrada por uso direto na sua conta.
        </p>
        <Button asChild className="mt-6">
          <Link to="/settings">Configurar chave</Link>
        </Button>
      </HudPanel>
    )
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8.5rem)] max-w-3xl flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-wide text-ink">
          <Eye className="size-5 text-violet" aria-hidden />
          Evolução Chat IA
        </h2>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          aria-label="Modelo"
          className="chamfer-sm h-9 border border-input bg-panel-2 px-3 text-xs text-ink outline-none focus-visible:border-neon"
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <HudPanel tone="violet" className="flex min-h-0 flex-1 flex-col p-0">
        <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="py-10 text-center">
              <p className="font-mono text-xs tracking-[0.3em] text-ink-dim">
                // o arquiteto observa
              </p>
              <p className="mx-auto mt-3 max-w-sm text-sm text-ink-dim">
                Peça um plano de missões para a semana, ajuda para manter o streak ou uma análise
                dos seus atributos.
              </p>
            </div>
          )}
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                'chamfer-sm max-w-[85%] whitespace-pre-wrap px-4 py-2.5 text-sm leading-relaxed',
                message.role === 'user'
                  ? 'ml-auto border border-neon/30 bg-neon/10 text-ink'
                  : 'border border-violet/25 bg-void/40 text-ink',
              )}
            >
              {message.text || (
                <span className="inline-block size-2 animate-pulse rounded-full bg-violet align-middle" />
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2 border-t border-border p-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void handleSend()
              }
            }}
            rows={2}
            placeholder="Fale com o Arquiteto… (Enter envia, Shift+Enter quebra linha)"
            aria-label="Mensagem para o Arquiteto"
            className="min-h-0"
          />
          <Button
            size="icon"
            disabled={busy || !input.trim()}
            onClick={() => void handleSend()}
            aria-label="Enviar"
          >
            <Send />
          </Button>
        </div>
      </HudPanel>

      <p className="text-center font-mono text-[10px] tracking-wider text-ink-dim">
        histórico só desta sessão // custo por uso na sua conta Anthropic
      </p>
    </div>
  )
}
