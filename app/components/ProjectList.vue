<script setup lang="ts">
import type { ProjectSummaryDTO } from '~~/server/types'
import { money } from '~/utils/format'

defineProps<{ projects: ProjectSummaryDTO[]; selected: string }>()
defineEmits<{ select: [name: string] }>()
</script>

<template>
  <aside class="panel">
    <div class="head">Проекты / юрлица<span class="counter">{{ projects.length }}</span></div>
    <div v-if="!projects.length" class="muted">Нет проектов по текущему фильтру.</div>
    <div
      v-for="g in projects"
      :key="g.name"
      class="pcard"
      :class="{ active: selected === g.name }"
      @click="$emit('select', g.name)"
    >
      <div class="top">
        <div class="name">{{ g.name }}</div>
        <div class="sum">{{ money(g.amount) }}</div>
      </div>
      <div class="meta">ИНН {{ g.inn }} · {{ g.count }} оплат · {{ g.stages.join(', ') }}</div>
      <div class="progress" :title="`Подписано актами: ${g.signedPct}%`">
        <i :style="{ width: g.signedPct + '%' }" />
      </div>
      <div class="meta">Подписано: {{ money(g.signedAmount) }} / {{ g.signedPct }}%</div>
    </div>
  </aside>
</template>

<style scoped>
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 70vh;
  overflow: auto;
}
.head { display: flex; justify-content: space-between; font-weight: 600; }
.counter { color: var(--muted); font-weight: 400; }
.pcard {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  cursor: pointer;
  transition: border-color .15s, background .15s;
}
.pcard:hover { border-color: var(--accent); }
.pcard.active { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 8%, transparent); }
.top { display: flex; justify-content: space-between; gap: 8px; }
.name { font-weight: 600; font-size: 14px; }
.sum { font-weight: 700; white-space: nowrap; }
.meta { font-size: 12px; color: var(--muted); margin-top: 4px; }
.progress { height: 6px; background: var(--border); border-radius: 999px; overflow: hidden; margin-top: 8px; }
.progress i { display: block; height: 100%; background: var(--ok); }
.muted { color: var(--muted); font-size: 13px; }
</style>
