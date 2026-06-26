import { listPayments } from '../services/payments'

export default defineEventHandler((event) => {
  return listPayments(parseFilters(event))
})
