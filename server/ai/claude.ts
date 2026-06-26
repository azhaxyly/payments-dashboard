import Anthropic from '@anthropic-ai/sdk'
import { zodToJsonSchema } from 'zod-to-json-schema'
import type { PdfExtractor } from './extractor'
import { ExtractionResult, RawOperation, SERVICE_STAGES } from './schema'

const SYSTEM_PROMPT = `Ты — парсер банковских выписок российского digital-агентства. На вход — текст выписки.
Извлеки КАЖДУЮ операцию ПОСТУПЛЕНИЯ средств (приход на счёт агентства). Для каждой операции определи:
- реквизиты плательщика: полное наименование, ИНН (10 или 12 цифр), ОГРН/ОГРНИП, расчётный счёт, банк;
- сумму (число в рублях), дату в формате YYYY-MM-DD, номер платёжного документа, счёт/договор из назначения, полное назначение;
- serviceStage — нормализованный тип услуги строго из словаря: ${SERVICE_STAGES.join(', ')}. Если неясно — "Оплата по проекту";
- isProjectPayment: true ТОЛЬКО если это оплата клиента за услугу/этап работ.
  Поставь false для: пополнений/депозитов собственными средствами, процентов банка на остаток, налогов и взносов,
  выплат зарплаты, аренды, комиссий банка, переводов между своими счетами, возвратов.
- confidence 0..1 — насколько уверен в извлечении полей.
Не выдумывай ИНН, суммы и реквизиты. Если поле отсутствует в тексте — верни null.
Верни результат строго через вызов инструмента emit_operations.`

export class ClaudeExtractor implements PdfExtractor {
  readonly kind = 'claude' as const
  private client: Anthropic
  private model: string

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey })
    this.model = model
  }

  async extract(pdfText: string): Promise<RawOperation[]> {
    const inputSchema = zodToJsonSchema(ExtractionResult, { target: 'openApi3' })

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      tools: [
        {
          name: 'emit_operations',
          description: 'Передать извлечённые операции поступления средств из банковской выписки.',
          input_schema: inputSchema as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: 'tool', name: 'emit_operations' },
      messages: [{ role: 'user', content: `Текст выписки:\n<<<\n${pdfText}\n>>>` }],
    })

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    )
    if (!toolUse) {
      throw new ExtractionError('Модель не вернула структурированный результат (нет tool_use).')
    }

    const parsed = ExtractionResult.safeParse(toolUse.input)
    if (!parsed.success) {
      throw new ExtractionError(
        `Ответ модели не прошёл валидацию схемы: ${parsed.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; ')}`
      )
    }
    return parsed.data.operations
  }
}

export class ExtractionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ExtractionError'
  }
}
