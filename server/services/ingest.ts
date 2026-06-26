import { eq } from 'drizzle-orm'
import { getDb, schema } from '../../db'
import { naturalKey } from '../domain/naturalKey'
import type { PdfExtractor } from '../ai/extractor'
import { ClaudeExtractor } from '../ai/claude'
import { MockExtractor } from '../ai/mock'
import { extractPdfText } from '../ai/pdf'
import { CONFIDENCE_THRESHOLD, type RawOperation } from '../ai/schema'
import type { IngestReport } from '../types'

// Выбор стратегии извлечения за интерфейсом PdfExtractor: есть ключ — реальный Claude,
// нет — MockExtractor (golden-fixture). Так демо и CI остаются зелёными без API-ключа,
// а подмена реализации точечная — остальной пайплайн от выбора не зависит.
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

export async function upsertOperations(
  operations: RawOperation[],
  extractorKind: 'claude' | 'mock'
): Promise<IngestReport> {
  const db = getDb()
  const report: IngestReport = {
    imported: 0,
    skipped: 0,
    needsReview: 0,
    items: [],
    extractor: extractorKind,
  }

  // Три отсечки до записи, по убыванию «дешевизны» проверки: непроектная операция →
  // низкая уверенность → дубль по натуральному ключу. Всё, что отсеяли, попадает в отчёт
  // с причиной, чтобы оператор видел, почему платёж не импортирован.
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
    const existing = (
      await db.select().from(schema.payments).where(eq(schema.payments.naturalKey, nk))
    )[0]
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

    let client = (
      await db.select().from(schema.clients).where(eq(schema.clients.inn, op.inn))
    )[0]
    if (!client) {
      client = (
        await db
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
      )[0]
    }

    // Клиент и проект создаём на лету по мере распознавания. По умолчанию 1 проект на
    // клиента (схема допускает несколько) — исходные данные дают именно связь 1:1.
    let project = (
      await db.select().from(schema.projects).where(eq(schema.projects.clientId, client.id))
    )[0]
    if (!project) {
      project = (
        await db
          .insert(schema.projects)
          .values({ name: op.payerName, clientId: client.id, status: 'active' })
          .returning()
      )[0]
    }

    const payment = (
      await db
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
    )[0]
    await db.insert(schema.acts).values({ paymentId: payment.id })

    report.imported++
    report.items.push({ payer: op.payerName, amount: op.amount, outcome: 'imported' })
  }

  return report
}
