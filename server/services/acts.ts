import { eq } from 'drizzle-orm'
import { getDb, schema } from '../../db'
import { actStatus } from '../domain/actStatus'
import type { ActDTO } from '../types'

export interface ActPatch {
  isSent?: boolean
  isSigned?: boolean
  comment?: string
}

export async function patchAct(id: number, patch: ActPatch): Promise<ActDTO | null> {
  const db = getDb()
  const act = (await db.select().from(schema.acts).where(eq(schema.acts.id, id)))[0]
  if (!act) return null

  const now = new Date()
  let isSent = patch.isSent ?? act.isSent
  let isSigned = patch.isSigned ?? act.isSigned
  if (isSigned) isSent = true

  const updated = (
    await db
      .update(schema.acts)
      .set({
        isSent,
        isSigned,
        sentAt: isSent ? (act.sentAt ?? now) : null,
        signedAt: isSigned ? (act.signedAt ?? now) : null,
        managerComment: patch.comment ?? act.managerComment,
        updatedAt: now,
      })
      .where(eq(schema.acts.id, id))
      .returning()
  )[0]

  const payment = (
    await db.select().from(schema.payments).where(eq(schema.payments.id, updated.paymentId))
  )[0]

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
