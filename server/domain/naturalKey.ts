import { createHash } from 'node:crypto'

// Натуральный ключ платежа = детерминированный хэш бизнес-полей, которые вместе уникально
// идентифицируют поступление (дата + ИНН плательщика + номер документа + сумма). Это даёт
// идемпотентность ingestion: повторная/частичная загрузка той же выписки делает upsert по
// этому ключу, а не плодит дубли. Сам ключ — UNIQUE-колонка в схеме payments.
export function naturalKey(date: string, inn: string, doc: string | null, amount: number): string {
  return createHash('sha1').update(`${date}|${inn}|${doc ?? ''}|${amount}`).digest('hex')
}
