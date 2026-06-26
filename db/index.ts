import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

let _client: ReturnType<typeof postgres> | null = null
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

// Ленивый синглтон: на serverless (Vercel/Nitro) модуль переиспользуется между вызовами,
// поэтому соединение создаём один раз и кэшируем, а не на каждый запрос.
export function getDb() {
  if (_db) return _db
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  // prepare: false — Neon отдаёт соединения через пул (PgBouncer в transaction-режиме),
  // который не поддерживает prepared statements; max: 1 — на serverless-инвокацию хватает
  // одного соединения, иначе быстро упрёмся в лимит коннектов пула.
  _client = postgres(url, { ssl: 'require', prepare: false, max: 1 })
  _db = drizzle(_client, { schema })
  return _db
}

export { schema }
