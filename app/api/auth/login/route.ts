import { NextRequest, NextResponse } from 'next/server'
import { asText, isRecord } from '@/lib/server-api-store'
import { createServerAuthClient } from '@/lib/server-supabase-auth'

export async function POST(request: NextRequest) {
  const payload: unknown = await request.json().catch(() => null)
  if (!isRecord(payload)) return NextResponse.json({ error: 'Некорректные данные входа.' }, { status: 400 })
  const email = asText(payload.email, 254)
  const password = typeof payload.password === 'string' ? payload.password : ''
  if (!email.includes('@') || password.length < 8) return NextResponse.json({ error: 'Введите корректный email и пароль от 8 символов.' }, { status: 422 })
  try {
    const { data, error } = await createServerAuthClient().auth.signInWithPassword({ email, password })
    if (error || !data.user || !data.session) return NextResponse.json({ error: error?.message ?? 'Не удалось выполнить вход.' }, { status: 401 })
    return NextResponse.json({ accessToken: data.session.access_token, user: { id: data.user.id, email: data.user.email ?? email, username: typeof data.user.user_metadata?.username === 'string' ? data.user.user_metadata.username : undefined } }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Auth-сервис временно недоступен. Используйте локальный fallback клиента.' }, { status: 503 })
  }
}
