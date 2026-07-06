import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'

import { HudPanel } from '@/components/hud/hud-panel'
import { Button } from '@/components/ui/button'
import { isoDate } from '@/features/gamification/engine/architect'
import { useActivities } from '@/features/gamification/use-activities'
import { useMissions } from '@/features/gamification/use-missions'
import type { ActivityRow, MissionRow } from '@/lib/database.types'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authenticated/calendar')({
  component: CalendarPage,
})

type ViewMode = 'day' | 'week' | 'month'

const VIEW_LABELS: Record<ViewMode, string> = {
  day: 'Dia',
  week: 'Semana',
  month: 'Mês',
}

const WEEKDAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']

interface DayData {
  activities: ActivityRow[]
  dueMissions: MissionRow[]
  xp: number
}

const EMPTY_DAY: DayData = { activities: [], dueMissions: [], xp: 0 }

function CalendarPage() {
  const { user } = Route.useRouteContext()
  const { data: activities } = useActivities(user.id)
  const { data: missions } = useMissions(user.id)

  const [view, setView] = useState<ViewMode>('month')
  const [cursor, setCursor] = useState(() => new Date())
  const today = new Date()

  // índice por dia (UTC — mesmo referencial de occurred_on/streak)
  const byDay = useMemo(() => {
    const map = new Map<string, DayData>()
    const ensure = (key: string) => {
      const existing = map.get(key)
      if (existing) return existing
      const fresh: DayData = { activities: [], dueMissions: [], xp: 0 }
      map.set(key, fresh)
      return fresh
    }
    for (const activity of activities ?? []) {
      const day = ensure(activity.occurred_on)
      day.activities.push(activity)
      day.xp += activity.xp_awarded
    }
    for (const mission of missions ?? []) {
      if (!mission.due_at) continue
      ensure(mission.due_at.slice(0, 10)).dueMissions.push(mission)
    }
    return map
  }, [activities, missions])

  const dayData = (date: Date): DayData => byDay.get(isoDate(date)) ?? EMPTY_DAY

  const navigate = (direction: -1 | 1) => {
    if (view === 'month') setCursor((c) => addMonths(c, direction))
    else if (view === 'week') setCursor((c) => addWeeks(c, direction))
    else setCursor((c) => addDays(c, direction))
  }

  const title =
    view === 'month'
      ? format(cursor, 'MMMM yyyy', { locale: ptBR })
      : view === 'week'
        ? `${format(startOfWeek(cursor), 'dd MMM', { locale: ptBR })} — ${format(endOfWeek(cursor), 'dd MMM', { locale: ptBR })}`
        : format(cursor, "EEEE, dd 'de' MMMM", { locale: ptBR })

  return (
    <div className="space-y-4">
      {/* header: visão + período + navegação */}
      <HudPanel size="sm">
        <div className="flex flex-wrap items-center gap-3">
          <div role="tablist" aria-label="Visão do calendário" className="flex gap-1">
            {(Object.keys(VIEW_LABELS) as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={view === mode}
                onClick={() => setView(mode)}
                className={cn(
                  'chamfer-sm px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-wider transition-colors',
                  view === mode
                    ? 'bg-neon text-[#051014] shadow-glow-neon'
                    : 'text-ink-dim hover:bg-accent hover:text-ink',
                )}
              >
                {VIEW_LABELS[mode]}
              </button>
            ))}
          </div>

          <h2 className="font-display text-lg font-semibold capitalize tracking-wide text-ink">
            {title}
          </h2>

          <div className="ml-auto flex items-center gap-2">
            <span className="chamfer-sm hidden border border-neon/35 px-2.5 py-1 font-mono text-[10px] tracking-wider text-neon sm:inline">
              HOJE: {format(today, 'dd/MM')}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Período anterior"
              onClick={() => navigate(-1)}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Ir para hoje"
              onClick={() => setCursor(new Date())}
            >
              <CalendarDays />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Próximo período"
              onClick={() => navigate(1)}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      </HudPanel>

      {view === 'month' && (
        <MonthView
          cursor={cursor}
          today={today}
          dayData={dayData}
          onSelectDay={(date) => {
            setCursor(date)
            setView('day')
          }}
        />
      )}
      {view === 'week' && <WeekView cursor={cursor} today={today} dayData={dayData} />}
      {view === 'day' && <DayView cursor={cursor} dayData={dayData} />}
    </div>
  )
}

// ————— mês —————

