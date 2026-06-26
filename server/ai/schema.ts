import { z } from 'zod'

export const RawOperation = z.object({
  date: z.string().describe('Дата операции в формате YYYY-MM-DD'),
  payerName: z.string().describe('Полное наименование плательщика, как в выписке'),
  legalType: z.enum(['ООО', 'АО', 'АНО', 'ИП', 'Иное']),
  inn: z.string().regex(/^\d{10,12}$/).describe('ИНН плательщика, 10 или 12 цифр'),
  ogrn: z.string().nullable().describe('ОГРН/ОГРНИП с префиксом, либо null'),
  account: z.string().nullable().describe('Расчётный счёт плательщика, либо null'),
  bank: z.string().nullable().describe('Банк плательщика (БИК + название), либо null'),
  amount: z.number().positive().describe('Сумма поступления в рублях'),
  doc: z.string().nullable().describe('Номер платёжного документа, либо null'),
  invoice: z.string().nullable().describe('Счёт/договор из назначения платежа, либо null'),
  purpose: z.string().describe('Полное назначение платежа'),
  // Намеренно string, а не z.enum(SERVICE_STAGES): словарь этапов даём модели в промпте как
  // ориентир, но не роняем всю выписку из-за одного непредвиденного этапа — нормализуем мягко.
  serviceStage: z
    .string()
    .describe('Нормализованный тип услуги/этап из словаря; если неясно — "Оплата по проекту"'),
  isProjectPayment: z
    .boolean()
    .describe(
      'true — оплата клиента за услугу/этап работ; false — депозит/налог/ЗП/аренда/%/комиссия/перевод между своими счетами/возврат'
    ),
  confidence: z.number().min(0).max(1).describe('Уверенность в извлечении полей, 0..1'),
})

export type RawOperation = z.infer<typeof RawOperation>

export const ExtractionResult = z.object({
  operations: z.array(RawOperation),
})

export type ExtractionResult = z.infer<typeof ExtractionResult>

export const SERVICE_STAGES = [
  'Разработка сайта',
  'Лендинг',
  'Личный кабинет',
  'Дизайн',
  'SEO-продвижение',
  'Контекстная реклама',
  'SERM',
  'SMM',
  'Контент сайта',
  'Копирайтинг / тексты',
  'Размещение объявлений',
  'Сопровождение сайта',
  'Маркетинговые услуги',
  'Презентация',
  'Лицензия / сервисы',
  'Проектирование / копирайтинг',
  'Оплата по проекту',
] as const

// Порог уверенности: операции ниже не импортируем молча, а отправляем в needsReview —
// лучше показать оператору сомнительное извлечение, чем тихо занести в БД мусор.
export const CONFIDENCE_THRESHOLD = 0.6
