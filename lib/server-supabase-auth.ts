import { createClient } from '@supabase/supabase-js'
import { supabaseConfig } from '@/lib/supabase-config'

export function createServerAuthClient() {
  return createClient(supabaseConfig.url, supabaseConfig.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
