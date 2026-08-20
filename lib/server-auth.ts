import { createClient } from '@supabase/supabase-js'
import { supabaseConfig } from '@/lib/supabase-config'

export type ServerIdentity = { id: string; email: string; username?: string }

/**
 * Проверяет Bearer-токен на стороне сервера.
 *
 * Единственный источник истины о том, кто выполняет запрос. Никакой route handler
 * не имеет права доверять owner_id из тела запроса: до этой функции любой клиент
 * мог прислать чужой идентификатор и получить доступ к чужим данным.
 */
export async function identityFromRequest(request: Request): Promise<ServerIdentity | null> {
  const header = request.headers.get('authorization') ?? ''
  const token = header.replace(/^Bearer\s+/i, '').trim()
  if (!token || token === header.trim()) return null
  if (!supabaseConfig.enabled) return null
  try {
    const client = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    const { data, error } = await client.auth.getUser(token)
    if (error || !data.user) return null
    const username = data.user.user_metadata?.username
    return {
      id: data.user.id,
      email: data.user.email ?? '',
      username: typeof username === 'string' ? username : undefined,
    }
  } catch {
    return null
  }
}
