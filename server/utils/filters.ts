import type { H3Event } from 'h3'
import type { PaymentFilters } from '../types'

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
    q: (q.q as string) || undefined,
  }
}
