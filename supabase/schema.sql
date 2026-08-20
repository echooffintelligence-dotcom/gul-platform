-- ============================================================================
-- ГУЛ · схема базы данных, RLS и Storage
-- ----------------------------------------------------------------------------
-- Выполните файл целиком в Supabase → SQL Editor → New query → Run.
-- Скрипт идемпотентен: повторный запуск безопасен и ничего не удаляет,
-- кроме одной явно указанной общей строки (см. раздел 4).
--
-- ВАЖНО. В проекте уже существуют таблицы tracks, releases и
-- workspace_snapshots, но другой формы — без owner_id и без большинства полей,
-- которые использует приложение. Поэтому здесь не просто CREATE TABLE, а
-- миграция: недостающие колонки добавляются через ALTER ... ADD COLUMN IF NOT
-- EXISTS. На чистом проекте скрипт отработает точно так же.
--
-- Зачем это нужно. Приложение ходит в PostgREST от имени пользователя, поэтому
-- владение строками проверяет база, а не только код. Без включённого RLS любой
-- обладатель публикуемого ключа (он есть в браузерном бандле у всех) может
-- читать и перезаписывать чужие данные.
--
-- Все новые колонки добавляются NULLABLE: ALTER ... SET NOT NULL упал бы, если
-- в таблице уже есть строки. Строка с owner_id IS NULL никому не принадлежит —
-- политики RLS ниже просто не дадут её ни прочитать под своим именем, ни изменить.
-- ============================================================================

-- ─── 1. Треки ───────────────────────────────────────────────────────────────
-- Имена колонок совпадают с полями JSON, которые шлёт приложение,
-- поэтому идентификаторы в кавычках — это осознанно, а не опечатка.
create table if not exists public.tracks (
  id    text primary key,
  title text not null
);

alter table public.tracks add column if not exists owner_id        uuid references auth.users (id) on delete cascade;
alter table public.tracks add column if not exists "releaseId"     text;
alter table public.tracks add column if not exists "audioUrl"      text;
alter table public.tracks add column if not exists "coverUrl"      text;
alter table public.tracks add column if not exists "durationSec"   integer;
alter table public.tracks add column if not exists facts           jsonb       not null default '{}'::jsonb;
alter table public.tracks add column if not exists "isAiGenerated" boolean     not null default false;
alter table public.tracks add column if not exists "createdAt"     timestamptz not null default now();

create index if not exists tracks_owner_idx on public.tracks (owner_id);
create index if not exists tracks_release_idx on public.tracks ("releaseId");

alter table public.tracks enable row level security;

drop policy if exists "tracks are readable by everyone" on public.tracks;
create policy "tracks are readable by everyone"
  on public.tracks for select
  using (true);

drop policy if exists "tracks are insertable by owner" on public.tracks;
create policy "tracks are insertable by owner"
  on public.tracks for insert
  with check (auth.uid() = owner_id);

drop policy if exists "tracks are updatable by owner" on public.tracks;
create policy "tracks are updatable by owner"
  on public.tracks for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "tracks are deletable by owner" on public.tracks;
create policy "tracks are deletable by owner"
  on public.tracks for delete
  using (auth.uid() = owner_id);

-- ─── 2. Релизы ──────────────────────────────────────────────────────────────
create table if not exists public.releases (
  id    text primary key,
  title text not null
);

alter table public.releases add column if not exists owner_id   uuid references auth.users (id) on delete cascade;
alter table public.releases add column if not exists "trackIds" jsonb       not null default '[]'::jsonb;
alter table public.releases add column if not exists kind       text;
alter table public.releases add column if not exists genre      text;
alter table public.releases add column if not exists score      numeric     not null default 0;
alter table public.releases add column if not exists votes      integer     not null default 0;
alter table public.releases add column if not exists created_at timestamptz not null default now();

create index if not exists releases_owner_idx on public.releases (owner_id);
create index if not exists releases_score_idx on public.releases (score desc);

alter table public.releases enable row level security;

drop policy if exists "releases are readable by everyone" on public.releases;
create policy "releases are readable by everyone"
  on public.releases for select
  using (true);

