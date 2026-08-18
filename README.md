# ГУЛ

«ГУЛ» — музыкальная платформа на **Next.js App Router**, TypeScript, Tailwind CSS, Supabase и Web Audio API. Проект сочетает премиальный dark cyber glassmorphism-интерфейс с offline-first хранением: плеер, lyrics, workspace, РЗТ и публикация остаются доступными, даже если сеть или Supabase временно недоступны.

## Запуск

Требуется Node.js 20+.

```bash
npm ci
npm run dev
```

Для production-проверки используйте:

```bash
npx tsc --noEmit
npm run build
npm run start
```

## Интерфейс и медиа

Интерфейс построен на тёмных aurora-фонах, glass-панелях, неоновых состояниях, hover glow и микроанимациях. Глобальный плеер использует настоящий `HTMLAudioElement`, drag/keyboard seek, loop, shuffle, volume, mute и Web Audio API waveform для загруженных файлов.

Кабинет публикует MP3/WAV/FLAC и JPG/PNG/WEBP. Файлы отправляются в публичные Supabase Storage-пути `audio/tracks/` и `covers/releases/`; при сетевой ошибке хранение моментально переключается на `blob:` URL, не прерывая текущую сессию.

## Auth

`components/providers/auth-provider.tsx` использует официальный Supabase Auth client и `onAuthStateChange`. Поддерживаются email/password `signUp`, `signIn` и `signOut`; форма расположена в `components/auth/auth-modal.tsx`.

> Чтобы обеспечить требуемый моментальный вход после регистрации, отключите **Confirm email** в настройках Supabase Auth. Если Auth-сервис недоступен, интерфейс автоматически сохраняет временную local session в `gul.auth.local.v1` и не блокирует работу.

## API facade и self-hosting

`lib/api-client.ts` — единый типизированный фасад. Если задан `NEXT_PUBLIC_API_URL`, запросы отправляются на внешний backend; иначе используются встроенные Next.js route handlers.

| Область | Встроенный endpoint |
|---|---|
| Auth | `/api/auth/login`, `/api/auth/register`, `/api/auth/me`, `/api/auth/logout` |
| Tracks | `/api/tracks` |
| Releases | `/api/releases` |
| РЗТ | `/api/rzt` |
| Workspace | `/api/workspace/sync` |

Route handlers валидируют входные данные и возвращают offline-safe fallback-ответы. `owner_id` передаётся для всех новых карточек, треков и релизов; текущий in-memory adapter в `lib/server-api-store.ts` изолирован, поэтому его можно заменить на Node.js/Go/Python или Supabase database без переписывания UI.

## Локальные данные

| Домен | Ключ localStorage |
|---|---|
| Fallback Auth session | `gul.auth.local.v1` |
| Workspace, активная карточка и snapshot | `gul.workspace.v3` |
| Релизы, пользовательские треки и чарт | `gul.releases.v2` |
| Синхронизация текста | `gul.lyrics.<trackId>.v1` |

## Supabase Workspace Sync

`lib/supabase.ts` использует публичные проектные fallback-параметры, а `NEXT_PUBLIC_SUPABASE_URL` и `NEXT_PUBLIC_SUPABASE_ANON_KEY` имеют приоритет. Snapshot сохраняется в `localStorage` немедленно и синхронизируется с debounce **500 ms**.

```sql
create table workspace_snapshots (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz default now()
);
```

Перед production-развёртыванием обязательно настройте RLS для `workspace_snapshots`, Storage buckets и реального пользовательского `snapshotId`.
