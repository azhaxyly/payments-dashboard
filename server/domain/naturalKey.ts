import { createHash } from 'node:crypto'

export function naturalKey(date: string, inn: string, doc: string | null, amount: number): string {
  return createHash('sha1').update(`${date}|${inn}|${doc ?? ''}|${amount}`).digest('hex')
}
