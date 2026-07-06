import { cn } from '@/lib/utils'

interface HudXpBarProps {
  /** 0–1 */
  progress: number
  segments?: number
  className?: string
  'aria-label'?: string
}

/** Barra de XP segmentada estilo HUD; o segmento da frente pulsa. */
export function HudXpBar({
  progress,
  segments = 20,
  className,
  'aria-label': ariaLabel,
}: HudXpBarProps) {
  const clamped = Math.min(Math.max(progress, 0), 1)
  const filled = Math.round(clamped * segments)

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel ?? 'Progresso de XP'}
      className={cn('flex h-2 gap-[3px]', className)}
    >
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          className={cn(
            'flex-1 -skew-x-12',
            i < filled ? 'bg-neon' : 'bg-ink-dim/15',
            i === filled - 1 && 'animate-pulse shadow-glow-neon',
          )}
        />
      ))}
    </div>
  )
}
