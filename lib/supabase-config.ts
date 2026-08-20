/**
 * Единая точка конфигурации Supabase.
 *
 * URL и publishable-ключ безопасно раскрывать клиенту — они и так уходят в бандл.
 * Защиту данных обеспечивает RLS (см. supabase/schema.sql), а не секретность ключа.
 * Значения по умолчанию оставлены, чтобы demo-развёртывание работало без .env,
 * но production обязан задать переменные окружения явно.
 */
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://tpuoxbvlzgofqzfyoene.supabase.co').replace(/\/$/, '')
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_h23HgO70CV2Q4a7XdXraEg_O9AVZlXx'

export const supabaseConfig = {
  url,
  anonKey,
  enabled: Boolean(url && anonKey),
}
