import { listProjects } from '../services/payments'

export default defineEventHandler((event) => {
  return listProjects(parseFilters(event))
})
