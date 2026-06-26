<script setup lang="ts">
const dash = useDashboard()
const activeTab = ref<'payments' | 'projects'>('payments')

await dash.loadOptions()
await dash.refresh()

function selectProject(name: string) {
  dash.filters.project = dash.filters.project === name ? '' : name
}
</script>

<template>
  <div class="page">
    <header class="hero">
      <div>
        <h1>Учёт оплат, проектов и закрывающих актов</h1>
        <p class="sub">
          Период выписки 16.07.2026–09.08.2026 · бизнес-логика статусов и итоги считаются на бэкенде ·
          AI-парсинг PDF выписки на Claude
        </p>
      </div>
      <div class="top-project" v-if="dash.summary.value.topProject">
        Крупнейший плательщик<br />
        <b>{{ dash.summary.value.topProject.name }}</b> — {{ money(dash.summary.value.topProject.amount) }}
      </div>
    </header>

    <SummaryCards :summary="dash.summary.value" />

    <IngestUpload @imported="dash.refresh()" />

    <FiltersBar
      :filters="dash.filters"
      :project-options="dash.options.value.projects"
      :stage-options="dash.options.value.stages"
      :has-active-filters="dash.hasActiveFilters.value"
      @reset="dash.resetFilters()"
    />

    <div class="layout">
      <ProjectList
        :projects="dash.projects.value"
        :selected="dash.filters.project"
        @select="selectProject"
      />

      <main class="main">
        <div class="tabs">
          <button :class="{ active: activeTab === 'payments' }" @click="activeTab = 'payments'">
            Оплаты <span class="muted">· {{ dash.summary.value.paymentCount }} · {{ money(dash.summary.value.total) }}</span>
          </button>
          <button :class="{ active: activeTab === 'projects' }" @click="activeTab = 'projects'">
            Сводка по юрлицам <span class="muted">· {{ dash.summary.value.projectCount }}</span>
          </button>
          <span v-if="dash.loading.value" class="loading">обновляю…</span>
        </div>

        <PaymentsTable
          v-show="activeTab === 'payments'"
          :items="dash.items.value"
          @patch="dash.patchAct"
        />
        <ProjectsSummaryTable v-show="activeTab === 'projects'" :projects="dash.projects.value" />
      </main>
    </div>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 16px; }
.hero { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; align-items: flex-start; }
h1 { font-size: 24px; margin: 0; }
.sub { color: var(--muted); margin: 6px 0 0; font-size: 13px; max-width: 640px; }
.top-project { text-align: right; font-size: 13px; color: var(--muted); }
.top-project b { color: var(--text); }
.layout { display: grid; grid-template-columns: 320px 1fr; gap: 16px; align-items: start; }
.main { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.tabs { display: flex; gap: 8px; align-items: center; }
.tabs button {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  border-radius: 10px;
  padding: 8px 14px;
  cursor: pointer;
  font: inherit;
}
.tabs button.active { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, transparent); }
.muted { color: var(--muted); }
.loading { color: var(--muted); font-size: 12px; }
@media (max-width: 1100px) { .layout { grid-template-columns: 1fr; } }
</style>
