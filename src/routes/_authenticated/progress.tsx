import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { TrendingUp } from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { HudPanel } from '@/components/hud/hud-panel'
import { Button } from '@/components/ui/button'
import { useProfile } from '@/features/auth/use-profile'
import { dailyXpSeries } from '@/features/gamification/engine/stats'
import { todayStats, useActivities } from '@/features/gamification/use-activities'

export const Route = createFileRoute('/_authenticated/progress')({
  component: ProgressPage,
})

const NEON = '#00f0ff'
const INK_DIM = '#79809f'
const GRID = 'rgba(230, 241, 255, 0.06)'

function ProgressPage() {
  const { user } = Route.useRouteContext()
  const { data: profile } = useProfile(user.id)
  const { data: activities } = useActivities(user.id)
  const [showTable, setShowTable] = useState(false)

  const series = useMemo(() => dailyXpSeries(activities ?? [], 7), [activities])
  const stats = todayStats(activities ?? [])
  const weekXp = series.reduce((sum, p) => sum + p.xp, 0)

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-wide text-ink">
        <TrendingUp className="size-5 text-neon" aria-hidden />
        Progresso
      </h2>

      {/* tiles: o resumo antes do detalhe */}
      <div className="grid gap-3 sm:grid-cols-4">
        <HudPanel size="sm" tone="neon">
          <p className="font-mono text-[10px] tracking-[0.2em] text-ink-dim uppercase">
            XP de hoje
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-neon">{stats.xpToday}</p>
          <p className="font-mono text-[10px] text-ink-dim">tempo real</p>
        </HudPanel>
        <HudPanel size="sm">
          <p className="font-mono text-[10px] tracking-[0.2em] text-ink-dim uppercase">
            Completas hoje
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-ink">{stats.completedToday}</p>
        </HudPanel>
        <HudPanel size="sm">
          <p className="font-mono text-[10px] tracking-[0.2em] text-ink-dim uppercase">
            XP na semana
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-ink">{weekXp}</p>
        </HudPanel>
        <HudPanel size="sm" tone="violet">
          <p className="font-mono text-[10px] tracking-[0.2em] text-ink-dim uppercase">XP total</p>
          <p className="mt-1 font-display text-2xl font-bold text-violet">{profile?.xp ?? 0}</p>
        </HudPanel>
      </div>

      {/* atividade semanal */}
      <HudPanel tone="neon">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-sm font-semibold tracking-widest text-neon uppercase">
            Atividade semanal — XP por dia
          </h3>
          <Button variant="ghost" size="sm" onClick={() => setShowTable((v) => !v)}>
            {showTable ? 'Ver gráfico' : 'Ver tabela'}
          </Button>
        </div>

        {showTable ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left font-mono text-[10px] tracking-widest text-ink-dim uppercase">
                  <th className="py-2 font-medium">Dia</th>
                  <th className="py-2 text-right font-medium">Conclusões</th>
                  <th className="py-2 text-right font-medium">XP</th>
                </tr>
              </thead>
              <tbody>
                {series.map((point) => (
                  <tr key={point.date} className="border-b border-border/50">
                    <td className="py-2 font-mono text-xs text-ink">{point.label}</td>
                    <td className="py-2 text-right font-mono text-xs text-ink-dim">
                      {point.count}
                    </td>
                    <td className="py-2 text-right font-mono text-xs text-neon">{point.xp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
                <defs>
                  <linearGradient id="xp-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={NEON} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={NEON} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke={INK_DIM}
                  tickLine={false}
                  axisLine={{ stroke: GRID }}
                  tick={{ fontSize: 10, fontFamily: 'JetBrains Mono Variable', fill: INK_DIM }}
                />
                <YAxis
                  stroke={INK_DIM}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tick={{ fontSize: 10, fontFamily: 'JetBrains Mono Variable', fill: INK_DIM }}
                  allowDecimals={false}
                />
                <Tooltip
                  content={ChartTooltip}
                  cursor={{ stroke: 'rgba(0, 240, 255, 0.25)', strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey="xp"
                  stroke={NEON}
                  strokeWidth={2}
                  fill="url(#xp-fill)"
                  dot={{ r: 3, fill: NEON, strokeWidth: 0 }}
                  activeDot={{
                    r: 5,
                    fill: NEON,
                    stroke: '#0d0e1a',
                    strokeWidth: 2,
                  }}
                  style={{ filter: 'drop-shadow(0 0 6px rgba(0, 240, 255, 0.45))' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </HudPanel>
    </div>
  )
}

interface ChartTooltipProps {
  active?: boolean
  label?: unknown
  payload?: ReadonlyArray<{ value?: unknown; payload?: unknown }>
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  const point = payload?.[0]
  if (!active || !point) return null
  const count = (point.payload as { count?: number } | undefined)?.count ?? 0
  return (
    <div className="chamfer-sm border border-neon/30 bg-panel-2 px-3 py-2 shadow-glow-neon">
      <p className="font-mono text-[10px] tracking-widest text-ink-dim">{String(label)}</p>
      <p className="font-mono text-sm text-neon">{String(point.value)} XP</p>
      <p className="font-mono text-[10px] text-ink-dim">
        {count} {count === 1 ? 'conclusão' : 'conclusões'}
      </p>
    </div>
  )
}
