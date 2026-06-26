import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import * as schema from './schema'

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

function dbFilePath(): string {
  const url = process.env.DATABASE_URL || 'file:./dev.db'
  return resolve(process.cwd(), url.replace(/^file:/, ''))
}

export function getDb() {
  if (_db) return _db
  const sqlite = new Database(dbFilePath())
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  _db = drizzle(sqlite, { schema })
  return _db
}

export function dbExists(): boolean {
  return existsSync(dbFilePath())
}

export { schema }
