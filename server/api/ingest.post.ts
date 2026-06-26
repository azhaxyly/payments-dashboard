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
    if (e instanceof ExtractionError) {
      throw createError({ statusCode: 422, statusMessage: e.message })
    }

    console.error('[ingest] pipeline error:', e)
    throw createError({
      statusCode: 503,
      statusMessage: 'Сбой AI-пайплайна обработки выписки. Попробуйте позже.',
    })
  }
})
