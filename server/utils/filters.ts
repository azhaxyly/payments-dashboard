import type { H3Event } from 'h3'
import type { ActStatus } from '../domain/actStatus'
import type { PaymentFilters } from '../types'

const ACT_STATUSES: readonly ActStatus[] = ['not_sent', 'waiting', 'closed', 'attention']

export function parseFilters(event: H3Event): PaymentFilters {
  const q = getQuery(event)
  return {
    project: (q.project as string) || undefined,
    legalEntity: (q.legalEntity as string) || undefined,
    stage: (q.stage as string) || undefined,
    from: (q.from as string) || undefined,
    to: (q.to as string) || undefined,
    sent: q.sent === 'yes' || q.sent === 'no' ? (q.sent as 'yes' | 'no') : undefined,
    signed: q.signed === 'yes' || q.signed === 'no' ? (q.signed as 'yes' | 'no') : undefined,
    status: ACT_STATUSES.includes(q.status as ActStatus) ? (q.status as ActStatus) : undefined,
    q: (q.q as string) || undefined,
  }
}
