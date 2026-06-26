import type { RawOperation } from './schema'

export interface PdfExtractor {
  readonly kind: 'claude' | 'mock'
  extract(pdfText: string): Promise<RawOperation[]>
}
