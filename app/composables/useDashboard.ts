import { ref, reactive, computed, watch } from 'vue'
import type {
  PaymentDTO,
  SummaryDTO,
  ProjectSummaryDTO,
  ActDTO,
} from '~~/server/types'
import type { ActStatus } from '~~/server/domain/actStatus'

export interface Filters {
  q: string
  project: string
  legalEntity: string
  stage: string
  from: string
  to: string
  sent: '' | 'yes' | 'no'
  signed: '' | 'yes' | 'no'
  status: '' | ActStatus
}

interface FilterOptions {
  projects: string[]
  legalEntities: string[]
  stages: string[]
  dateRange: { from: string; to: string }
}

const emptySummary: SummaryDTO = {
  total: 0,
  paymentCount: 0,
  projectCount: 0,
  sentAmount: 0,
  sentCount: 0,
  signedAmount: 0,
  signedCount: 0,
  unsignedAmount: 0,
  unsentCount: 0,
  topProject: null,
}

export function useDashboard() {
  const filters = reactive<Filters>({
    q: '',
    project: '',
    legalEntity: '',
    stage: '',
    from: '',
    to: '',
    sent: '',
    signed: '',
    status: '',
  })

  const items = ref<PaymentDTO[]>([])
  const summary = ref<SummaryDTO>({ ...emptySummary })
  const projects = ref<ProjectSummaryDTO[]>([])
  const options = ref<FilterOptions>({ projects: [], legalEntities: [], stages: [], dateRange: { from: '', to: '' } })
  const loading = ref(false)

  function query() {
    const q: Record<string, string> = {}
    if (filters.q) q.q = filters.q
    if (filters.project) q.project = filters.project
    if (filters.legalEntity) q.legalEntity = filters.legalEntity
    if (filters.stage) q.stage = filters.stage
    if (filters.from) q.from = filters.from
    if (filters.to) q.to = filters.to
    if (filters.sent) q.sent = filters.sent
    if (filters.signed) q.signed = filters.signed
    if (filters.status) q.status = filters.status
    return q
  }

  async function refresh() {
    loading.value = true
    try {
      const [pay, proj] = await Promise.all([
        $fetch<{ items: PaymentDTO[]; summary: SummaryDTO }>('/api/payments', { query: query() }),
        $fetch<{ items: ProjectSummaryDTO[] }>('/api/projects', { query: query() }),
      ])
      items.value = pay.items
      summary.value = pay.summary
      projects.value = proj.items
    } finally {
      loading.value = false
    }
  }

  async function loadOptions() {
    options.value = await $fetch<FilterOptions>('/api/filter-options')
    if (!filters.from) filters.from = options.value.dateRange.from
    if (!filters.to) filters.to = options.value.dateRange.to
  }

  function resetFilters() {
    filters.q = ''
    filters.project = ''
    filters.legalEntity = ''
    filters.stage = ''
    filters.sent = ''
    filters.signed = ''
    filters.status = ''
    filters.from = options.value.dateRange.from
    filters.to = options.value.dateRange.to
  }

  async function patchAct(
    payment: PaymentDTO,
    patch: { isSent?: boolean; isSigned?: boolean; comment?: string }
  ) {
    const prev = { ...payment.act, status: payment.status }

    if (patch.isSent !== undefined) payment.act.isSent = patch.isSent
    if (patch.isSigned !== undefined) {
      payment.act.isSigned = patch.isSigned
      if (patch.isSigned) payment.act.isSent = true
    }
    if (patch.comment !== undefined) payment.act.comment = patch.comment
    try {
      const updated = await $fetch<ActDTO>(`/api/acts/${payment.act.id}`, {
        method: 'PATCH',
        body: patch,
      })
      payment.act.isSent = updated.isSent
      payment.act.isSigned = updated.isSigned
      payment.act.comment = updated.comment
      payment.status = updated.status

      await refresh()
    } catch (e) {
      payment.act.isSent = prev.isSent
      payment.act.isSigned = prev.isSigned
      payment.act.comment = prev.comment
      payment.status = prev.status
      throw e
    }
  }

  let qTimer: ReturnType<typeof setTimeout> | undefined
  watch(
    () => filters.q,
    () => {
      clearTimeout(qTimer)
      qTimer = setTimeout(refresh, 250)
    }
  )
  watch(
    () => [filters.project, filters.legalEntity, filters.stage, filters.from, filters.to, filters.sent, filters.signed, filters.status],
    refresh
  )

  const hasActiveFilters = computed(
    () =>
      !!(filters.q || filters.project || filters.legalEntity || filters.stage || filters.sent || filters.signed || filters.status) ||
      filters.from !== options.value.dateRange.from ||
      filters.to !== options.value.dateRange.to
  )

  return {
    filters,
    items,
    summary,
    projects,
    options,
    loading,
    hasActiveFilters,
    refresh,
    loadOptions,
    resetFilters,
    patchAct,
  }
}
