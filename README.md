# Учёт оплат, проектов и закрывающих актов

Мини-система для digital-агентства: дашборд поступлений по проектам и контроль закрывающих актов
(отправлен / подписан / требует внимания), плюс **AI-пайплайн распознавания PDF банковской выписки**
на Claude — `PDF → структурированный JSON → БД`, с валидацией и отсевом непроектных операций.

Стек: **Nuxt 3 (Vue 3 + TypeScript, Nitro server API)** · **Drizzle ORM + Postgres (Neon)** ·
**Anthropic SDK** · **Zod** · **Vitest**. Один деплой на Vercel, сквозные TS-типы данные → логика → вид.

> Как я раскладывал ТЗ на технические требования и почему принял такие решения — в
> [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md) (тезисы реализации).

---

## Демо

**Живой деплой:** _ссылка после импорта репозитория в Vercel_ <!-- TODO: вставить https://<project>.vercel.app -->

![Дашборд: оплаты, проекты и закрывающие акты](docs/dashboard.png)

Сводка по поступлениям и закрывающим актам, фильтры (юрлицо, проект, этап, статус акта, период),
список проектов и таблица оплат со статусами актов. Данные — из Postgres (Neon): 24 оплаты / 19 юрлиц.

---

## Быстрый старт

```bash
pnpm install
cp .env.example .env          # впишите DATABASE_URL (Neon). Ключ Anthropic не обязателен — без него MockExtractor
pnpm db:push                  # накатить схему в Postgres (drizzle-kit push)
pnpm db:seed                  # засеять golden-fixture (24 оплаты, 19 юрлиц)
pnpm dev                      # http://localhost:3000
```

> БД — **Postgres (Neon)**. Локально и в проде одна и та же база; бесплатный проект на neon.tech даёт
> `DATABASE_URL`. Подключение — `postgres-js` (`db/index.ts`), идемпотентный seed — `db/seed.ts`.

Проверка:

```bash
pnpm test                     # Vitest: actStatus (4 статуса + порог) и aggregate (эталонные числа)
```

---

## Сущности и ER-связи

```
Client (юрлицо/ИП)  1───*  Project  1───*  Payment  1───1  Act
  inn, ogrn, name,         name,           date, amount,    is_sent, sent_at,
  legal_type,              client_id,      purpose, stage,   is_signed, signed_at,
  bank_account, bank       status          invoice, doc,     manager_comment
                                           natural_key(uniq) (status вычисляется, не хранится)
```

- «Проект» в выписке фактически = юрлицо-плательщик. Моделируем обе сущности (возможны несколько
  проектов на одно юрлицо), в seed по умолчанию 1 проект на клиента — так дают исходные данные.
- 1 платёж = 1 акт (1:1).
- `natural_key = sha1(date | inn | doc | amount)` — обеспечивает **идемпотентность** AI-ingestion:
  повторная загрузка того же PDF делает upsert, а не плодит дубли.

## Где бизнес-логика

Вся доменная логика — **чистые функции в [`server/domain/`](server/domain/)** (без БД, без HTTP), на них юнит-тесты:

- [`actStatus.ts`](server/domain/actStatus.ts) — расчёт статуса акта (единственный источник истины).
- [`aggregate.ts`](server/domain/aggregate.ts) — сводка/итоги и агрегаты по проектам (порт эталонной
  `aggregate()` из референса как тестируемая функция).

Оркестрация поверх Drizzle — в [`server/services/`](server/services/); REST-эндпоинты — в
[`server/api/`](server/api/). **Фильтрация и все итоги считаются на бэкенде** — фронт их не пересчитывает.

### Логика статусов акта (4 состояния + порог)

| Условие | Статус | Метка |
|---|---|---|
| не отправлен | `not_sent` | Акт не отправлен |
| отправлен, не подписан | `waiting` | Ждём подпись |
| подписан | `closed` | Закрыт |
| не закрыт и старше `ATTENTION_DAYS` (21) дней от `NOW` | `attention` | Требует внимания (оверлей поверх not_sent/waiting) |

Инвариант записи: `is_signed=true` форсит `is_sent=true`; `sent_at`/`signed_at` проставляются при
переходе флага в `true`. «Сегодня» берётся из конфигурируемой `NOW` (по умолчанию `2026-08-09`, конец
периода выписки), чтобы порог срабатывал на демо-данных.

## AI-парсинг банковской выписки (главный дифференциатор) — `POST /api/ingest`

Пайплайн в [`server/ai/`](server/ai/) + оркестрация в [`server/services/ingest.ts`](server/services/ingest.ts):

1. **PDF → текст** ([`pdf.ts`](server/ai/pdf.ts), библиотека `unpdf` — serverless-friendly).
2. **Извлечение** ([`claude.ts`](server/ai/claude.ts)): Anthropic SDK, **structured output через tool-use** —
   объявляем tool `emit_operations` с `input_schema` = JSON-schema, сгенерированной из Zod-схемы
   ([`schema.ts`](server/ai/schema.ts)), и форсим его вызов (`tool_choice`). Модель — `claude-opus-4-8`
   (или `claude-sonnet-4-6`) через env `AI_MODEL`.
