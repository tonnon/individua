import { useState } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { Flame, Trophy, Zap } from 'lucide-react'
import { toast } from 'sonner'

import { HudStat } from '@/components/hud/hud-stat'
import { Button } from '@/components/ui/button'
import { getSession, signInWithGoogle } from '@/features/auth/api'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const session = await getSession()
    if (session) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const [entrando, setEntrando] = useState(false)

  const handleGoogleLogin = async () => {
    setEntrando(true)
    try {
      await signInWithGoogle()
      // o browser navega para o Google; nada mais a fazer aqui
    } catch {
      toast.error('Não foi possível iniciar o login. Verifique a conexão e tente de novo.')
      setEntrando(false)
    }
  }

  return (
    <div className="dot-matrix relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-6">
      {/* glow ambiente atrás do hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 size-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet/10 blur-[120px]"
      />

      <main className="relative z-10 flex max-w-2xl flex-col items-center text-center">
        <p className="mb-6 font-mono text-xs tracking-[0.3em] text-ink-dim">// sistema online</p>

        <h1 className="glitch-hover font-display text-5xl font-bold tracking-widest text-ink md:text-7xl">
          INDIVIDUA
        </h1>

        <p className="mt-6 max-w-xl text-balance text-lg text-ink-dim">
          Seus cards do Trello viram missões. Conclua tarefas, ganhe XP, suba de nível e mantenha
          seu streak vivo — produtividade com cara de jogo.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          <span className="flex items-center gap-2">
            <Zap className="size-4 text-neon" aria-hidden />
            <HudStat label="XP" value="por card" />
          </span>
          <span className="flex items-center gap-2">
            <Flame className="size-4 text-magenta" aria-hidden />
            <HudStat label="STREAK" value="diário" tone="magenta" />
          </span>
          <span className="flex items-center gap-2">
            <Trophy className="size-4 text-violet" aria-hidden />
            <HudStat label="CONQUISTAS" value="12+" tone="violet" />
          </span>
        </div>

        <Button
          size="lg"
          className="mt-10"
          disabled={entrando}
          onClick={() => void handleGoogleLogin()}
        >
          <GoogleIcon />
          {entrando ? 'Abrindo o Google…' : 'Entrar com Google'}
        </Button>

        <p className="mt-4 font-mono text-xs text-ink-dim">
          grátis // sem cartão // seus dados são seus
        </p>
      </main>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden fill="currentColor">
      <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z" />
    </svg>
  )
}
