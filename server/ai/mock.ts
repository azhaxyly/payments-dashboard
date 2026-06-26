import type { PdfExtractor } from './extractor'
import type { RawOperation } from './schema'
import { fixturePayments } from '../../db/fixture'

export class MockExtractor implements PdfExtractor {
  readonly kind = 'mock' as const

  async extract(_pdfText: string): Promise<RawOperation[]> {
    const projectOps: RawOperation[] = fixturePayments.map((p) => ({
      date: p.date,
      payerName: p.project,
      legalType: p.legalType,
      inn: p.inn,
      ogrn: p.ogrn,
      account: p.account,
      bank: p.bank,
      amount: p.amount,
      doc: p.doc,
      invoice: p.invoice,
      purpose: p.description,
      serviceStage: p.stage,
      isProjectPayment: true,
      confidence: 0.95,
    }))

    // Намеренно подмешиваем 2 непроектные операции (пополнение своими средствами и возврат
    // налога): без API-ключа они демонстрируют работу отсева — уходят в skipped, а не в БД.
    const nonProjectOps: RawOperation[] = [
      {
        date: '2026-07-20',
        payerName: 'ООО "ДИДЖИТАЛ ВЭЙ" (собственный счёт)',
        legalType: 'ООО',
        inn: '7700000000',
        ogrn: null,
        account: null,
        bank: null,
        amount: 150000,
        doc: 'DEP-1',
        invoice: null,
        purpose: 'Пополнение расчётного счёта собственными средствами. Без НДС.',
        serviceStage: 'Оплата по проекту',
        isProjectPayment: false,
        confidence: 0.9,
      },
      {
        date: '2026-07-28',
        payerName: 'ИФНС России',
        legalType: 'Иное',
        inn: '7701000000',
        ogrn: null,
        account: null,
        bank: null,
        amount: 23000,
        doc: 'TAX-7',
        invoice: null,
        purpose: 'Возврат излишне уплаченного налога (УСН).',
        serviceStage: 'Оплата по проекту',
        isProjectPayment: false,
        confidence: 0.88,
      },
    ]

    return [...projectOps, ...nonProjectOps]
  }
}
