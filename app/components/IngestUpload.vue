<script setup lang="ts">
import type { IngestReport } from '~~/server/types'
import { money } from '~/utils/format'

const emit = defineEmits<{ imported: [] }>()

const busy = ref(false)
const error = ref('')
const report = ref<IngestReport | null>(null)
const dragOver = ref(false)
const fileInput = ref<HTMLInputElement>()

async function upload(file: File) {
  if (!file) return
  busy.value = true
  error.value = ''
  report.value = null
  try {
    const form = new FormData()
    form.append('file', file)
    report.value = await $fetch<IngestReport>('/api/ingest', { method: 'POST', body: form })
    if (report.value.imported > 0) emit('imported')
  } catch (e: unknown) {
    const err = e as { statusMessage?: string; message?: string }
    error.value = err.statusMessage || err.message || 'Ошибка загрузки'
  } finally {
    busy.value = false
  }
}

function onDrop(e: DragEvent) {
  dragOver.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f) upload(f)
}
function onPick(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) upload(f)
}
</script>

<template>
  <section class="ingest">
    <div class="title">AI-парсинг банковской выписки (PDF)</div>
    <div
      class="drop"
      :class="{ over: dragOver, busy }"
      @dragover.prevent="dragOver = true"
      @dragleave.prevent="dragOver = false"
      @drop.prevent="onDrop"
      @click="fileInput?.click()"
    >
      <input ref="fileInput" type="file" accept="application/pdf,.pdf" hidden @change="onPick" />
      <span v-if="busy">Обрабатываю выписку…</span>
      <span v-else>Перетащите PDF сюда или нажмите для выбора. Извлечём проектные оплаты, отсеем непроектные.</span>
    </div>

    <div v-if="error" class="alert err">{{ error }}</div>

    <div v-if="report" class="result">
      <div class="badges">
        <span class="b imported">импортировано: {{ report.imported }}</span>
        <span class="b skipped">отсеяно: {{ report.skipped }}</span>
        <span class="b review">на проверку: {{ report.needsReview }}</span>
        <span class="b extractor">экстрактор: {{ report.extractor === 'claude' ? 'Claude' : 'Mock (без ключа)' }}</span>
      </div>
      <details>
        <summary>Детали распознавания ({{ report.items.length }})</summary>
        <ul>
          <li v-for="(it, i) in report.items" :key="i" :class="it.outcome">
            <b>{{ it.payer }}</b> — {{ money(it.amount) }}
            <span class="tag">{{ it.outcome }}</span>
            <span v-if="it.reason" class="reason">{{ it.reason }}</span>
          </li>
        </ul>
      </details>
    </div>
  </section>
</template>

<style scoped>
.ingest { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 16px; }
.title { font-weight: 600; margin-bottom: 10px; }
.drop {
  border: 1.5px dashed var(--border);
  border-radius: 12px;
  padding: 22px;
  text-align: center;
  color: var(--muted);
  cursor: pointer;
  font-size: 13px;
  transition: border-color .15s, background .15s;
}
.drop.over { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 8%, transparent); }
.drop.busy { opacity: .6; pointer-events: none; }
.alert { margin-top: 10px; padding: 10px 12px; border-radius: 10px; font-size: 13px; }
.err { background: #ffd9d9; color: #b01919; }
.result { margin-top: 12px; }
.badges { display: flex; flex-wrap: wrap; gap: 8px; }
.b { font-size: 12px; padding: 4px 10px; border-radius: 999px; font-weight: 600; }
.b.imported { background: #d6f3e0; color: #14794a; }
.b.skipped { background: #eee; color: #555; }
.b.review { background: #fde9d2; color: #9a5b14; }
.b.extractor { background: #d8e6ff; color: #1f4fb0; }
details { margin-top: 10px; font-size: 13px; }
summary { cursor: pointer; color: var(--muted); }
ul { list-style: none; padding: 0; margin: 10px 0 0; display: flex; flex-direction: column; gap: 4px; max-height: 240px; overflow: auto; }
li { padding: 6px 8px; border-radius: 8px; background: var(--bg); }
.tag { font-size: 11px; padding: 1px 6px; border-radius: 6px; background: var(--chip); margin-left: 6px; }
.reason { color: var(--muted); font-size: 12px; margin-left: 6px; }
li.imported { border-left: 3px solid var(--ok); }
li.skipped { border-left: 3px solid #bbb; }
li.needsReview { border-left: 3px solid #e0a30a; }
</style>
