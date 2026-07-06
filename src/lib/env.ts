import { z } from 'zod'

const schema = z.object({
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
  // exigida a partir da Fase 3 (conexão com o Trello)
  VITE_TRELLO_API_KEY: z.string().min(1).optional(),
})

const parsed = schema.safeParse(import.meta.env)

if (!parsed.success) {
  const faltando = parsed.error.issues.map((i) => i.path.join('.')).join(', ')
  throw new Error(
    `Variáveis de ambiente ausentes ou inválidas: ${faltando}. ` +
      'Copie .env.example para .env e preencha (ver README).',
  )
}

export const env = parsed.data
