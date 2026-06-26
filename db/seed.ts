import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { resolve } from 'node:path'
import { eq } from 'drizzle-orm'
import * as schema from './schema'
import { fixturePayments } from './fixture'
import { naturalKey } from '../server/domain/naturalKey'

const url = process.env.DATABASE_URL || 'file:./dev.db'
const file = resolve(process.cwd(), url.replace(/^file:/, ''))
const sqlite = new Database(file)
sqlite.pragma('foreign_keys = ON')
const db = drizzle(sqlite, { schema })

function run() {
  let clientsCreated = 0
  let paymentsCreated = 0

  for (const p of fixturePayments) {
    let client = db.select().from(schema.clients).where(eq(schema.clients.inn, p.inn)).get()
    if (!client) {
      client = db
        .insert(schema.clients)
        .values({
          name: p.project,
          legalType: p.legalType,
          inn: p.inn,
          ogrn: p.ogrn,
          bankAccount: p.account,
          bank: p.bank,
        })
        .returning()
        .get()
      clientsCreated++
    }

    let project = db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.clientId, client.id))
      .get()
    if (!project) {
      project = db
        .insert(schema.projects)
        .values({ name: p.project, clientId: client.id, status: 'active' })
        .returning()
        .get()
    }

    const nk = naturalKey(p.date, p.inn, p.doc, p.amount)
    const existing = db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.naturalKey, nk))
      .get()
    if (existing) continue

    const payment = db
      .insert(schema.payments)
      .values({
        projectId: project.id,
        clientId: client.id,
        paymentDate: p.date,
        amount: p.amount,
        paymentPurpose: p.description,
        serviceStage: p.stage,
        invoice: p.invoice,
        doc: p.doc,
        contract: null,
        account: p.account,
        source: 'seed',
        naturalKey: nk,
      })
      .returning()
      .get()
    paymentsCreated++

    db.insert(schema.acts).values({ paymentId: payment.id }).run()
  }

  console.log(`✓ seed: clients +${clientsCreated}, payments +${paymentsCreated} (всего фикстур: ${fixturePayments.length})`)
}

run()
sqlite.close()
