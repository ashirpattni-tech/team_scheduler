import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { supabaseConfig } from './config'

// A single shared client. Only created when cloud mode is configured.
export const supabase: SupabaseClient | null = supabaseConfig
  ? createClient(supabaseConfig.url, supabaseConfig.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}
