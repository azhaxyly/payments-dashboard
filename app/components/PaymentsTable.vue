<script setup lang="ts">
import type { PaymentDTO } from '~~/server/types'
import { money2, STATUS_META } from '~/utils/format'

const props = defineProps<{ items: PaymentDTO[] }>()
const emit = defineEmits<{
  patch: [payment: PaymentDTO, patch: { isSent?: boolean; isSigned?: boolean; comment?: string }]
}>()

let commentTimer: ReturnType<typeof setTimeout> | undefined
function onComment(p: PaymentDTO, value: string) {
  p.act.comment = value
  clearTimeout(commentTimer)
  commentTimer = setTimeout(() => emit('patch', p, { comment: value }), 400)
}
</script>

<template>
  <div class="wrap">
    <table>
      <thead>
        <tr>
          <th>Дата</th>
          <th>Проект / юрлицо</th>
          <th>ИНН / ОГРН</th>
          <th>Этап</th>
          <th>Счёт / назначение</th>
          <th class="r">Сумма</th>
          <th class="c">Отпр.</th>
          <th class="c">Подп.</th>
          <th>Статус</th>
          <th>Комментарий</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in items" :key="p.id">
          <td><b>{{ p.dateRu }}</b></td>
          <td>
            <b>{{ p.project }}</b>
            <div class="muted sm">{{ p.client.legalType }} · р/с {{ p.client.account }}</div>
          </td>
          <td>
            <div>ИНН {{ p.client.inn }}</div>
            <div class="muted sm">{{ p.client.ogrn }}</div>
          </td>
          <td><span class="stage">{{ p.stage }}</span></td>
          <td>
            <b>{{ p.invoice }}</b>
            <div class="muted sm">Док. {{ p.doc }}</div>
            <div class="muted sm clamp">{{ p.purpose }}</div>
          </td>
          <td class="r mono">{{ money2(p.amount) }}</td>
          <td class="c">
            <input
              type="checkbox"
              :checked="p.act.isSent"
              :disabled="p.act.isSigned"
              @change="emit('patch', p, { isSent: ($event.target as HTMLInputElement).checked })"
            />
          </td>
          <td class="c">
            <input
              type="checkbox"
              :checked="p.act.isSigned"
              @change="emit('patch', p, { isSigned: ($event.target as HTMLInputElement).checked })"
            />
          </td>
          <td>
            <span class="status" :class="STATUS_META[p.status].cls">{{ STATUS_META[p.status].text }}</span>
          </td>
          <td>
            <input
              class="comment"
              type="text"
              :value="p.act.comment"
              placeholder="например: отправить повторно"
              @input="onComment(p, ($event.target as HTMLInputElement).value)"
            />
          </td>
        </tr>
        <tr v-if="!items.length">
          <td colspan="10" class="muted center">Нет оплат по текущему фильтру.</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.wrap { overflow: auto; border: 1px solid var(--border); border-radius: 14px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 980px; }
th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--border); vertical-align: top; }
th { position: sticky; top: 0; background: var(--surface); font-size: 12px; color: var(--muted); z-index: 1; }
.r { text-align: right; }
.c { text-align: center; }
.center { text-align: center; }
.mono { font-variant-numeric: tabular-nums; white-space: nowrap; }
.muted { color: var(--muted); }
.sm { font-size: 11px; }
.clamp { max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.stage { display: inline-block; padding: 3px 8px; background: var(--chip); border-radius: 999px; font-size: 12px; }
.comment { width: 160px; border: 1px solid var(--border); border-radius: 8px; padding: 6px 8px; font: inherit; background: var(--bg); color: var(--text); }
.status { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; white-space: nowrap; }
.status.open { background: #fde9d2; color: #9a5b14; }
.status.wait { background: #d8e6ff; color: #1f4fb0; }
.status.done { background: #d6f3e0; color: #14794a; }
.status.attention { background: #ffd9d9; color: #b01919; }
</style>
