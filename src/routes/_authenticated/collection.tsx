import { useEffect, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  Brain,
  CalendarCheck,
  Cog,
  Crosshair,
  Crown,
  Eye,
  Flame,
  Gem,
  Gift,
  Heart,
  Lock,
  RefreshCcw,
  Rocket,
  Sparkles,
  Star,
  Sword,
  Zap,
  type LucideIcon,
} from 'lucide-react'

import { HudPanel } from '@/components/hud/hud-panel'
import { Button } from '@/components/ui/button'
import { RARITY_META, RARITY_ORDER, type Rarity } from '@/features/gamification/engine/collection'
import { useActivities } from '@/features/gamification/use-activities'
import {
  useActiveSpecialMission,
  useCollectionCatalog,
  useSyncSpecialMissions,
  useUserItems,
} from '@/features/gamification/use-collection'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authenticated/collection')({
  component: CollectionPage,
})

const ITEM_ICONS: Record<string, LucideIcon> = {
  rocket: Rocket,
  'calendar-check': CalendarCheck,
  crosshair: Crosshair,
  heart: Heart,
  zap: Zap,
  gem: Gem,
  sword: Sword,
  crown: Crown,
  cog: Cog,
  brain: Brain,
  flame: Flame,
  star: Star,
  eye: Eye,
  sparkles: Sparkles,
}

