import type { QueryClient } from '@tanstack/react-query'
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { Toaster } from 'sonner'

import { useUiStore } from '@/stores/ui'

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
})

function RootLayout() {
  const scanlines = useUiStore((s) => s.scanlines)

  return (
    <>
      <Outlet />
      <div aria-hidden className="grain-overlay" />
      {scanlines && <div aria-hidden className="scanlines-overlay" />}
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--color-panel-2)',
            border: '1px solid var(--border)',
            color: 'var(--color-ink)',
          },
        }}
      />
    </>
  )
}
