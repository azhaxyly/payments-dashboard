import { defineConfig } from 'drizzle-kit'

const url = process.env.DATABASE_URL || 'file:./dev.db'
const isPg = url.startsWith('postgres')

export default defineConfig({
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: isPg ? 'postgresql' : 'sqlite',
  dbCredentials: isPg
    ? { url }
    : { url: url.replace(/^file:/, '') },
})
