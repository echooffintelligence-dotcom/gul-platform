import { NextRequest, NextResponse } from 'next/server'
import { asText, isRecord } from '@/lib/server-api-store'
import { createServerAuthClient } from '@/lib/server-supabase-auth'

export async function POST(request: NextRequest) {
  const payload: unknown = await request.json().catch(() => null)
  if (!isRecord(payload)) return NextResponse.json({ error: 'Некорректные данные регистрации.' }, { status: 400 })
  const email = asText(payload.email, 254)
  const username = asText(payload.username, 80)
  const password = typeof payload.password === 'string' ? payload.password : ''
  if (!email.includes('@') || !username || password.length < 8) return NextResponse.json({ error: 'Укажите username, корректный email и пароль от 8 символов.' }, { status: 422 })
  try {
    const { data, error } = await createServerAuthClient().auth.signUp({ email, password, options: { data: { username } } })
    if (error || !data.user) return NextResponse.json({ error: error?.message ?? 'Не удалось создать аккаунт.' }, { status: 400 })
    return NextResponse.json({ accessToken: data.session?.access_token, user: { id: data.user.id, email: data.user.email ?? email, username } }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Auth-сервис временно недоступен. Используйте локальный fallback клиента.' }, { status: 503 })
  }
}
