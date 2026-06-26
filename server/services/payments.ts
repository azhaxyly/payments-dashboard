import { eq } from 'drizzle-orm'
import { getDb, schema } from '../../db'
import { actStatus } from '../domain/actStatus'
import { aggregate, type AggregateInput } from '../domain/aggregate'
import type {
  PaymentFilters,
  PaymentDTO,
  SummaryDTO,
  ProjectSummaryDTO,
} from '../types'

function ruDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

interface JoinedRow {
  payment: typeof schema.payments.$inferSelect
  client: typeof schema.clients.$inferSelect
  project: typeof schema.projects.$inferSelect
  act: typeof schema.acts.$inferSelect
}

async function loadJoined(): Promise<JoinedRow[]> {
  const db = getDb()
  return db
    .select({
      payment: schema.payments,
      client: schema.clients,
      project: schema.projects,
      act: schema.acts,
    })
    .from(schema.payments)
    .innerJoin(schema.clients, eq(schema.payments.clientId, schema.clients.id))
    .innerJoin(schema.projects, eq(schema.payments.projectId, schema.projects.id))
    .innerJoin(schema.acts, eq(schema.acts.paymentId, schema.payments.id))
}

function toDTO(r: JoinedRow): PaymentDTO {
  return {
    id: r.payment.id,
    date: r.payment.paymentDate,
    dateRu: ruDate(r.payment.paymentDate),
    project: r.project.name,
    client: {
      name: r.client.name,
      legalType: r.client.legalType,
      inn: r.client.inn,
      ogrn: r.client.ogrn,
      account: r.client.account ?? r.client.bankAccount,
      bank: r.client.bank,
    },
    amount: r.payment.amount,
    stage: r.payment.serviceStage,
    invoice: r.payment.invoice,
    doc: r.payment.doc,
    purpose: r.payment.paymentPurpose,
    period: '',
    act: {
      id: r.act.id,
      isSent: r.act.isSent,
      isSigned: r.act.isSigned,
      comment: r.act.managerComment,
    },
    status: actStatus(
      { isSent: r.act.isSent, isSigned: r.act.isSigned },
      r.payment.paymentDate
    ),
  }
}

function matchesFilters(r: JoinedRow, f: PaymentFilters): boolean {
  if (f.project && r.project.name !== f.project) return false
  if (f.legalEntity && r.client.name !== f.legalEntity) return false
  if (f.stage && r.payment.serviceStage !== f.stage) return false
  if (f.from && r.payment.paymentDate < f.from) return false
  if (f.to && r.payment.paymentDate > f.to) return false
  if (f.sent === 'yes' && !r.act.isSent) return false
  if (f.sent === 'no' && r.act.isSent) return false
  if (f.signed === 'yes' && !r.act.isSigned) return false
  if (f.signed === 'no' && r.act.isSigned) return false
  if (
    f.status &&
    actStatus({ isSent: r.act.isSent, isSigned: r.act.isSigned }, r.payment.paymentDate) !== f.status
  )
    return false
  if (f.q) {
    const hay = [
      r.project.name,
      r.client.inn,
      r.client.ogrn,
      r.client.account ?? r.client.bankAccount,
      r.payment.serviceStage,
      r.payment.invoice,
      r.payment.doc,
      r.payment.paymentPurpose,
      r.act.managerComment,
    ]
      .join(' ')
      .toLowerCase()
    if (!hay.includes(f.q.toLowerCase())) return false
  }
  return true
}

function toAggInput(rows: JoinedRow[]): AggregateInput[] {
  return rows.map((r) => ({
    project: r.project.name,
    legalType: r.client.legalType,
    inn: r.client.inn,
    ogrn: r.client.ogrn,
    account: r.client.account ?? r.client.bankAccount,
    amount: r.payment.amount,
    stage: r.payment.serviceStage,
    isSent: r.act.isSent,
    isSigned: r.act.isSigned,
  }))
}

export async function listPayments(f: PaymentFilters): Promise<{
  items: PaymentDTO[]
  summary: SummaryDTO
}> {
  const rows = (await loadJoined()).filter((r) => matchesFilters(r, f))
  const items = rows
    .map(toDTO)
    .sort((a, b) => a.date.localeCompare(b.date) || a.project.localeCompare(b.project, 'ru'))
  const a = aggregate(toAggInput(rows))
  const top = a.projects[0]
  const summary: SummaryDTO = {
    total: a.total,
    paymentCount: a.paymentCount,
    projectCount: a.projectCount,
    sentAmount: a.sentAmount,
    sentCount: a.sentCount,
    signedAmount: a.signedAmount,
    signedCount: a.signedCount,
    unsignedAmount: a.unsignedAmount,
    unsentCount: a.unsentCount,
    topProject: top ? { name: top.project, amount: top.amount } : null,
  }
  return { items, summary }
}

export async function listProjects(f: PaymentFilters): Promise<{ items: ProjectSummaryDTO[] }> {
  const rows = (await loadJoined()).filter((r) => matchesFilters(r, f))
  const a = aggregate(toAggInput(rows))
  return {
    items: a.projects.map((g) => ({
      name: g.project,
      legalType: g.legalType,
      inn: g.inn,
      ogrn: g.ogrn,
      account: g.account,
      count: g.count,
      amount: g.amount,
      sentAmount: g.sentAmount,
      sentCount: g.sentCount,
      signedAmount: g.signedAmount,
      signedCount: g.signedCount,
      stages: g.stages,
      closeStatus: g.closeStatus,
      signedPct: g.signedPct,
    })),
  }
}

export async function filterOptions(): Promise<{
  projects: string[]
  legalEntities: string[]
  stages: string[]
  dateRange: { from: string; to: string }
}> {
  const rows = await loadJoined()
  const projects = [...new Set(rows.map((r) => r.project.name))].sort((a, b) => a.localeCompare(b, 'ru'))
  const legalEntities = [...new Set(rows.map((r) => r.client.name))].sort((a, b) => a.localeCompare(b, 'ru'))
  const stages = [...new Set(rows.map((r) => r.payment.serviceStage))].sort((a, b) => a.localeCompare(b, 'ru'))
  const dates = rows.map((r) => r.payment.paymentDate).sort()
  return {
    projects,
    legalEntities,
    stages,
    dateRange: { from: dates[0] ?? '', to: dates[dates.length - 1] ?? '' },
  }
}
