import { filterOptions } from '../services/payments'

export default defineEventHandler(() => {
  return filterOptions()
})
