import { useEffect, useMemo } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Trophy } from 'lucide-react'

import { useCelebrationStore } from '@/features/gamification/celebration-store'

const PARTICLE_COLORS = ['#00f0ff', '#ff2d95', '#8b5cf6']
const PARTICLE_COUNT = 18

/**
 * Overlay de celebração (level up / conquista): burst de partículas
 * neon + glitch de 300ms — os únicos momentos em que o glitch toca a
 * UI. Com prefers-reduced-motion vira um painel estático breve.
 */
export function CelebrationLayer() {
  const current = useCelebrationStore((s) => s.queue[0])
  const dismiss = useCelebrationStore((s) => s.dismiss)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (!current) return
    const timer = window.setTimeout(dismiss, reducedMotion ? 1400 : 2000)
    return () => window.clearTimeout(timer)
  }, [current, dismiss, reducedMotion])

  const particles = useMemo(() => {
    if (!current) return []
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const angle = (i / PARTICLE_COUNT) * Math.PI * 2
      const distance = 90 + ((i * 37) % 70)
      return {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
        size: 3 + ((i * 13) % 4),
      }
    })
  }, [current])

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.id}
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-0 z-[90] grid place-items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* escurece levemente o fundo */}
          <div aria-hidden className="absolute inset-0 bg-void/60 backdrop-blur-[2px]" />

          {/* burst de partículas */}
          {!reducedMotion &&
            particles.map((p, i) => (
              <motion.span
                aria-hidden
                key={i}
                className="absolute rounded-full"
                style={{
                  width: p.size,
                  height: p.size,
                  backgroundColor: p.color,
                  boxShadow: `0 0 8px ${p.color}`,
                }}
                initial={{ x: 0, y: 0, opacity: 1 }}
                animate={{ x: p.x, y: p.y, opacity: 0 }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
              />
            ))}

          <motion.div
            className="relative text-center"
            initial={reducedMotion ? { opacity: 0 } : { scale: 0.7, opacity: 0 }}
            animate={reducedMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          >
            {current.type === 'levelup' ? (
              <>
                <p className="font-mono text-xs tracking-[0.4em] text-ink-dim">// LEVEL UP</p>
                <p
                  className={
                    'mt-2 font-display text-6xl font-bold tracking-widest text-neon ' +
                    (reducedMotion ? '' : 'glitch-once')
                  }
                >
                  {String(current.level).padStart(2, '0')}
                </p>
                <p className="mt-2 font-display text-lg font-semibold uppercase tracking-widest text-ink">
                  {current.title}
                </p>
              </>
            ) : (
              <>
                <Trophy
                  aria-hidden
                  className="mx-auto size-10 text-magenta drop-shadow-[0_0_12px_rgba(255,45,149,0.6)]"
                />
                <p className="mt-3 font-mono text-xs tracking-[0.4em] text-ink-dim">
                  // CONQUISTA DESBLOQUEADA
                </p>
                <p
                  className={
                    'mt-2 font-display text-3xl font-bold tracking-widest text-magenta ' +
                    (reducedMotion ? '' : 'glitch-once')
                  }
                >
                  {current.name}
                </p>
                {current.xpReward > 0 && (
                  <p className="mt-2 font-mono text-sm text-neon">+{current.xpReward} XP</p>
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