function CollectionPage() {
  const { user } = Route.useRouteContext()
  const catalog = useCollectionCatalog()
  const userItems = useUserItems(user.id)
  const activeMission = useActiveSpecialMission(user.id)
  const { data: activities } = useActivities(user.id)
  const syncMissions = useSyncSpecialMissions(user.id)

  // avalia/emite missão ao abrir a coleção (idempotente)
  const synced = useRef(false)
  useEffect(() => {
    if (!synced.current) {
      synced.current = true
      syncMissions.mutate()
    }
  }, [syncMissions])

  const unlockedCodes = new Set((userItems.data ?? []).map((i) => i.item_code))
  const items = [...(catalog.data ?? [])].sort(
    (a, b) =>
      RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity) ||
      a.code.localeCompare(b.code),
  )

  const mission = activeMission.data
  const missionItem = mission ? items.find((i) => i.code === mission.item_code) : null
  const missionProgress = mission
    ? (activities ?? []).filter(
        (a) =>
          a.type !== 'trello_checkitem_done' &&
          a.created_at >= mission.created_at &&
          a.created_at <= mission.expires_at,
      ).length
    : 0
  // instante capturado na montagem (regra de pureza do render); o botão
  // "Verificar progresso" refaz a conta via refetch de qualquer forma
  const [renderedAt] = useState(() => Date.now())
  const hoursLeft = mission
    ? Math.max(0, Math.round((new Date(mission.expires_at).getTime() - renderedAt) / 3_600_000))
    : 0

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-wide text-ink">
        <Gift className="size-5 text-magenta" aria-hidden />
        Itens de Recompensa
      </h2>

      {/* como desbloquear */}
      <HudPanel size="sm" tone="magenta">
        <p className="font-display text-xs font-semibold tracking-widest text-magenta uppercase">
          Como desbloquear itens
        </p>
        <ul className="mt-2 space-y-1 text-sm text-ink-dim">
          <li>
            <span className="text-ink">Missões Especiais do Arquiteto:</span> o sistema te desafia
            com um item por vez — conclua missões e cards dentro do prazo para forjá-lo.
          </li>
          <li>
            <span className="text-ink">Raridade:</span> quanto mais raro, maior a meta e o prazo — e
            maior o XP bônus ao forjar.
          </li>
          <li>
            <span className="text-ink">Permanente:</span> item forjado é seu para sempre.
          </li>
        </ul>
      </HudPanel>

      {/* missão especial ativa */}
      {mission && missionItem && (
        <HudPanel tone="violet" glow>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-mono text-[10px] tracking-[0.25em] text-violet uppercase">
                Missão especial ativa
              </p>
              <p className="mt-1 font-display text-lg font-bold text-ink">
                Forjar: {missionItem.name}
              </p>
              <p className="mt-0.5 text-sm text-ink-dim">
                Conclua <span className="text-ink">{mission.goal_count} missões ou cards</span>{' '}
                antes do prazo.
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-2xl font-bold text-neon">
                {Math.min(missionProgress, mission.goal_count)}/{mission.goal_count}
              </p>
              <p className="font-mono text-[10px] tracking-wider text-ink-dim">
                {hoursLeft}h restantes
              </p>
            </div>
          </div>
          <div className="mt-3 h-1.5 bg-ink-dim/15">
            <div
              className="h-full bg-neon shadow-glow-neon transition-all"
              style={{
                width: `${Math.min(100, (missionProgress / mission.goal_count) * 100)}%`,
              }}
            />
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              disabled={syncMissions.isPending}
              onClick={() => syncMissions.mutate()}
            >
              <RefreshCcw /> Verificar progresso
            </Button>
          </div>
        </HudPanel>
      )}

      {/* resumo por raridade */}
      <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">
        {RARITY_ORDER.map((rarity) => {
          const meta = RARITY_META[rarity]
          const total = items.filter((i) => i.rarity === rarity).length
          const unlocked = items.filter(
            (i) => i.rarity === rarity && unlockedCodes.has(i.code),
          ).length
          return (
            <div
              key={rarity}
              className="chamfer-sm border bg-void/30 px-3 py-2"
              style={{ borderColor: `${meta.hex}66` }}
            >
              <p className="flex items-center gap-1.5 text-xs font-medium text-ink">
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ backgroundColor: meta.hex }}
                />
                {meta.label}
              </p>
              <p className="mt-0.5 font-display text-lg font-bold text-ink">
                {unlocked}/{total}
              </p>
            </div>
          )
        })}
      </div>

      {/* galeria */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => {
          const meta = RARITY_META[item.rarity as Rarity]
          const isUnlocked = unlockedCodes.has(item.code)
          const Icon = ITEM_ICONS[item.icon] ?? Gift
          return (
            <div
              key={item.code}
              className={cn(
                'chamfer-sm border bg-panel p-4 transition-all',
                isUnlocked ? 'hover:-translate-y-0.5' : 'opacity-60',
              )}
              style={{
                borderColor: isUnlocked ? meta.hex : 'rgba(121, 128, 159, 0.25)',
                boxShadow: isUnlocked ? `0 0 12px ${meta.hex}40` : undefined,
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div
                  className="chamfer-sm grid size-12 place-items-center"
                  style={{
                    backgroundColor: isUnlocked ? `${meta.hex}1f` : 'rgba(121,128,159,0.1)',
                    color: isUnlocked ? meta.hex : '#79809f',
                  }}
                >
                  {isUnlocked ? (
                    <Icon className="size-6" aria-hidden />
                  ) : (
                    <Lock className="size-5" aria-hidden />
                  )}
                </div>
                <span
                  className="chamfer-sm border px-2 py-0.5 font-mono text-[10px] tracking-wider"
                  style={{ borderColor: `${meta.hex}66`, color: meta.hex }}
                >
                  {meta.label}
                </span>
              </div>
              <p
                className={cn(
                  'mt-3 font-display text-sm font-semibold tracking-wide',
                  isUnlocked ? 'text-ink' : 'text-ink-dim',
                )}
              >
                {isUnlocked ? item.name : '???'}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink-dim">
                {isUnlocked ? item.description : 'Complete a missão especial para forjar.'}
              </p>
              <p className="mt-2 font-mono text-[10px] text-ink-dim">
                {isUnlocked ? (
                  <span style={{ color: meta.hex }}>// forjado · +{item.xp_reward} XP</span>
                ) : (
                  `meta: ${meta.goal} conclusões em ${meta.hours}h · +${meta.xpReward} XP`
                )}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
