import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://tpuoxbvlzgofqzfyoene.supabase.co'
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_h23HgO70CV2Q4a7XdXraEg_O9AVZlXx'

let client: SupabaseClient | null = null

export function getSupabaseAuthClient(): SupabaseClient | null {
  if (typeof window === 'undefined' || !url || !anonKey) return null
  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return client
}
