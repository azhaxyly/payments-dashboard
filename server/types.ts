import type { ActStatus } from './domain/actStatus'

export interface PaymentFilters {
  project?: string
  legalEntity?: string
  stage?: string
  from?: string
  to?: string
  sent?: 'yes' | 'no'
  signed?: 'yes' | 'no'
  q?: string
}

export interface PaymentDTO {
  id: number
  date: string
  dateRu: string
  project: string
  client: {
    name: string
    legalType: string
    inn: string
    ogrn: string | null
    account: string | null
    bank: string | null
  }
  amount: number
  stage: string
  invoice: string | null
  doc: string | null
  purpose: string
  period: string
  act: { id: number; isSent: boolean; isSigned: boolean; comment: string }
  status: ActStatus
}

export interface SummaryDTO {
  total: number
  paymentCount: number
  projectCount: number
  sentAmount: number
  sentCount: number
  signedAmount: number
  signedCount: number
  unsignedAmount: number
  unsentCount: number
  topProject: { name: string; amount: number } | null
}

export interface ProjectSummaryDTO {
  name: string
  legalType: string
  inn: string
  ogrn: string | null
  account: string | null
  count: number
  amount: number
  sentAmount: number
  sentCount: number
  signedAmount: number
  signedCount: number
  stages: string[]
  closeStatus: 'closed' | 'in_work' | 'open'
  signedPct: number
}

export interface ActDTO {
  id: number
  paymentId: number
  isSent: boolean
  isSigned: boolean
  comment: string
  status: ActStatus
}

export interface IngestReport {
  imported: number
  skipped: number
  needsReview: number
  items: Array<{
    payer: string
    amount: number
    outcome: 'imported' | 'skipped' | 'needsReview'
    reason?: string
  }>
  extractor: 'claude' | 'mock'
}
