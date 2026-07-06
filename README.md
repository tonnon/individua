# ⚡ Individua

Um sistema de vida gamificado: cada missão concluída (manual ou importada do Trello) vira XP,
sobe seus atributos (virtudes), sobe seu rank e enche seu cofre de moedas — trocáveis por
recompensas que você mesmo define na Loja do Tempo. Suba de nível, desbloqueie conquistas,
colecione itens raros e mantenha seu streak diário, tudo com custo de infraestrutura **zero**
(free tier de ponta a ponta). O Trello é uma fonte de missões entre várias, não o centro do
produto.

## Destaques

- **Missões e atributos** — conclua missões manuais ou sincronizadas do Trello e veja os 6
  atributos de status (Força, Vitalidade, Foco, Carisma, Disciplina, Sabedoria) crescerem em
  tempo real, com rank e curva de XP calculados por um motor puro e testado (Vitest).
- **Board view** — um espelho do board do Trello dentro do app: colunas, drag-and-drop, criação
  e edição de cards, badge de XP e conclusão instantânea ao arrastar para "Concluído".
- **Loja do Tempo** — troque as moedas ganhas por recompensas que você mesmo cadastra.
- **Itens de Recompensa** — coleção de itens com raridades (Comum → Mítico), desbloqueados por
  missões especiais com prazo geradas pelo Arquiteto.
- **Virtudes e Árvore de Evolução** — traços de caráter desbloqueados por marcos de nível e um
  caminho vertical de progressão com títulos, do "Despertar" à "Transcendência".
- **Arquiteto IA** — insights determinísticos sobre seu progresso e, opcionalmente, um chat real
  com streaming via SDK da Anthropic.
- **Arena Global** — leaderboard público com opt-out, sem vazar dados sensíveis.
- **Calendário e Progresso** — visão dia/semana/mês das atividades concluídas e gráfico de
  atividade semanal.
- **Trello em tempo real** — webhook opcional que credita XP mesmo com o app fechado, com
  re-verificação anti-forja de cada ação.
- **PWA instalável** — funciona como app nativo no desktop/mobile.

## Stack

| Camada          | Tecnologia                                                           |
| --------------- | ---------------------------------------------------------------------- |
| Frontend        | React 19 · Vite 8 · TypeScript (strict) · TailwindCSS v4 · shadcn/ui |
| Rotas / dados   | TanStack Router · TanStack Query v5 · Zustand (UI)                   |
| Animações / DnD | Motion (Framer Motion) · @atlaskit/pragmatic-drag-and-drop           |
| Backend         | Supabase (Postgres + Auth + RLS + Realtime + Edge Functions)         |
| Auth            | Login com Google via Supabase Auth (PKCE)                            |
| Testes          | Vitest + Testing Library                                             |
| Deploy          | Vercel ou Cloudflare Pages                                           |

## Direção de arte

HUD cyberpunk com elegância: fundo quase-preto azulado, painéis com cantos chanfrados e borda
neon de 1px, ciano `#00f0ff` para ações e XP, magenta `#ff2d95` para conquistas, violeta
`#8b5cf6` para o glow de nível. Neon é tempero (bordas, glows, dados) — nunca área preenchida.
Tipografia: Chakra Petch (display), Inter (corpo), JetBrains Mono (dados). Glitch RGB reservado
a level up, conquistas e hover no logo. `prefers-reduced-motion` respeitado em tudo.

## Rodando localmente

Pré-requisito: Node.js 20+ e um projeto Supabase (as migrations estão em `supabase/migrations/`).

```bash
npm install
cp .env.example .env   # credenciais do Supabase (e opcionalmente Trello/Anthropic)
npm run dev            # http://localhost:5173
```

```bash
npm run build   # build de produção + typecheck
npm run test    # testes (Vitest)
npm run lint    # ESLint
```

## Roadmap (fases)

O Trello deixou de ser o centro do produto: é uma fonte de missões entre várias. Nomenclatura:
os **6 atributos de status** crescem a cada missão concluída e vivem em `/attributes`;
**Virtudes** é outro sistema — traços de caráter desbloqueados por marcos de nível.

- [x] **Fase 1 — Scaffold:** Vite + TS + Tailwind v4 + shadcn + rotas + layout + design tokens
- [x] **Fase 2 — Supabase:** migrations + login Google + rotas protegidas + profiles
- [x] **Fase 3 — Núcleo do sistema:** missões manuais, atributos/rank, Loja do Tempo, motor de
      XP puro testado, RPCs atômicos, leaderboard seguro, sidebar com navegação completa
- [x] **Fase 4 — Trello connect:** autorização client-side, escolha de boards + lista
      "Concluído" + multiplicador, polling idempotente como adapter do núcleo, bônus de
      prazo/prioridade e conquista multi-board
- [x] **Fase 5 — Dashboard, Arquiteto IA e Arena:** dashboard completo, galeria de conquistas
      com desbloqueio validado no servidor, celebrações de level up/conquista, insights
      determinísticos do Arquiteto, Arena Global com ranking e opt-out, títulos de nível e
      moldura de avatar evolutiva por rank
- [x] **Fase 6 — Board view:** gestão dos cards dentro do app, drag-and-drop com update
      otimista e rollback, criar/editar/arquivar card, badge de XP por card
- [x] **Fase 7 — Calendário e Progresso:** calendário dia/semana/mês com atividades e prazos,
      página Progresso com tiles e gráfico de atividade semanal
- [x] **Fase 8 — Coleção, Virtudes e Árvore:** Itens de Recompensa com raridades desbloqueados
      por missões especiais do Arquiteto, Virtudes por nível, Árvore de Evolução
- [x] **Fase 9 — Polimento:** webhook em tempo real do Trello, Evolução Chat IA (chat real com
      o Arquiteto), PWA instalável

A sidebar também lista uma seção **"Em breve"** (Finanças, Libertar Vícios, Matriz de
Prioridades, Lembretes, Avatares, Minigame, Zona de Falha etc.) — páginas placeholder para
módulos ainda não priorizados.
