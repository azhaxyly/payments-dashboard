;(process as NodeJS.Process & { loadEnvFile?: (p?: string) => void }).loadEnvFile?.('.env')

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq } from 'drizzle-orm'
import * as schema from './schema'
import { fixturePayments } from './fixture'
import { naturalKey } from '../server/domain/naturalKey'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is not set')
const client = postgres(url, { ssl: 'require', prepare: false, max: 1 })
const db = drizzle(client, { schema })

async function run() {
  let clientsCreated = 0
  let paymentsCreated = 0

  for (const p of fixturePayments) {
    let clientRow = (
      await db.select().from(schema.clients).where(eq(schema.clients.inn, p.inn))
    )[0]
    if (!clientRow) {
      clientRow = (
        await db
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
      )[0]
      clientsCreated++
    }

    let project = (
      await db.select().from(schema.projects).where(eq(schema.projects.clientId, clientRow.id))
    )[0]
    if (!project) {
      project = (
        await db
          .insert(schema.projects)
          .values({ name: p.project, clientId: clientRow.id, status: 'active' })
          .returning()
      )[0]
    }

    const nk = naturalKey(p.date, p.inn, p.doc, p.amount)
    const existing = (
      await db.select().from(schema.payments).where(eq(schema.payments.naturalKey, nk))
    )[0]
    if (existing) continue

    const payment = (
      await db
        .insert(schema.payments)
        .values({
          projectId: project.id,
          clientId: clientRow.id,
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
    )[0]
    paymentsCreated++

    await db.insert(schema.acts).values({ paymentId: payment.id })
  }

  console.log(
    `seed: clients +${clientsCreated}, payments +${paymentsCreated} (fixtures: ${fixturePayments.length})`
  )
}

await run()
await client.end()
