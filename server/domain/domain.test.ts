import { describe, it, expect } from 'vitest'
import { actStatus, daysBetween } from './actStatus'
import { aggregate, type AggregateInput } from './aggregate'
import { fixturePayments } from '../../db/fixture'

const baseline: AggregateInput[] = fixturePayments.map((p) => ({
  project: p.project,
  legalType: p.legalType,
  inn: p.inn,
  ogrn: p.ogrn,
  account: p.account,
  amount: p.amount,
  stage: p.stage,
  isSent: false,
  isSigned: false,
}))

describe('actStatus', () => {
  const fresh = '2026-08-09'
  const old = '2026-07-01'
  const now = '2026-08-09'

  it('не отправлен + свежая дата → not_sent', () => {
    expect(actStatus({ isSent: false, isSigned: false }, fresh, now)).toBe('not_sent')
  })
  it('не отправлен + старая дата → attention', () => {
    expect(actStatus({ isSent: false, isSigned: false }, old, now)).toBe('attention')
  })
  it('отправлен, не подписан, свежая дата → waiting', () => {
    expect(actStatus({ isSent: true, isSigned: false }, fresh, now)).toBe('waiting')
  })
  it('отправлен, не подписан, старая дата → attention', () => {
    expect(actStatus({ isSent: true, isSigned: false }, old, now)).toBe('attention')
  })
  it('подписан → closed (даже на старой дате)', () => {
    expect(actStatus({ isSent: true, isSigned: true }, old, now)).toBe('closed')
  })
  it('порог attention ровно на границе (21 день — ещё не attention)', () => {
    const d21 = '2026-07-19'
    expect(daysBetween(d21, now)).toBe(21)
    expect(actStatus({ isSent: false, isSigned: false }, d21, now)).toBe('not_sent')
  })
})

describe('aggregate — эталонные числа референса (24 записи, исходное состояние)', () => {
  const a = aggregate(baseline)

  it('итог = 1 405 820', () => expect(a.total).toBe(1_405_820))
  it('оплат = 24', () => expect(a.paymentCount).toBe(24))
  it('юрлиц = 19', () => expect(a.projectCount).toBe(19))
  it('sentAmount = 0', () => expect(a.sentAmount).toBe(0))
  it('signedAmount = 0', () => expect(a.signedAmount).toBe(0))
  it('unsignedAmount = total', () => expect(a.unsignedAmount).toBe(1_405_820))
  it('unsentCount = 24', () => expect(a.unsentCount).toBe(24))
  it('крупнейший проект — ПЛАТФОРМА-ЛК, 266 000', () => {
    expect(a.projects[0].project).toBe('ООО "ПЛАТФОРМА-ЛК"')
    expect(a.projects[0].amount).toBe(266_000)
  })
})

describe('aggregate — реакция на смену статусов', () => {
  it('подписание оплаты двигает signedAmount и закрывает проект', () => {
    const list = baseline.map((p, i) => (i === 0 ? { ...p, isSent: true, isSigned: true } : p))
    const a = aggregate(list)
    expect(a.signedAmount).toBe(baseline[0].amount)
    expect(a.unsignedAmount).toBe(1_405_820 - baseline[0].amount)
    const g = a.projects.find((x) => x.project === baseline[0].project)!

    expect(g.closeStatus).toBe('in_work')
  })
})
