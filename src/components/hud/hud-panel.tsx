import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface HudPanelProps {
  children: ReactNode
  className?: string
  /** cor da borda neon */
  tone?: 'neon' | 'magenta' | 'violet' | 'dim'
  /** glow sutil na borda */
  glow?: boolean
  /** chanfro menor para elementos compactos */
  size?: 'md' | 'sm'
}

const toneClasses = {
  neon: 'bg-neon/25',
  magenta: 'bg-magenta/25',
  violet: 'bg-violet/25',
  dim: 'bg-ink-dim/20',
} as const

const glowClasses = {
  neon: 'shadow-glow-neon',
  magenta: 'shadow-glow-magenta',
  violet: 'shadow-glow-violet',
  dim: '',
} as const

/**
 * Painel com canto chanfrado e borda neon de 1px.
 * clip-path corta bordas CSS normais, então a "borda" é o
 * wrapper externo (1px de padding) visível atrás do miolo.
 */
export function HudPanel({
  children,
  className,
  tone = 'dim',
  glow = false,
  size = 'md',
}: HudPanelProps) {
  const chamferClass = size === 'md' ? 'chamfer' : 'chamfer-sm'
  return (
    <div className={cn(chamferClass, 'p-px', toneClasses[tone], glow && glowClasses[tone])}>
      <div className={cn(chamferClass, 'bg-panel p-5', className)}>{children}</div>
    </div>
  )
}
