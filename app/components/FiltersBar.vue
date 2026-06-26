<script setup lang="ts">
import type { Filters } from '~/composables/useDashboard'

defineProps<{
  filters: Filters
  projectOptions: string[]
  legalEntityOptions: string[]
  stageOptions: string[]
  hasActiveFilters: boolean
}>()
defineEmits<{ reset: [] }>()
</script>

<template>
  <section class="filters">
    <input
      v-model="filters.q"
      type="search"
      class="ctrl grow"
      placeholder="Поиск: юрлицо, ИНН, счёт, назначение…"
    />
    <select v-model="filters.legalEntity" class="ctrl">
      <option value="">Все юрлица</option>
      <option v-for="e in legalEntityOptions" :key="e" :value="e">{{ e }}</option>
    </select>
    <select v-model="filters.project" class="ctrl">
      <option value="">Все проекты</option>
      <option v-for="p in projectOptions" :key="p" :value="p">{{ p }}</option>
    </select>
    <select v-model="filters.stage" class="ctrl">
      <option value="">Все этапы</option>
      <option v-for="s in stageOptions" :key="s" :value="s">{{ s }}</option>
    </select>
    <label class="field">с <input v-model="filters.from" type="date" class="ctrl" /></label>
    <label class="field">по <input v-model="filters.to" type="date" class="ctrl" /></label>
    <select v-model="filters.sent" class="ctrl">
      <option value="">Акт: любой</option>
      <option value="yes">Отправлен</option>
      <option value="no">Не отправлен</option>
    </select>
    <select v-model="filters.signed" class="ctrl">
      <option value="">Подпись: любая</option>
      <option value="yes">Подписан</option>
      <option value="no">Не подписан</option>
    </select>
    <select v-model="filters.status" class="ctrl">
      <option value="">Статус: любой</option>
      <option value="not_sent">Не отправлен</option>
      <option value="waiting">Ждёт подпись</option>
      <option value="closed">Закрыт</option>
      <option value="attention">Требует внимания</option>
    </select>
    <button v-if="hasActiveFilters" class="reset" @click="$emit('reset')">Сбросить</button>
  </section>
</template>

<style scoped>
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.ctrl {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px 10px;
  font: inherit;
  color: var(--text);
}
.grow { flex: 1 1 280px; min-width: 220px; }
.field { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--muted); }
.reset {
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text);
  border-radius: 10px;
  padding: 8px 12px;
  cursor: pointer;
}
.reset:hover { background: var(--surface); }
</style>