3. **Валидация Zod + классификация + дедубль** ([`ingest.ts`](server/services/ingest.ts)):
   - отсев непроектных операций (`isProjectPayment=false`: депозиты, %, налоги, ЗП, аренда, комиссии,
     переводы между своими счетами, возвраты) → в отчёт `skipped`;
   - `confidence < 0.6` → `needsReview` (не импортируем молча);
   - idemпотентный upsert по натуральному ключу → создаём Client/Project/Payment/Act.
4. **Ответ**: `{ imported, skipped, needsReview, items, extractor }` — фронт показывает отчёт распознавания.

### Обработка рисков и ограничений (требование AI-вакансии — показано в коде явно)

- Нет `tool_use` / пустой ответ модели → `ExtractionError` → **HTTP 422** с понятным телом.
- JSON не проходит Zod → ошибка с перечислением проблемных полей (422).
- Таймаут/исключение SDK/парсера PDF → **HTTP 503** + лог.
- Нет `ANTHROPIC_API_KEY` → **`MockExtractor`** отдаёт golden-fixture (+2 непроектные операции для
  демонстрации отсева), так что демо и CI зелёные без ключа.

### Как масштабируется (embeddings / RAG)

Текущая классификация этапа услуги — гибрид «правила + LLM» по словарю. Прод-эволюция AI-части:

- **Embeddings-классификация `serviceStage`.** Эмбеддинг назначения платежа → косинусная близость к
  заранее посчитанным эмбеддингам словаря этапов; LLM-вызов только когда близость ниже порога. Дешевле,
  стабильнее и детерминированнее, чем гонять LLM на каждой операции. Интерфейс `PdfExtractor` уже
  изолирует стратегию извлечения, так что подмена точечная.
- **RAG по договорам и счетам клиента.** Vector store, разбитый по ИНН клиента; при ingestion подтягиваем
  релевантные пункты договора и сопоставляем платёж с конкретным этапом работ — авто-привязка к проекту
  вместо ручного словаря этапов.
- **Замена ручной загрузки на вебхук/очередь банка.** Тот же `ingestPdf`; идемпотентность по натуральному
  ключу уже готова к повторной/частичной доставке.

## REST API

```
GET   /api/payments?project&legalEntity&stage&from&to&sent(yes|no)&signed(yes|no)&q  → { items, summary }
GET   /api/projects?<те же фильтры>                                                   → { items }
GET   /api/summary?<те же фильтры>                                                    → SummaryDTO
GET   /api/filter-options                                                             → { projects, stages, dateRange }
PATCH /api/acts/:id   { isSent?, isSigned?, comment? }                                → ActDTO (с пересчитанным status)
POST  /api/ingest     (multipart: file=PDF)                                           → { imported, skipped, needsReview, items }
```

Фронт после PATCH делает оптимистичный апдейт + рефетч (итоги всегда приходят с бэка).

## Архитектура (слои)

```
db/        schema.ts (4 таблицы) · fixture.ts (24 записи) · seed.ts · migrate.ts
server/
  domain/    actStatus.ts · aggregate.ts · naturalKey.ts   ← чистая логика, юнит-тесты
  services/  payments.ts · acts.ts · ingest.ts             ← оркестрация поверх Drizzle
  ai/        schema.ts · pdf.ts · claude.ts · mock.ts · extractor.ts
  api/       payments/projects/summary/filter-options (GET) · acts/[id] (PATCH) · ingest (POST)
app/       composables/useDashboard.ts · components/* · pages/index.vue   ← Vue 3
```

## Допущения

- Период выписки фиксированный (16.07.2026–09.08.2026); «сегодня» — конфигурируемая `NOW`.
- «Проект» = юрлицо-плательщик; в seed 1 проект на клиента.
- AI-извлечение идемпотентно по натуральному ключу (дата+ИНН+док+сумма).

## Эталонные числа (golden-fixture / тесты агрегации)

24 оплаты · 19 уникальных юрлиц · итог **1 405 820,00 ₽** · исходно всё не отправлено/не подписано
(подписано 0 ₽, «не закрыто» = весь итог). Крупнейший плательщик — ООО «ПЛАТФОРМА-ЛК» (266 000 ₽).

## Деплой (Vercel + Neon Postgres)

1. Vercel определяет Nuxt-preset автоматически.
2. Задать env: `DATABASE_URL` (Neon), `ANTHROPIC_API_KEY`, `AI_MODEL`, `NOW`, `ATTENTION_DAYS`.
3. Один раз накатить схему и seed на прод-БД: `pnpm db:push && pnpm db:seed` (с прод `DATABASE_URL`).

> Схема — `drizzle-orm/pg-core`, драйвер — `postgres-js`. Доменный слой, сервисы и API зависят только от
> Drizzle-абстракции. Под высокую конкурентность на serverless имеет смысл перейти на HTTP-драйвер Neon
> (`@neondatabase/serverless` + `drizzle-orm/neon-http`) — точечная замена в `db/index.ts`.

## Что НЕ делаем (по ТЗ)

Бухучёт, интеграции банк/1С, авторизация/роли, ЭЦП, генерация актов, сложный дизайн.
