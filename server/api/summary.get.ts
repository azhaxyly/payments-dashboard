import { listPayments } from '../services/payments'

export default defineEventHandler(async (event) => {
  const { summary } = await listPayments(parseFilters(event))
  return summary
})
