import { eq } from 'drizzle-orm'
import { getDb, schema } from '../../db'
import { naturalKey } from '../domain/naturalKey'
import type { PdfExtractor } from '../ai/extractor'
import { ClaudeExtractor } from '../ai/claude'
import { MockExtractor } from '../ai/mock'
import { extractPdfText } from '../ai/pdf'
import { CONFIDENCE_THRESHOLD, type RawOperation } from '../ai/schema'
import type { IngestReport } from '../types'

export function selectExtractor(): PdfExtractor {
  const cfg = useRuntimeConfig()
  if (cfg.anthropicApiKey) {
    return new ClaudeExtractor(cfg.anthropicApiKey, cfg.aiModel)
  }
  return new MockExtractor()
}

export async function ingestPdf(buffer: Buffer): Promise<IngestReport> {
  const extractor = selectExtractor()
  const pdfText = await extractPdfText(buffer)
  const operations = await extractor.extract(pdfText)
  return upsertOperations(operations, extractor.kind)
}

export function upsertOperations(
  operations: RawOperation[],
  extractorKind: 'claude' | 'mock'
): IngestReport {
  const db = getDb()
  const report: IngestReport = {
    imported: 0,
    skipped: 0,
    needsReview: 0,
    items: [],
    extractor: extractorKind,
  }

  for (const op of operations) {
    if (!op.isProjectPayment) {
      report.skipped++
      report.items.push({
        payer: op.payerName,
        amount: op.amount,
        outcome: 'skipped',
        reason: 'Непроектная операция (депозит/налог/ЗП/аренда/%/комиссия/возврат)',
      })
      continue
    }

    if (op.confidence < CONFIDENCE_THRESHOLD) {
      report.needsReview++
      report.items.push({
        payer: op.payerName,
        amount: op.amount,
        outcome: 'needsReview',
        reason: `Низкая уверенность извлечения (${op.confidence.toFixed(2)})`,
      })
      continue
    }

    const nk = naturalKey(op.date, op.inn, op.doc, op.amount)
    const existing = db
      .select()
      .from(schema.payments)
      .where(eq(schema.payments.naturalKey, nk))
      .get()
    if (existing) {
      report.skipped++
      report.items.push({
        payer: op.payerName,
        amount: op.amount,
        outcome: 'skipped',
        reason: 'Дубль (платёж уже импортирован ранее)',
      })
      continue
    }

    let client = db
      .select()
      .from(schema.clients)
      .where(eq(schema.clients.inn, op.inn))
      .get()
    if (!client) {
      client = db
        .insert(schema.clients)
        .values({
          name: op.payerName,
          legalType: op.legalType,
          inn: op.inn,
          ogrn: op.ogrn,
          bankAccount: op.account,
          bank: op.bank,
        })
        .returning()
        .get()
    }

    let project = db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.clientId, client.id))
      .get()
    if (!project) {
      project = db
        .insert(schema.projects)
        .values({ name: op.payerName, clientId: client.id, status: 'active' })
        .returning()
        .get()
    }

    const payment = db
      .insert(schema.payments)
      .values({
        projectId: project.id,
        clientId: client.id,
        paymentDate: op.date,
        amount: op.amount,
        paymentPurpose: op.purpose,
        serviceStage: op.serviceStage,
        invoice: op.invoice,
        doc: op.doc,
        contract: null,
        account: op.account,
        source: 'ai_ingest',
        naturalKey: nk,
      })
      .returning()
      .get()
    db.insert(schema.acts).values({ paymentId: payment.id }).run()

    report.imported++
    report.items.push({ payer: op.payerName, amount: op.amount, outcome: 'imported' })
  }

  return report
}
