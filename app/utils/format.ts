const rub0 = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
})
const rub2 = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export const money = (n: number) => rub0.format(n)
export const money2 = (n: number) => rub2.format(n)

export const STATUS_META: Record<string, { text: string; cls: string }> = {
  not_sent: { text: 'Акт не отправлен', cls: 'open' },
  waiting: { text: 'Ждём подпись', cls: 'wait' },
  closed: { text: 'Закрыт', cls: 'done' },
  attention: { text: 'Требует внимания', cls: 'attention' },
}
