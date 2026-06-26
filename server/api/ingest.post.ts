import { ingestPdf } from '../services/ingest'
import { ExtractionError } from '../ai/claude'

export default defineEventHandler(async (event) => {
  const form = await readMultipartFormData(event)
  const filePart = form?.find((p) => p.name === 'file' && p.filename)
  if (!filePart) {
    throw createError({ statusCode: 400, statusMessage: 'Не приложен PDF-файл (поле file)' })
  }
  const isPdf =
    filePart.type === 'application/pdf' || filePart.filename?.toLowerCase().endsWith('.pdf')
  if (!isPdf) {
    throw createError({ statusCode: 400, statusMessage: 'Ожидается файл формата PDF' })
  }

  try {
    return await ingestPdf(filePart.data)
  } catch (e) {
    // Различаем «какая часть пайплайна упала»: ExtractionError — модель вернула пустой/
    // невалидный по схеме результат (вина данных/ответа) → 422, клиент видит причину.
    if (e instanceof ExtractionError) {
      throw createError({ statusCode: 422, statusMessage: e.message })
    }

    // Всё остальное (таймаут SDK, сбой парсера PDF, БД) — инфраструктурная ошибка → 503.
    console.error('[ingest] pipeline error:', e)
    throw createError({
      statusCode: 503,
      statusMessage: 'Сбой AI-пайплайна обработки выписки. Попробуйте позже.',
    })
  }
})
