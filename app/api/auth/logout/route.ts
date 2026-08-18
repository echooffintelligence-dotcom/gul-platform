import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ ok: true, fallback: true }, { headers: { 'Cache-Control': 'no-store' } })
}
