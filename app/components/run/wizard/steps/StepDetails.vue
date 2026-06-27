<template>
  <div class="flex flex-col gap-5">
    <WizardProgress />

    <!-- Header -->
    <div class="flex flex-col gap-1">
      <p class="text-[10px] font-bold tracking-widest text-[--ui-text-muted] uppercase">DETAILS · Step 4 of 4</p>
      <h2 class="text-xl font-bold text-[--ui-text-highlighted]" style="font-family: var(--font-heading, inherit)">Run details</h2>
    </div>

    <!-- Summary row (difficulty dot + distance) -->
    <div
      class="flex items-center gap-3 px-4 py-3 rounded-xl"
      :style="{ background: 'var(--ui-bg-muted)', border: '1px solid var(--ui-border)' }"
    >
      <!-- Difficulty dot -->
      <span
        class="w-2.5 h-2.5 rounded-full shrink-0"
        :style="{ background: store.classMax ? classColor(store.classMax) : '#6b7280' }"
      />
      <span class="flex-1 truncate text-sm text-[--ui-text-muted]">
        {{ store.distanceMi > 0 ? store.distanceMi.toFixed(1) + ' mi' : '—' }}
      </span>
    </div>

    <!-- Run name -->
    <UFormField label="Run name" required>
      <UInput
        v-model="store.name"
        placeholder="e.g. Foxton"
        size="lg"
        autofocus
        class="w-full"
      />
    </UFormField>

    <!-- River name (editable — prefilled from NLDI lookup) -->
    <UFormField label="River">
      <UInput
        v-model="store.riverName"
        placeholder="e.g. South Platte River"
        size="lg"
        class="w-full"
      />
    </UFormField>

    <!-- Gauge row -->
    <div
      class="flex items-center gap-3 px-3 py-2.5 rounded-xl"
      :style="{ background: 'var(--ui-bg-elevated)', border: '1px solid var(--ui-border)' }"
    >
      <template v-if="store.gauge">
        <span class="w-2 h-2 rounded-full shrink-0" style="background: #f59e0b" />
        <div class="flex-1 min-w-0">
          <span class="text-sm font-medium text-[--ui-text-highlighted] truncate block">{{ store.gauge.name }}</span>
          <span class="text-xs font-mono text-[--ui-text-muted]">{{ store.gauge.source.toUpperCase() }} {{ store.gauge.externalId }}</span>
        </div>
        <UButton size="xs" variant="ghost" color="neutral" @click="store.goGauge()">Change gauge</UButton>
      </template>
      <template v-else>
        <span class="text-sm text-[--ui-text-muted] flex-1">No gauge attached</span>
        <UButton size="xs" variant="ghost" color="neutral" @click="store.goGauge()">Add gauge</UButton>
      </template>
    </div>

    <!-- Hardest rapid / difficulty chips -->
    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-[--ui-text]">Hardest rapid</span>
        <span
          v-if="store.classMax"
          class="tabular-nums text-sm font-semibold font-mono"
          :style="{ color: classColor(store.classMax) }"
        >{{ classRange(store.classMin, store.classMax) }}</span>
      </div>

      <!-- Max class chip row -->
      <div class="flex gap-1.5 flex-wrap">
        <button
          v-for="chip in CLASS_CHIPS"
          :key="chip.value"
          type="button"
          class="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
          :style="store.classMax === chip.value
            ? { background: classColor(chip.value), borderColor: classColor(chip.value), color: '#fff' }
            : { background: 'var(--ui-bg-muted)', borderColor: 'var(--ui-border)', color: 'var(--ui-text-muted)' }"
          @click="setClassMax(chip.value)"
        >{{ chip.label }}</button>
      </div>

    </div>

    <!-- Flow thresholds -->
    <div class="flex flex-col gap-2">
      <span class="text-sm font-medium text-[--ui-text]">Flow thresholds</span>
      <FlowBandEditor v-if="effectiveFlowBands" v-model="effectiveFlowBands" />
    </div>

    <!-- Notes (collapsible) -->
    <div class="flex flex-col gap-2">
      <button
        type="button"
        class="flex items-center gap-1.5 text-sm font-medium text-[--ui-text] text-left"
        @click="showNotes = !showNotes"
      >
        <UIcon
          :name="showNotes ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
          class="w-4 h-4 text-[--ui-text-muted]"
        />
        Notes
        <span v-if="!showNotes && store.notes.trim()" class="text-xs text-[--ui-text-dimmed] font-normal ml-1">(added)</span>
        <span v-else-if="!showNotes" class="text-xs text-[--ui-text-dimmed] font-normal ml-1">(optional)</span>
      </button>
      <UTextarea
        v-if="showNotes"
        v-model="store.notes"
        placeholder="Beta, access notes, shuttle, hazards…"
        :rows="3"
        class="w-full"
        resize
      />
    </div>

    <!-- Advanced edit panel (edit mode only) -->
    <AdvancedEditPanel v-if="store.mode === 'edit'" ref="advancedPanelRef" />

    <!-- Admin: publish as h2oflows -->
    <label
      v-if="isDataAdmin"
      class="flex items-center gap-2 rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 px-3 py-2 text-xs text-amber-800 dark:text-amber-200 cursor-pointer"
    >
      <input v-model="authorAsH2oflows" type="checkbox" class="rounded border-amber-400" />
      <span>Publish as <strong>h2oflows</strong> (official curator content — public)</span>
    </label>

    <!-- Create / Save button -->
    <UButton
      :label="store.mode === 'edit' ? 'Save changes' : 'Create run'"
      leading-icon="i-heroicons-check"
      size="xl"
      block
      color="primary"
      :disabled="!store.name.trim()"
      :loading="saving"
      @click="handleCreate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, type Ref } from 'vue'
