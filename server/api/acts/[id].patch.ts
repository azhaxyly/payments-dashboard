import { patchAct, type ActPatch } from '../../services/acts'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Некорректный id акта' })
  }
  const body = await readBody<ActPatch>(event)
  const patch: ActPatch = {
    isSent: typeof body?.isSent === 'boolean' ? body.isSent : undefined,
    isSigned: typeof body?.isSigned === 'boolean' ? body.isSigned : undefined,
    comment: typeof body?.comment === 'string' ? body.comment : undefined,
  }
  const result = await patchAct(id, patch)
  if (!result) {
    throw createError({ statusCode: 404, statusMessage: 'Акт не найден' })
  }
  return result
})
