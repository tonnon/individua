import {
  Ban,
  Bell,
  Bot,
  Brain,
  Calendar,
  CircleQuestionMark,
  CircleUserRound,
  Coins,
  Gamepad2,
  Gem,
  Gift,
  GitBranch,
  LayoutDashboard,
  LayoutGrid,
  LifeBuoy,
  ListChecks,
  Radar,
  Settings,
  Sparkles,
  SquareKanban,
  Swords,
  TrendingUp,
  TriangleAlert,
  Trophy,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export interface NavSection {
  label: string
  items: NavItem[]
}

export const navSections: NavSection[] = [
  {
    label: 'Sistema',
    items: [
      { to: '/dashboard', label: 'Painel', icon: LayoutDashboard },
      { to: '/calendar', label: 'Calendário', icon: Calendar },
      { to: '/missions', label: 'Missões', icon: ListChecks },
      { to: '/progress', label: 'Progresso', icon: TrendingUp },
      { to: '/attributes', label: 'Atributos', icon: Radar },
      { to: '/virtues', label: 'Virtudes', icon: Gem },
      { to: '/skill-tree', label: 'Árvore de Evolução', icon: GitBranch },
      { to: '/achievements', label: 'Conquistas', icon: Trophy },
      { to: '/store', label: 'Loja do Tempo', icon: Coins },
      { to: '/collection', label: 'Itens de Recompensa', icon: Gift },
      { to: '/arena', label: 'Arena Global', icon: Swords },
      { to: '/architect', label: 'Arquiteto', icon: Bot },
      { to: '/ai-chat', label: 'Evolução Chat IA', icon: Brain },
    ],
  },
  {
    // itens de navegação já com espaço reservado na sidebar; ganham
    // funcionalidade real em fases futuras (ver roadmap no README)
    label: 'Em breve',
    items: [
      { to: '/avatars', label: 'Avatares', icon: CircleUserRound },
      { to: '/priority-matrix', label: 'Matriz de Prioridades', icon: LayoutGrid },
      { to: '/whats-new', label: 'Novidades', icon: Sparkles },
      { to: '/how-it-works', label: 'Como Usar', icon: CircleQuestionMark },
      { to: '/minigame', label: 'Minigame', icon: Gamepad2 },
      { to: '/reminders', label: 'Lembretes', icon: Bell },
      { to: '/habits', label: 'Libertar Vícios', icon: Ban },
      { to: '/support', label: 'Suporte e Instalação', icon: LifeBuoy },
      { to: '/failure-zone', label: 'Zona de Falha', icon: TriangleAlert },
      { to: '/finance', label: 'Finanças', icon: Wallet },
    ],
  },
  {
    label: 'Conta',
    items: [
      { to: '/boards', label: 'Integrações', icon: SquareKanban },
      { to: '/settings', label: 'Configurações', icon: Settings },
    ],
  },
]

export const navItems: NavItem[] = navSections.flatMap((section) => section.items)