import { useRunWizardStore } from '~/stores/runWizard'
import { classColor, classRange } from '~/utils/classRating'
import type { FlowBands } from '~/utils/flowBand'

const store = useRunWizardStore()
const { isDataAdmin } = useAuth()
const { save, saveEdit, saving } = useRunSave()

const showNotes = ref(false)
const authorAsH2oflows = ref(false)
const advancedPanelRef = ref<{ slugAvailability: Ref<string> } | null>(null)

// Chip definitions: value, label
const CLASS_CHIPS = [
  { value: 2,   label: 'II'   },
  { value: 2.5, label: 'II+' },
  { value: 3,   label: 'III'  },
  { value: 3.5, label: 'III+' },
  { value: 4,   label: 'IV'   },
  { value: 4.5, label: 'IV+' },
  { value: 5,   label: 'V'    },
]

function setClassMax(value: number) {
  // Single difficulty rating from the crux rapid — min mirrors max.
  store.classMax = value
  store.classMin = value
}

// Default flow bands seeded on enter (if null or no thresholds)
const DEFAULT_FLOW_BANDS: FlowBands = {
  base_label: 'Too Low',
  base_color: 'neutral-3',
  thresholds: [
    { value: 600,  label: 'Running', color: 'green-3' },
    { value: 1800, label: 'High',    color: 'blue-3'  },
  ],
}

// Local reactive copy for FlowBandEditor — initialized on mount
const effectiveFlowBands = ref<FlowBands>(DEFAULT_FLOW_BANDS)

onMounted(() => {
  // Seed defaults if store has no thresholds
  if (!store.flowBands || store.flowBands.thresholds.length === 0) {
    store.flowBands = { ...DEFAULT_FLOW_BANDS, thresholds: [...DEFAULT_FLOW_BANDS.thresholds] }
  }
  effectiveFlowBands.value = store.flowBands
})

// Propagate FlowBandEditor edits → store
watch(effectiveFlowBands, (v) => { store.flowBands = v }, { deep: true })

async function handleCreate() {
  if (store.mode === 'edit') {
    const result = await saveEdit({
      slugAvailability: advancedPanelRef.value?.slugAvailability.value,
    })
    if (result) {
      store.goSaved()
    }
  } else {
    const result = await save(authorAsH2oflows.value)
    if (result) {
      store.goSaved()
    }
  }
}
</script>