drop policy if exists "releases are insertable by owner" on public.releases;
create policy "releases are insertable by owner"
  on public.releases for insert
  with check (auth.uid() = owner_id);

drop policy if exists "releases are updatable by owner" on public.releases;
create policy "releases are updatable by owner"
  on public.releases for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "releases are deletable by owner" on public.releases;
create policy "releases are deletable by owner"
  on public.releases for delete
  using (auth.uid() = owner_id);

-- ─── 3. Голоса ГЗТ ──────────────────────────────────────────────────────────
-- Первичный ключ (release_id, voter_id) — это и есть правило «один
-- пользователь = один голос». Накрутка невозможна на уровне БД: повторная
-- отправка заменяет прежнюю оценку, а не добавляет новую.
create table if not exists public.gzt_votes (
  release_id text        not null references public.releases (id) on delete cascade,
  voter_id   uuid        not null references auth.users (id) on delete cascade,
  score      numeric     not null check (score >= 0 and score <= 90),
  created_at timestamptz not null default now(),
  primary key (release_id, voter_id)
);

alter table public.gzt_votes enable row level security;

drop policy if exists "votes are readable by everyone" on public.gzt_votes;
create policy "votes are readable by everyone"
  on public.gzt_votes for select
  using (true);

drop policy if exists "votes are insertable by voter" on public.gzt_votes;
create policy "votes are insertable by voter"
  on public.gzt_votes for insert
  with check (auth.uid() = voter_id);

drop policy if exists "votes are updatable by voter" on public.gzt_votes;
create policy "votes are updatable by voter"
  on public.gzt_votes for update
  using (auth.uid() = voter_id)
  with check (auth.uid() = voter_id);

drop policy if exists "votes are deletable by voter" on public.gzt_votes;
create policy "votes are deletable by voter"
  on public.gzt_votes for delete
  using (auth.uid() = voter_id);

-- Пересчёт агрегатов релиза после любого изменения голосов.
-- Держит score/votes честными, даже если клиент их не обновил.
create or replace function public.recalc_release_score()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target text := coalesce(new.release_id, old.release_id);
begin
  update public.releases r
     set score = coalesce((select round(avg(v.score)::numeric, 1) from public.gzt_votes v where v.release_id = target), 0),
         votes = coalesce((select count(*) from public.gzt_votes v where v.release_id = target), 0)
   where r.id = target;
  return null;
end;
$$;

drop trigger if exists gzt_votes_recalc on public.gzt_votes;
create trigger gzt_votes_recalc
  after insert or update or delete on public.gzt_votes
  for each row execute function public.recalc_release_score();

-- ─── 4. Workspace snapshots ─────────────────────────────────────────────────
-- Существующая таблица имеет ключ id text, и приложение писало в неё под одним
-- общим значением 'gul-local-demo': все пользователи делили одну строку, любой
-- мог прочитать и перезаписать чужое рабочее пространство. Переводим ключ на
-- владельца.
create table if not exists public.workspace_snapshots (
  id         text primary key,
  payload    jsonb       not null,
  updated_at timestamptz not null default now()
);

alter table public.workspace_snapshots add column if not exists owner_id uuid references auth.users (id) on delete cascade;

-- id больше не задаётся приложением — даём ему значение по умолчанию,
-- иначе вставка новой строки упадёт на NOT NULL.
alter table public.workspace_snapshots alter column id set default gen_random_uuid()::text;

-- Общая demo-строка и есть та самая дыра: удаляем её вместе с любыми другими
-- записями без владельца. Ничьих персональных данных в ней нет — это снапшот
-- витрины, который приложение пересоздаст при первом входе.
delete from public.workspace_snapshots where owner_id is null;

-- on_conflict=owner_id в приложении требует уникальности по владельцу.
create unique index if not exists workspace_snapshots_owner_key on public.workspace_snapshots (owner_id);

alter table public.workspace_snapshots enable row level security;

