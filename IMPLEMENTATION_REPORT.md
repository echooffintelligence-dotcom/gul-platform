# ГУЛ — отчёт о реализации Prompt 6

## Результат

В рабочую копию платформы «ГУЛ» реализован следующий этап продукта. Система оценки **РЗТ** заменена на **ГЗТ — «ГУЛ За Творчество»**; социальный слой расширен подписками, persistent-лайками, плейлистами и совместным синтезом с другом; публикация и страницы релизов получили Genius-style metadata. Тёмная glassmorphism-система, неоновые акценты и нижний плеер сохранены как основа интерфейса.

> **ГЗТ** оценивает творчество по пяти осям: «Рифмы / Образы», «Структура / Ритмика», «Реализация стиля», «Индивидуальность / Харизма» и «Атмосфера / Вайб».

| Направление | Реализованный результат |
|---|---|
| ГЗТ | Пятиосевая шкала, SVG radar chart, формула 0–90, сертификаты и endpoint `/api/gzt`. |
| Минимализация | Гистограмма оценок удалена из релизов; сущность лейблов убрана из ролей и отображения. Сохранённые legacy-карточки мигрируются из «лейбл» в «коллектив». |
| Номинации | Неоновые плашки «Трек месяца», «Трек года», «Обложка месяца» и «Альбом года» поддерживаются моделью релиза. |
| Подписки | Страница артиста получила toggle «Подписаться / Вы подписаны»; новинки подписанных артистов видны в кабинете. |
| Любимые треки | Единый persistent heart доступен в чарте, трек-листе релиза и нижнем плеере. Системный плейлист «Мне нравится» отображается в кабинете. |
| Плейлисты | Реализовано создание пользовательских подборок с названием, описанием, URL обложки и приватностью; добавление или удаление треков доступно в компактном меню. |
| ГУЛ Синтез | В кабинете есть creator совместной подборки: выбор друга, объединение вкусов, Match Score и сохранение результата в offline-first social state. |
| Credits | Genius-style блок «Создатели и факты о треке» показывает producer, written by, mix/master, samples и жанровые теги. Эти поля доступны при публикации и передаются в API fallback. |

## Модель ГЗТ

ГЗТ использует четыре базовых критерия с максимумом 40 баллов и единственный коэффициент атмосферы. Максимальная оценка составляет 90 баллов.

```text
base = text + structure + style + individuality
ГЗТ = base × (atmosphere / 5) × 2.25
```

**Бриллиант ГУЛА** назначается от 85 баллов, **Золотой релиз** — от 70 баллов, а остальные работы получают статус **Underground / Свежий звук**.

## Ключевые изменения

| Модуль | Изменение |
|---|---|
| `lib/data.ts` | Добавлены `GztScore`, `GZT_CRITERIA`, `gztTotal()`, `gztCertification()`, `GztNomination` и `TrackFacts`; удалены legacy-типы РЗТ, трендовость и поле `label`. |
| `components/providers/release-provider.tsx` | Хранилище релизов считает ГЗТ, публикует треки с facts и сохраняет исторические агрегаты. |
| `components/release/gzt-rating.tsx` и `gzt-radar-chart.tsx` | Новый пятиосевой интерфейс оценки и SVG-паутина. |
| `components/release/release-view.tsx` | Убрана гистограмма; добавлены ГЗТ, плашки номинаций и Genius-style facts panel. |
| `components/release/track-facts-panel.tsx` | Новый блок фактологии с кликабельными авторами и тегами. |
| `components/providers/social-provider.tsx` | Расширенный offline-first store для follow, likes, playlists, visibility и Blend. |
| `components/social/track-actions.tsx` | Новый общий heart и menu добавления трека в плейлист. |
| `components/social/social-library.tsx` и `blend-creator.tsx` | Кабинетная библиотека, подписки, плейлисты и UI «ГУЛ Синтез». |
| `components/artist/artist-view.tsx` | Follow/Following button и подпись средней оценки ГЗТ. |
| `components/chart/chart-table.tsx`, `components/release/track-list.tsx`, `components/player/player-bar.tsx` | Shared track actions подключены к чарту, релизу и глобальному PlayerBar. |
| `components/account/upload-track-modal.tsx` | Publication дополнена полями продюсера, авторов текста, mix/master, samples и tags. |
| `app/api/gzt/route.ts` | Новый route handler с пятью критериями и расчётом до 90. |
| `app/api/tracks/route.ts`, `lib/api-client.ts` | API track model расширена Genius-style facts. |
| `components/providers/workspace-provider.tsx` | Миграция legacy-роли «лейбл» в «коллектив» для local и remote snapshot. |

Заменённые legacy-файлы оценки и route `/api/rzt` удалены. README синхронизирован с endpoint ГЗТ и ключом social persistence `gul.social.v2`.

## Приёмка

| Проверка | Результат |
|---|---|
| Строгий TypeScript | `node ./node_modules/typescript/bin/tsc --noEmit` завершён без ошибок. |
| Production build | `npm run build` завершён успешно через закреплённый webpack pipeline Next.js 16.3.0. |
| ГЗТ релиз | Browser smoke-тест подтвердил пять критериев, формулу, radar chart, отсутствие гистограммы, плашку «Альбом года» и facts panel. |
| Social flows | Подписка переключилась в «Вы подписаны» и появилась в кабинете; плейлист с приватностью успешно создан; heart синхронизировался между чартом и PlayerBar. |
| API ГЗТ | `POST /api/gzt` с `[10,10,10,10,5]` вернул `total: 40` и `score: 90`. |
| Runtime | Консоль не показала ошибок приложения. Зафиксировано только ожидаемое локальное уведомление Vercel Analytics о неразвёрнутом script. |
| Git | Каталог `.git` сохранён; HEAD остаётся `dd40b02`. В процессе не выполнялись commit, reset, checkout или другие изменяющие Git-операции. |

Подробный протокол ручной проверки находится в `browser_validation_notes.md` рядом с проектом. Финальная ZIP-поставка сохраняет `.git`, но исключает воспроизводимые каталоги `node_modules` и `.next`.
