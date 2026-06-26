export interface AggregateInput {
  project: string
  legalType: string
  inn: string
  ogrn: string | null
  account: string | null
  amount: number
  stage: string
  isSent: boolean
  isSigned: boolean
}

export interface ProjectSummary {
  project: string
  legalType: string
  inn: string
  ogrn: string | null
  account: string | null
  count: number
  amount: number
  sentAmount: number
  signedAmount: number
  sentCount: number
  signedCount: number
  stages: string[]
  signedPct: number
  closeStatus: 'closed' | 'in_work' | 'open'
}

export interface Aggregate {
  total: number
  paymentCount: number
  projectCount: number
  sentAmount: number
  sentCount: number
  signedAmount: number
  signedCount: number
  unsignedAmount: number
  unsentCount: number
  projects: ProjectSummary[]
}

export function aggregate(list: AggregateInput[]): Aggregate {
  const groups = new Map<string, ProjectSummary>()
  let total = 0
  let sentAmount = 0
  let signedAmount = 0
  let sentCount = 0
  let signedCount = 0

  for (const p of list) {
    total += p.amount
    if (p.isSent) {
      sentAmount += p.amount
      sentCount++
    }
    if (p.isSigned) {
      signedAmount += p.amount
      signedCount++
    }

    let g = groups.get(p.project)
    if (!g) {
      g = {
        project: p.project,
        legalType: p.legalType,
        inn: p.inn,
        ogrn: p.ogrn,
        account: p.account,
        count: 0,
        amount: 0,
        sentAmount: 0,
        signedAmount: 0,
        sentCount: 0,
        signedCount: 0,
        stages: [],
        signedPct: 0,
        closeStatus: 'open',
      }
      groups.set(p.project, g)
    }
    g.count++
    g.amount += p.amount
    if (!g.stages.includes(p.stage)) g.stages.push(p.stage)
    if (p.isSent) {
      g.sentAmount += p.amount
      g.sentCount++
    }
    if (p.isSigned) {
      g.signedAmount += p.amount
      g.signedCount++
    }
  }

  // Проекты — по убыванию суммы (крупнейшие плательщики сверху).
  const projects = [...groups.values()].sort((a, b) => b.amount - a.amount)
  for (const g of projects) {
    g.signedPct = g.amount ? Math.round((g.signedAmount / g.amount) * 100) : 0
    // Статус проекта на уровне закрытия актов: closed — все акты подписаны;
    // in_work — хоть один отправлен; open — ничего ещё не отправлено.
    g.closeStatus =
      g.count > 0 && g.signedCount === g.count ? 'closed' : g.sentCount > 0 ? 'in_work' : 'open'
  }

  return {
    total,
    paymentCount: list.length,
    projectCount: groups.size,
    sentAmount,
    sentCount,
    signedAmount,
    signedCount,
    unsignedAmount: total - signedAmount,
    unsentCount: list.length - sentCount,
    projects,
  }
}
