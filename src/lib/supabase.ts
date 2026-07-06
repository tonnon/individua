import { createClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/database.types'
import { env } from '@/lib/env'

/**
 * Client único do Supabase. A sessão é gerenciada por ele
 * (PKCE + refresh automático) — nunca armazenamos tokens à mão.
 */
export const supabase = createClient<Database>(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})
