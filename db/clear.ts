;(process as NodeJS.Process & { loadEnvFile?: (p?: string) => void }).loadEnvFile?.('.env')

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is not set')
const client = postgres(url, { ssl: 'require', prepare: false, max: 1 })
const db = drizzle(client, { schema })

// Удаляем в порядке, безопасном по внешним ключам: acts -> payments -> projects -> clients.
// Восстановить эталонные данные можно через `pnpm db:seed`.
async function run() {
  const acts = await db.delete(schema.acts).returning({ id: schema.acts.id })
  const payments = await db.delete(schema.payments).returning({ id: schema.payments.id })
  const projects = await db.delete(schema.projects).returning({ id: schema.projects.id })
  const clients = await db.delete(schema.clients).returning({ id: schema.clients.id })
  console.log(
    `Удалено: acts=${acts.length}, payments=${payments.length}, projects=${projects.length}, clients=${clients.length}`
  )
}

run()
  .then(() => client.end())
  .catch(async (e) => {
    console.error(e)
    await client.end()
    process.exit(1)
  })
