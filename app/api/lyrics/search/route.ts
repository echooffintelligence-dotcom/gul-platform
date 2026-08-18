import { NextRequest, NextResponse } from 'next/server'

type LrcLibResponse = {
  trackName?: string
  artistName?: string
  plainLyrics?: string | null
  syncedLyrics?: string | null
}

export async function GET(request: NextRequest) {
  const trackName = (request.nextUrl.searchParams.get('track_name') ?? '').trim().slice(0, 160)
  const artistName = (request.nextUrl.searchParams.get('artist_name') ?? '').trim().slice(0, 160)
  if (!trackName || !artistName) return NextResponse.json({ found: false, error: 'track_name и artist_name обязательны.' }, { status: 422 })

  const url = new URL('https://lrclib.net/api/get')
  url.searchParams.set('track_name', trackName)
  url.searchParams.set('artist_name', artistName)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 4_500)
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'GUL-SmartLyrics/1.0 (offline-first)', Accept: 'application/json' }, signal: controller.signal, next: { revalidate: 3600 } })
    if (response.status === 404) return NextResponse.json({ found: false })
    if (!response.ok) return NextResponse.json({ found: false, error: 'Внешний каталог текстов временно недоступен.' }, { status: 200 })
    const data = await response.json() as LrcLibResponse
    const syncedLyrics = typeof data.syncedLyrics === 'string' && data.syncedLyrics.trim() ? data.syncedLyrics : null
    const plainLyrics = typeof data.plainLyrics === 'string' && data.plainLyrics.trim() ? data.plainLyrics : null
    return NextResponse.json({ found: Boolean(syncedLyrics || plainLyrics), trackName: data.trackName ?? trackName, artistName: data.artistName ?? artistName, syncedLyrics, plainLyrics }, { headers: { 'Cache-Control': 'public, max-age=3600' } })
  } catch {
    return NextResponse.json({ found: false, error: 'Не удалось выполнить фоновый поиск. Вы можете продолжить вручную.' }, { status: 200 })
  } finally {
    clearTimeout(timeout)
  }
}
