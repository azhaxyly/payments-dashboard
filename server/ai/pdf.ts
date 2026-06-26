export async function extractPdfText(buffer: Buffer | Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import('unpdf')
  const data = buffer instanceof Buffer ? new Uint8Array(buffer) : buffer
  const pdf = await getDocumentProxy(data)
  const { text } = await extractText(pdf, { mergePages: true })
  return Array.isArray(text) ? text.join('\n') : text
}
