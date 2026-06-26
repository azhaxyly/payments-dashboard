import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export const clients = sqliteTable('clients', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  legalType: text('legal_type').notNull(),
  inn: text('inn').notNull().unique(),
  ogrn: text('ogrn'),
  bankAccount: text('bank_account'),
  bank: text('bank'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const projects = sqliteTable('projects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  clientId: integer('client_id')
    .notNull()
    .references(() => clients.id),
  status: text('status').notNull().default('active'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const payments = sqliteTable('payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id),
  clientId: integer('client_id')
    .notNull()
    .references(() => clients.id),
  paymentDate: text('payment_date').notNull(),
  amount: real('amount').notNull(),
  paymentPurpose: text('payment_purpose').notNull(),
  serviceStage: text('service_stage').notNull(),
  invoice: text('invoice'),
  doc: text('doc'),
  contract: text('contract'),
  account: text('account'),
  source: text('source').notNull().default('seed'),
  naturalKey: text('natural_key').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const acts = sqliteTable('acts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  paymentId: integer('payment_id')
    .notNull()
    .unique()
    .references(() => payments.id),
  isSent: integer('is_sent', { mode: 'boolean' }).notNull().default(false),
  sentAt: integer('sent_at', { mode: 'timestamp' }),
  isSigned: integer('is_signed', { mode: 'boolean' }).notNull().default(false),
  signedAt: integer('signed_at', { mode: 'timestamp' }),
  managerComment: text('manager_comment').notNull().default(''),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export type Client = typeof clients.$inferSelect
export type Project = typeof projects.$inferSelect
export type Payment = typeof payments.$inferSelect
export type Act = typeof acts.$inferSelect
