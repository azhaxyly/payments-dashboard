import { eq } from 'drizzle-orm'
import { getDb, schema } from '../../db'
import { actStatus } from '../domain/actStatus'
import type { ActDTO } from '../types'

export interface ActPatch {
  isSent?: boolean
  isSigned?: boolean
  comment?: string
}

export function patchAct(id: number, patch: ActPatch): ActDTO | null {
  const db = getDb()
  const act = db.select().from(schema.acts).where(eq(schema.acts.id, id)).get()
  if (!act) return null

  const now = new Date()
  let isSent = patch.isSent ?? act.isSent
  let isSigned = patch.isSigned ?? act.isSigned
  if (isSigned) isSent = true

  const next = {
    isSent,
    isSigned,
    sentAt: isSent ? (act.sentAt ?? now) : null,
    signedAt: isSigned ? (act.signedAt ?? now) : null,
    managerComment: patch.comment ?? act.managerComment,
    updatedAt: now,
  }

  const updated = db
    .update(schema.acts)
    .set(next)
    .where(eq(schema.acts.id, id))
    .returning()
    .get()

  const payment = db
    .select()
    .from(schema.payments)
    .where(eq(schema.payments.id, updated.paymentId))
    .get()

  return {
    id: updated.id,
    paymentId: updated.paymentId,
    isSent: updated.isSent,
    isSigned: updated.isSigned,
    comment: updated.managerComment,
    status: actStatus(
      { isSent: updated.isSent, isSigned: updated.isSigned },
      payment?.paymentDate ?? '1970-01-01'
    ),
  }
}
