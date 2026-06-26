<script setup lang="ts">
import type { ProjectSummaryDTO } from '~~/server/types'
import { money2 } from '~/utils/format'

defineProps<{ projects: ProjectSummaryDTO[] }>()

const CLOSE_META: Record<string, { text: string; cls: string }> = {
  closed: { text: 'Закрыт', cls: 'done' },
  in_work: { text: 'В работе', cls: 'wait' },
  open: { text: 'Акты не отправлены', cls: 'open' },
}
</script>

<template>
  <div class="wrap">
    <table>
      <thead>
        <tr>
          <th>Проект / юрлицо</th>
          <th>ИНН</th>
          <th>ОГРН</th>
          <th class="c">Оплат</th>
          <th class="r">Получено</th>
          <th class="r">Акты отправлены</th>
          <th class="r">Акты подписаны</th>
          <th>Закрытие</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="g in projects" :key="g.name">
          <td>
            <b>{{ g.name }}</b>
            <div class="muted sm">р/с {{ g.account }}</div>
          </td>
          <td>{{ g.inn }}</td>
          <td class="muted">{{ g.ogrn }}</td>
          <td class="c">{{ g.count }}</td>
          <td class="r mono">{{ money2(g.amount) }}</td>
          <td class="r mono">{{ money2(g.sentAmount) }}<div class="muted sm">{{ g.sentCount }} оплат</div></td>
          <td class="r mono">{{ money2(g.signedAmount) }}<div class="muted sm">{{ g.signedCount }} оплат</div></td>
          <td><span class="status" :class="CLOSE_META[g.closeStatus].cls">{{ CLOSE_META[g.closeStatus].text }}</span></td>
        </tr>
        <tr v-if="!projects.length">
          <td colspan="8" class="muted center">Нет проектов по текущему фильтру.</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.wrap { overflow: auto; border: 1px solid var(--border); border-radius: 14px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 820px; }
th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--border); vertical-align: top; }
th { position: sticky; top: 0; background: var(--surface); font-size: 12px; color: var(--muted); }
.r { text-align: right; }
.c { text-align: center; }
.center { text-align: center; }
.mono { font-variant-numeric: tabular-nums; white-space: nowrap; }
.muted { color: var(--muted); }
.sm { font-size: 11px; }
.status { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
.status.open { background: #fde9d2; color: #9a5b14; }
.status.wait { background: #d8e6ff; color: #1f4fb0; }
.status.done { background: #d6f3e0; color: #14794a; }
</style>
