import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'

import { getSession } from '@/features/auth/api'

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallbackPage,
})

/**
 * Destino do redirect OAuth. `getSession()` aguarda o client
 * trocar o `code` PKCE da URL pela sessão; daí seguimos.
 */
function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    void getSession().then((session) => {
      if (!active) return
      if (session) {
        void navigate({ to: '/dashboard', replace: true })
      } else {
        toast.error('Não foi possível entrar. Tente de novo.')
        void navigate({ to: '/login', replace: true })
      }
    })
    return () => {
      active = false
    }
  }, [navigate])

  return (
    <div className="flex min-h-svh items-center justify-center">
      <p className="font-mono text-sm tracking-[0.25em] text-ink-dim">
        <span className="mr-3 inline-block size-2 animate-pulse rounded-full bg-neon align-middle" />
        // autenticando
      </p>
    </div>
  )
}
