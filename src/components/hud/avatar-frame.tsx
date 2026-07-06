import type { Rank } from '@/features/gamification/engine/xp-curve'
import { cn } from '@/lib/utils'

interface AvatarFrameProps {
  rank: Rank
  src: string | null | undefined
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASSES = {
  sm: 'size-9',
  md: 'size-14',
  lg: 'size-24',
} as const

/**
 * Moldura evolutiva: quanto maior o rank, mais viva a moldura.
 * E: borda simples · D: neon fino · C: anel duplo · B: glow pulsante
 * A: gradiente violeta/magenta · S: gradiente girando + partículas.
 * Animações desligam via prefers-reduced-motion (classes CSS).
 */
export function AvatarFrame({ rank, src, name, size = 'md', className }: AvatarFrameProps) {
  const initial = (name || '?').charAt(0).toUpperCase()

  return (
    <div className={cn('relative shrink-0 rounded-full', SIZE_CLASSES[size], className)}>
      {/* camadas da moldura por rank */}
      {rank === 'E' && (
        <div aria-hidden className="absolute inset-0 rounded-full border border-ink-dim/40" />
      )}
      {rank === 'D' && (
        <div aria-hidden className="absolute inset-0 rounded-full border border-neon/70" />
      )}
      {(rank === 'C' || rank === 'B') && (
        <>
          <div aria-hidden className="absolute inset-0 rounded-full border border-neon" />
          <div aria-hidden className="absolute -inset-[3px] rounded-full border border-neon/25" />
        </>
      )}
      {rank === 'B' && (
        <div aria-hidden className="absolute inset-0 animate-pulse rounded-full shadow-glow-neon" />
      )}
      {rank === 'A' && (
        <div
          aria-hidden
          className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#8b5cf6,#ff2d95,#8b5cf6)] shadow-glow-violet"
        />
      )}
      {rank === 'S' && (
        <>
          <div
            aria-hidden
            className="animate-frame-spin absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#00f0ff,#8b5cf6,#ff2d95,#00f0ff)] shadow-glow-neon"
          />
          <div aria-hidden className="animate-frame-spin absolute -inset-[6px]">
            <span className="absolute left-1/2 top-0 size-1.5 -translate-x-1/2 rounded-full bg-neon shadow-glow-neon" />
          </div>
          <div
            aria-hidden
            className="animate-frame-spin absolute -inset-[6px]"
            style={{ animationDuration: '11s', animationDirection: 'reverse' }}
          >
            <span className="absolute left-1/2 top-full size-1 -translate-x-1/2 -translate-y-full rounded-full bg-magenta shadow-glow-magenta" />
          </div>
        </>
      )}

      {/* avatar por cima da moldura, com 3px de respiro para o anel */}
      {src ? (
        <img
          src={src}
          alt={name}
          referrerPolicy="no-referrer"
          className="absolute inset-[3px] rounded-full object-cover"
        />
      ) : (
        <div
          aria-hidden
          className="absolute inset-[3px] grid place-items-center rounded-full bg-panel-2 font-display font-semibold text-neon"
        >
          {initial}
        </div>
      )}
    </div>
  )
}
