import { NextRequest, NextResponse } from 'next/server'
import { createServerAuthClient } from '@/lib/server-supabase-auth'

export async function GET(request: NextRequest) {
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!bearer) return NextResponse.json({ user: null, fallback: true }, { headers: { 'Cache-Control': 'no-store' } })
  try {
    const { data, error } = await createServerAuthClient().auth.getUser(bearer)
    if (error || !data.user) return NextResponse.json({ user: null, fallback: true }, { headers: { 'Cache-Control': 'no-store' } })
    return NextResponse.json({ user: { id: data.user.id, email: data.user.email ?? '', username: typeof data.user.user_metadata?.username === 'string' ? data.user.user_metadata.username : undefined } }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ user: null, fallback: true }, { headers: { 'Cache-Control': 'no-store' } })
  }
}