drop policy if exists "snapshots are private to owner" on public.workspace_snapshots;
create policy "snapshots are private to owner"
  on public.workspace_snapshots for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ─── 5. Ссылки артиста ──────────────────────────────────────────────────────
create table if not exists public.artist_links (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid        not null references auth.users (id) on delete cascade,
  artist_id  text        not null,
  url        text        not null,
  title      text        not null default '',
  kind       text        not null default 'link' check (kind in ('link', 'support')),
  position   integer     not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists artist_links_artist_idx on public.artist_links (artist_id);

alter table public.artist_links enable row level security;

drop policy if exists "artist links are readable by everyone" on public.artist_links;
create policy "artist links are readable by everyone"
  on public.artist_links for select
  using (true);

drop policy if exists "artist links are writable by owner" on public.artist_links;
create policy "artist links are writable by owner"
  on public.artist_links for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ─── 6. Плейлисты ───────────────────────────────────────────────────────────
create table if not exists public.playlists (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid        not null references auth.users (id) on delete cascade,
  title       text        not null,
  description text        not null default '',
  cover_url   text,
  privacy     text        not null default 'private' check (privacy in ('public', 'private', 'link')),
  track_ids   jsonb       not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists playlists_owner_idx on public.playlists (owner_id);

alter table public.playlists enable row level security;

-- Приватный плейлист виден только автору — это и есть «доступ только автору».
drop policy if exists "playlists are readable when public or own" on public.playlists;
create policy "playlists are readable when public or own"
  on public.playlists for select
  using (privacy <> 'private' or auth.uid() = owner_id);

drop policy if exists "playlists are writable by owner" on public.playlists;
create policy "playlists are writable by owner"
  on public.playlists for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ─── 7. История прослушиваний (для «Моей волны») ────────────────────────────
create table if not exists public.play_history (
  id        bigserial primary key,
  owner_id  uuid        not null references auth.users (id) on delete cascade,
  track_id  text        not null,
  played_at timestamptz not null default now()
);

create index if not exists play_history_owner_idx on public.play_history (owner_id, played_at desc);

alter table public.play_history enable row level security;

drop policy if exists "history is private to owner" on public.play_history;
create policy "history is private to owner"
  on public.play_history for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ============================================================================
-- 8. STORAGE: бакеты audio и covers
-- ============================================================================
-- Бакеты публичны на чтение, чтобы у загруженного трека был постоянный URL,
-- доступный всем слушателям. Запись разрешена только в личную папку
-- пользователя: первый сегмент пути обязан совпадать с его uid.
-- Приложение кладёт файлы как  <uid>/tracks/<uuid>.<ext>  и  <uid>/releases/<uuid>.<ext>.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('audio', 'audio', true, 104857600,
        array['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/flac', 'audio/x-flac'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('covers', 'covers', true, 10485760,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "media is publicly readable" on storage.objects;
create policy "media is publicly readable"
  on storage.objects for select
  using (bucket_id in ('audio', 'covers'));

drop policy if exists "media upload into own folder" on storage.objects;
create policy "media upload into own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('audio', 'covers')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "media update in own folder" on storage.objects;
create policy "media update in own folder"
  on storage.objects for update
  to authenticated
  using (
    bucket_id in ('audio', 'covers')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "media delete in own folder" on storage.objects;
create policy "media delete in own folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('audio', 'covers')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- Проверка после выполнения
-- ============================================================================
-- 1) RLS включён на всех семи таблицах — должно вернуться семь строк с true:
-- select tablename, rowsecurity from pg_tables
--  where schemaname = 'public'
--    and tablename in ('tracks','releases','gzt_votes','workspace_snapshots',
--                      'artist_links','playlists','play_history');
--
-- 2) Колонки на месте — запрос должен выполниться без ошибок:
-- select id, title, owner_id, "audioUrl", "isAiGenerated" from public.tracks limit 1;
-- select id, title, owner_id, "trackIds", score, votes from public.releases limit 1;
-- select id, owner_id, payload from public.workspace_snapshots limit 1;
--
-- 3) Бакеты созданы и публичны:
-- select id, public from storage.buckets where id in ('audio','covers');
