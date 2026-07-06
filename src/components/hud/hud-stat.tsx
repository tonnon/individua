import { cn } from '@/lib/utils'

interface HudStatProps {
  /** rótulo em mono, ex.: "LVL" ou "XP" */
  label: string
  /** valor formatado, ex.: "07" ou "1.240" */
  value: string
  tone?: 'neon' | 'magenta' | 'violet' | 'ink'
  className?: string
}

const toneClasses = {
  neon: 'text-neon',
  magenta: 'text-magenta',
  violet: 'text-violet',
  ink: 'text-ink',
} as const

/** Stat em mono com decoração de HUD: `XP // 1.240` */
export function HudStat({ label, value, tone = 'neon', className }: HudStatProps) {
  return (
    <span className={cn('font-mono text-sm tracking-wider', className)}>
      <span className="text-ink-dim">{label} // </span>
      <span className={toneClasses[tone]}>{value}</span>
    </span>
  )
}

/** Stat entre colchetes: `[ LVL 07 ]` */
export function HudTag({ label, value, tone = 'neon', className }: HudStatProps) {
  return (
    <span className={cn('font-mono text-sm tracking-wider', className)}>
      <span className="text-ink-dim">[ </span>
      <span className={toneClasses[tone]}>
        {label} {value}
      </span>
      <span className="text-ink-dim"> ]</span>
    </span>
  )
}
