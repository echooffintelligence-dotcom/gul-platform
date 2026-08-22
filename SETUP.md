# Настройка ГУЛа

Схема Supabase уже применена в текущем проекте. Этот файл нужен, если
разворачиваете с нуля или меняете проект Supabase.

## 1. Схема БД и Storage
Выполните `supabase/schema.sql` целиком в Supabase → SQL Editor → Run.
Скрипт идемпотентен: создаёт недостающие таблицы, добавляет недостающие
колонки к существующим, включает RLS и заводит бакеты `audio` и `covers`.

Проверка:

    select tablename, rowsecurity from pg_tables
     where schemaname = 'public'
       and tablename in ('tracks','releases','gzt_votes','workspace_snapshots',
                         'artist_links','playlists','play_history');

Должно быть семь строк, у всех `rowsecurity = true`.

## 2. Переменные окружения
Скопируйте `.env.example` в `.env.local` и подставьте свои значения:

    NEXT_PUBLIC_SUPABASE_URL=https://ваш-проект.supabase.co
    NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...

На Vercel те же две переменные добавьте в Project Settings → Environment
Variables и сделайте redeploy.

## 3. Мгновенный вход
Supabase → Authentication → Sign In / Providers → Email → выключить
**Confirm email**. Иначе после регистрации сессия не выдаётся и приложение
уходит в локальный режим без синхронизации.

## Запуск

    npm ci
    npm run build
    npm run start

Требуется Node.js 20+. Проверка типов отдельно:

    node ./node_modules/typescript/bin/tsc --noEmit

`next.config.mjs` намеренно без `ignoreBuildErrors` — сборка падает на
ошибках типов.
