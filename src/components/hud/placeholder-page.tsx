import { HudPanel } from '@/components/hud/hud-panel'
import { HudStat } from '@/components/hud/hud-stat'

interface PlaceholderPageProps {
  title: string
  description: string
  tone?: 'neon' | 'magenta' | 'violet' | 'dim'
}

export function PlaceholderPage({ title, description, tone = 'dim' }: PlaceholderPageProps) {
  return (
    <HudPanel tone={tone}>
      <h2 className="font-display text-lg font-semibold tracking-wide text-ink">{title}</h2>
      <p className="mt-1 text-sm text-ink-dim">{description}</p>
      <p className="mt-4">
        <HudStat label="STATUS" value="em construção" tone={tone === 'dim' ? 'neon' : tone} />
      </p>
    </HudPanel>
  )
}