function MonthView({
  cursor,
  today,
  dayData,
  onSelectDay,
}: {
  cursor: Date
  today: Date
  dayData: (date: Date) => DayData
  onSelectDay: (date: Date) => void
}) {
  const start = startOfWeek(startOfMonth(cursor))
  const end = endOfWeek(endOfMonth(cursor))
  const days: Date[] = []
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d)

  return (
    <HudPanel className="p-0">
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS.map((weekday) => (
          <p
            key={weekday}
            className="py-2 text-center font-display text-[10px] font-semibold tracking-[0.2em] text-ink-dim"
          >
            {weekday}
          </p>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((date) => {
          const data = dayData(date)
          const inMonth = isSameMonth(date, cursor)
          const isToday = isSameDay(date, today)
          const done = data.activities.length
          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => onSelectDay(date)}
              aria-label={`${format(date, "dd 'de' MMMM", { locale: ptBR })}: ${done} conclusões, ${data.dueMissions.length} prazos`}
              className={cn(
                'min-h-20 border-b border-r border-border/50 p-1.5 text-left align-top transition-colors hover:bg-accent',
                !inMonth && 'opacity-35',
                isToday && 'bg-neon/5',
              )}
            >
              <span
                className={cn(
                  'font-mono text-xs',
                  isToday ? 'font-bold text-neon' : 'text-ink-dim',
                )}
              >
                {format(date, 'd')}
              </span>
              {done > 0 && (
                <div className="mt-1.5">
                  <div className="h-1 w-full bg-neon shadow-glow-neon" />
                  <p className="mt-0.5 font-mono text-[9px] text-neon">
                    {done}✓ · {data.xp} XP
                  </p>
                </div>
              )}
              {data.dueMissions.length > 0 && (
                <p className="mt-0.5 font-mono text-[9px] text-magenta">
                  ◆ {data.dueMissions.length} {data.dueMissions.length === 1 ? 'prazo' : 'prazos'}
                </p>
              )}
            </button>
          )
        })}
      </div>
    </HudPanel>
  )
}

// ————— semana —————

function WeekView({
  cursor,
  today,
  dayData,
}: {
  cursor: Date
  today: Date
  dayData: (date: Date) => DayData
}) {
  const start = startOfWeek(cursor)
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))

  return (
    <div className="grid gap-2 md:grid-cols-7">
      {days.map((date) => {
        const data = dayData(date)
        const isToday = isSameDay(date, today)
        return (
          <HudPanel
            key={date.toISOString()}
            size="sm"
            tone={isToday ? 'neon' : 'dim'}
            className="p-2.5"
          >
            <p
              className={cn(
                'font-display text-[10px] font-semibold tracking-[0.15em] uppercase',
                isToday ? 'text-neon' : 'text-ink-dim',
              )}
            >
              {format(date, 'EEE dd', { locale: ptBR })}
            </p>
            <div className="mt-2 space-y-1">
              {data.activities.slice(0, 5).map((activity) => (
                <p
                  key={activity.id}
                  className="truncate text-[11px] text-ink"
                  title={activity.card_name}
                >
                  <span className="text-neon">+{activity.xp_awarded}</span> {activity.card_name}
                </p>
              ))}
              {data.activities.length > 5 && (
                <p className="font-mono text-[9px] text-ink-dim">
                  +{data.activities.length - 5} conclusões
                </p>
              )}
              {data.dueMissions.map((mission) => (
                <p
                  key={mission.id}
                  className="truncate text-[11px] text-magenta"
                  title={mission.title}
                >
                  ◆ {mission.title}
                </p>
              ))}
              {data.activities.length === 0 && data.dueMissions.length === 0 && (
                <p className="font-mono text-[9px] text-ink-dim">—</p>
              )}
            </div>
          </HudPanel>
        )
      })}
    </div>
  )
}

// ————— dia —————

function DayView({ cursor, dayData }: { cursor: Date; dayData: (date: Date) => DayData }) {
  const data = dayData(cursor)

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <HudPanel tone="neon">
        <h3 className="font-display text-sm font-semibold tracking-widest text-neon uppercase">
          Concluídas — {data.xp} XP
        </h3>
        <div className="mt-3 space-y-1.5">
          {data.activities.map((activity) => (
            <div
              key={activity.id}
              className="chamfer-sm flex items-baseline justify-between gap-3 border border-border bg-void/30 px-3 py-2"
            >
              <span className="min-w-0 truncate text-sm text-ink">{activity.card_name}</span>
              <span className="shrink-0 font-mono text-xs text-neon">
                +{activity.xp_awarded} XP
              </span>
            </div>
          ))}
          {data.activities.length === 0 && (
            <p className="font-mono text-[10px] text-ink-dim">// nada concluído neste dia</p>
          )}
        </div>
      </HudPanel>

      <HudPanel tone="magenta">
        <h3 className="font-display text-sm font-semibold tracking-widest text-magenta uppercase">
          Prazos do dia
        </h3>
        <div className="mt-3 space-y-1.5">
          {data.dueMissions.map((mission) => (
            <div
              key={mission.id}
              className="chamfer-sm flex items-baseline justify-between gap-3 border border-magenta/25 bg-void/30 px-3 py-2"
            >
              <span className="min-w-0 truncate text-sm text-ink">{mission.title}</span>
              <span className="shrink-0 font-mono text-xs text-magenta">
                {mission.due_at ? format(new Date(mission.due_at), 'HH:mm') : ''}
              </span>
            </div>
          ))}
          {data.dueMissions.length === 0 && (
            <p className="font-mono text-[10px] text-ink-dim">// sem prazos neste dia</p>
          )}
        </div>
      </HudPanel>
    </div>
  )
}
