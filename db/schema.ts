import {
  pgTable,
  serial,
  text,
  integer,
  doublePrecision,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core'

export const clients = pgTable('clients', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  legalType: text('legal_type').notNull(),
  inn: text('inn').notNull().unique(),
  ogrn: text('ogrn'),
  bankAccount: text('bank_account'),
  bank: text('bank'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  clientId: integer('client_id')
    .notNull()
    .references(() => clients.id),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id),
  clientId: integer('client_id')
    .notNull()
    .references(() => clients.id),
  paymentDate: text('payment_date').notNull(),
  amount: doublePrecision('amount').notNull(),
  paymentPurpose: text('payment_purpose').notNull(),
  serviceStage: text('service_stage').notNull(),
  invoice: text('invoice'),
  doc: text('doc'),
  contract: text('contract'),
  account: text('account'),
  source: text('source').notNull().default('seed'),
  naturalKey: text('natural_key').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const acts = pgTable('acts', {
  id: serial('id').primaryKey(),
  paymentId: integer('payment_id')
    .notNull()
    .unique()
    .references(() => payments.id),
  isSent: boolean('is_sent').notNull().default(false),
  sentAt: timestamp('sent_at'),
  isSigned: boolean('is_signed').notNull().default(false),
  signedAt: timestamp('signed_at'),
  managerComment: text('manager_comment').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export type Client = typeof clients.$inferSelect
export type Project = typeof projects.$inferSelect
export type Payment = typeof payments.$inferSelect
export type Act = typeof acts.$inferSelect
