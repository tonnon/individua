import { useEffect, useRef } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'

import { useConnectTrello } from '@/features/trello/use-trello'

export const Route = createFileRoute('/_authenticated/trello-callback')({
  component: TrelloCallbackPage,
})

/**
 * Retorno do fluxo de autorização do Trello: o token vem no fragment
 * da URL (#token=...), nunca passa pelo servidor. Salvamos no profile
 * (RLS) e limpamos a URL ao navegar.
 */
function TrelloCallbackPage() {
  const { user } = Route.useRouteContext()
  const navigate = useNavigate()
  const connectTrello = useConnectTrello(user.id)
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const token = fragment.get('token')

    if (!token) {
      toast.error('Autorização cancelada ou token ausente. Tente conectar de novo.')
      void navigate({ to: '/boards', replace: true })
      return
    }

    // mutateAsync (e não mutate + callbacks): no StrictMode do dev o
    // React desmonta/remonta o componente e os callbacks do mutate()
    // são descartados na desmontagem — o navigate nunca dispararia.
    // A continuação da promise roda independente da montagem.
    connectTrello
      .mutateAsync(token)
      .then((me) => {
        toast.success(`Trello conectado como @${me.username}.`)
        return navigate({ to: '/boards', replace: true })
      })
      .catch(() => {
        toast.error('Não foi possível validar o token do Trello. Tente de novo.')
        return navigate({ to: '/boards', replace: true })
      })
  }, [connectTrello, navigate])

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p className="font-mono text-sm tracking-[0.25em] text-ink-dim">
        <span className="mr-3 inline-block size-2 animate-pulse rounded-full bg-neon align-middle" />
        // conectando ao Trello
      </p>
    </div>
  )
}
