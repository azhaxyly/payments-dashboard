import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import Database from 'better-sqlite3'
import { resolve } from 'node:path'

const url = process.env.DATABASE_URL || 'file:./dev.db'
const file = resolve(process.cwd(), url.replace(/^file:/, ''))

const sqlite = new Database(file)
const db = drizzle(sqlite)

migrate(db, { migrationsFolder: resolve(process.cwd(), 'db/migrations') })
console.log('✓ migrations applied →', file)
sqlite.close()
