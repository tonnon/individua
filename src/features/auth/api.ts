import type { Session } from '@supabase/supabase-js'

import { supabase } from '@/lib/supabase'

/**
 * Sessão atual (ou null). O client aguarda a inicialização —
 * incluindo a troca do `code` PKCE no retorno do OAuth.
 */
export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) return null
  return data.session
}

export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  if (error) throw error
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
