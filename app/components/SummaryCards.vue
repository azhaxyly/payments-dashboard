<script setup lang="ts">
import type { SummaryDTO } from '~~/server/types'
import { money } from '~/utils/format'

const props = defineProps<{ summary: SummaryDTO }>()

const cards = computed(() => {
  const s = props.summary
  return [
    { label: 'Проектов / юрлиц', value: String(s.projectCount), hint: 'в текущем фильтре' },
    { label: 'Оплат', value: String(s.paymentCount), hint: 'поступления по проектам' },
    { label: 'Получено', value: money(s.total), hint: 'все оплаченные этапы' },
    { label: 'Акты отправлены', value: money(s.sentAmount), hint: `${s.sentCount} из ${s.paymentCount} оплат` },
    { label: 'Акты подписаны', value: money(s.signedAmount), hint: `${s.signedCount} закрытых оплат` },
    { label: 'Не закрыто актами', value: money(s.unsignedAmount), hint: `${s.paymentCount - s.signedCount} оплат` },
  ]
})
</script>

<template>
  <section class="cards">
    <article v-for="c in cards" :key="c.label" class="card">
      <div class="label">{{ c.label }}</div>
      <div class="value">{{ c.value }}</div>
      <div class="hint">{{ c.hint }}</div>
    </article>
  </section>
</template>

<style scoped>
.cards {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
}
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 16px;
}
.label { font-size: 12px; color: var(--muted); }
.value { font-size: 22px; font-weight: 700; margin: 6px 0 2px; }
.hint { font-size: 12px; color: var(--muted); }
@media (max-width: 1200px) { .cards { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 720px) { .cards { grid-template-columns: repeat(2, 1fr); } }
</style>
