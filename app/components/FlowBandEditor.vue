<template>
  <div class="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50">

    <!-- Header -->
    <div class="flex items-center justify-between px-3 py-2 border-b border-neutral-200 dark:border-neutral-700">
      <span class="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Flow Bands</span>
      <button
        type="button"
        class="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors"
        :class="atMax
          ? 'text-neutral-300 dark:text-neutral-600 cursor-not-allowed'
          : 'text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30'"
        :disabled="atMax"
        :title="atMax ? 'Maximum 8 thresholds' : 'Add a CFS threshold'"
        @click="addThreshold"
      >
        <svg class="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 1a1 1 0 011 1v3h3a1 1 0 010 2H7v3a1 1 0 01-2 0V7H2a1 1 0 010-2h3V2a1 1 0 011-1z"/>
        </svg>
        Add threshold
      </button>
    </div>

    <!-- Threshold rows (sorted DESC by value) -->
    <div class="divide-y divide-neutral-100 dark:divide-neutral-800">
      <div
        v-for="t in sortedThresholds"
        :key="t._id"
        class="flex items-center gap-2 px-3 py-2"
      >
        <FlowBandColorPicker
          :model-value="t.color"
          @update:model-value="v => update(t._id, { color: v })"
        />
        <input
          :value="t.label"
          type="text"
          maxlength="32"
          placeholder="Label"
          class="flex-1 min-w-0 rounded border px-2 py-1 text-xs bg-white dark:bg-neutral-800 transition-colors"
          :class="hasLabelError(t)
            ? 'border-red-400 dark:border-red-500'
            : 'border-neutral-300 dark:border-neutral-600'"
          @input="update(t._id, { label: ($event.target as HTMLInputElement).value })"
        />
        <input
          :value="t.value"
          type="number"
          min="0"
          step="1"
          placeholder="CFS"
          class="w-20 rounded border px-2 py-1 text-xs bg-white dark:bg-neutral-800 transition-colors"
          :class="hasValueError(t)
            ? 'border-red-400 dark:border-red-500'
            : 'border-neutral-300 dark:border-neutral-600'"
          @change="update(t._id, { value: Number(($event.target as HTMLInputElement).value) })"
        />
        <button
          type="button"
          class="shrink-0 p-1 rounded text-neutral-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title="Remove threshold"
          @click="remove(t._id)"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9"/>
          </svg>
        </button>
      </div>

      <!-- Empty state -->
      <div v-if="local.thresholds.length === 0" class="px-3 py-2 text-xs text-neutral-400 italic">
        No thresholds — base label shown at all flow levels.
      </div>
    </div>

    <!-- Base row (always shown, no value, no trash) -->
    <div class="flex items-center gap-2 px-3 py-2 border-t border-neutral-200 dark:border-neutral-700 bg-white/50 dark:bg-neutral-900/30 rounded-b-lg">
      <FlowBandColorPicker
        :model-value="local.base_color"
        @update:model-value="v => { local.base_color = v; emitChange() }"
      />
      <span class="text-xs text-neutral-400 shrink-0">Base:</span>
      <input
        v-model="local.base_label"
        type="text"
        maxlength="32"
        placeholder="Base label"
        class="flex-1 min-w-0 rounded border px-2 py-1 text-xs bg-white dark:bg-neutral-800 transition-colors"
        :class="!local.base_label.trim()
          ? 'border-red-400 dark:border-red-500'
          : 'border-neutral-300 dark:border-neutral-600'"
        @input="emitChange"
      />
    </div>

  </div>
</template>

<script setup lang="ts">
import type { FlowBands, FlowBandThreshold } from '~/utils/flowBand'

interface LocalThreshold extends FlowBandThreshold {
  _id: number
}

interface LocalState {
  base_label: string
  base_color:  string
  thresholds:  LocalThreshold[]
}

const props = defineProps<{
  modelValue: FlowBands
}>()
const emit = defineEmits<{
  'update:modelValue': [value: FlowBands]
}>()

let _nextId = 0

function toLocal(fb: FlowBands): LocalState {
  return {
    base_label: fb.base_label,
    base_color:  fb.base_color,
    thresholds:  fb.thresholds.map(t => ({ ...t, _id: _nextId++ })),
  }
}

const local = reactive<LocalState>(toLocal(props.modelValue))

watch(() => props.modelValue, (v) => {
  Object.assign(local, toLocal(v))
}, { deep: true })

const sortedThresholds = computed(() =>
  [...local.thresholds].sort((a, b) => b.value - a.value),
)

const atMax = computed(() => local.thresholds.length >= 8)

function emitChange() {
  emit('update:modelValue', {
    base_label: local.base_label,
    base_color:  local.base_color,
    thresholds:  local.thresholds.map(({ _id: _, ...t }) => t),
  })
}

function update(id: number, patch: Partial<FlowBandThreshold>) {
  const t = local.thresholds.find(t => t._id === id)
  if (t) Object.assign(t, patch)
  emitChange()
}

function remove(id: number) {
  const idx = local.thresholds.findIndex(t => t._id === id)
  if (idx !== -1) local.thresholds.splice(idx, 1)
  emitChange()
}

function addThreshold() {
  if (atMax.value) return
  const maxVal = local.thresholds.reduce((m, t) => Math.max(m, t.value), 0)
  local.thresholds.push({
    _id: _nextId++,
    value: maxVal > 0 ? maxVal + 100 : 100,
    label: 'Running',
    color: 'green-3',
  })
  emitChange()
}

function hasLabelError(t: LocalThreshold): boolean {
  const s = t.label.trim()
  return s.length === 0 || s.length > 32
}

function hasValueError(t: LocalThreshold): boolean {
  if (t.value < 0) return true
  return local.thresholds.some(o => o._id !== t._id && o.value === t.value)
}
</script>
