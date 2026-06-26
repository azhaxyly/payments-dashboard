export type ActStatus = 'not_sent' | 'waiting' | 'closed' | 'attention'

export interface ActLike {
  isSent: boolean
  isSigned: boolean
}

export const DEFAULT_NOW = process.env.NOW || '2026-08-09'
export const DEFAULT_ATTENTION_DAYS = Number(process.env.ATTENTION_DAYS || 21)

export function daysBetween(a: string, b: string): number {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)
  return Math.floor(ms / 86_400_000)
}

export function actStatus(
  a: ActLike,
  paymentDate: string,
  now: string = DEFAULT_NOW,
  attentionDays: number = DEFAULT_ATTENTION_DAYS
): ActStatus {
  if (a.isSigned) return 'closed'
  const overdue = daysBetween(paymentDate, now) > attentionDays
  if (a.isSent) return overdue ? 'attention' : 'waiting'
  return overdue ? 'attention' : 'not_sent'
}

export const STATUS_LABELS: Record<ActStatus, { text: string; cls: string }> = {
  not_sent: { text: 'Акт не отправлен', cls: 'open' },
  waiting: { text: 'Ждём подпись', cls: 'wait' },
  closed: { text: 'Закрыт', cls: 'done' },
  attention: { text: 'Требует внимания', cls: 'attention' },
}
