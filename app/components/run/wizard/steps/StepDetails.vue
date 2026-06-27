<template>
  <div class="flex flex-col gap-5">
    <WizardProgress />

    <!-- Header -->
    <div class="flex flex-col gap-1">
      <p class="text-[10px] font-bold tracking-widest text-[--ui-text-muted] uppercase">DETAILS · Step 4 of 4</p>
      <h2 class="text-xl font-bold text-[--ui-text-highlighted]" style="font-family: var(--font-heading, inherit)">Run details</h2>
    </div>

    <!-- Summary row (river + distance + edit back) -->
    <div
      class="flex items-center gap-3 px-4 py-3 rounded-xl"
      :style="{ background: 'var(--ui-bg-muted)', border: '1px solid var(--ui-border)' }"
    >
      <!-- Difficulty dot -->
      <span
        class="w-2.5 h-2.5 rounded-full shrink-0"
        :style="{ background: store.classMax ? classColor(store.classMax) : '#6b7280' }"
      />
      <span class="flex-1 truncate text-sm font-medium text-[--ui-text-highlighted]">
        {{ store.riverName || 'River' }}
      </span>
      <span class="tabular-nums text-sm text-[--ui-text-muted] shrink-0">
        {{ store.distanceMi > 0 ? store.distanceMi.toFixed(1) + ' mi' : '—' }}
      </span>
      <UButton size="xs" variant="ghost" color="neutral" @click="store.back()">Edit</UButton>
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

      <!-- Range toggle -->
      <label class="flex items-center gap-2 text-xs text-[--ui-text-muted] cursor-pointer select-none">
        <input v-model="showRange" type="checkbox" class="rounded" />
        Set a class range
      </label>

      <!-- Min class chip row (only when range is on) -->
      <template v-if="showRange && store.classMax">
        <div class="flex gap-1.5 flex-wrap">
          <button
            v-for="chip in minChips"
            :key="chip.value"
            type="button"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
            :style="store.classMin === chip.value
              ? { background: classColor(chip.value), borderColor: classColor(chip.value), color: '#fff' }
              : { background: 'var(--ui-bg-muted)', borderColor: 'var(--ui-border)', color: 'var(--ui-text-muted)' }"
            @click="store.classMin = chip.value"
          >{{ chip.label }}</button>
        </div>
      </template>
    </div>

    <!-- Flow thresholds -->
    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-[--ui-text]">Flow thresholds</span>
        <label class="flex items-center gap-1.5 text-xs text-[--ui-text-muted] cursor-pointer select-none">
          <input v-model="skipFlowBands" type="checkbox" class="rounded" />
          Skip for now
        </label>
      </div>
      <FlowBandEditor v-if="!skipFlowBands && effectiveFlowBands" v-model="effectiveFlowBands" />
      <p v-else-if="skipFlowBands" class="text-xs text-[--ui-text-dimmed]">Run will show grey until you add flow thresholds.</p>
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

    <!-- Admin: publish as h2oflows -->
    <label
      v-if="isDataAdmin"
      class="flex items-center gap-2 rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 px-3 py-2 text-xs text-amber-800 dark:text-amber-200 cursor-pointer"
    >
      <input v-model="authorAsH2oflows" type="checkbox" class="rounded border-amber-400" />
      <span>Publish as <strong>h2oflows</strong> (official curator content — public)</span>
    </label>

    <!-- Create button -->
    <UButton
      label="Create run"
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
import { ref, computed, watch, onMounted } from 'vue'
import { useRunWizardStore } from '~/stores/runWizard'
import { classColor, classRange } from '~/utils/classRating'
import type { FlowBands } from '~/utils/flowBand'

const store = useRunWizardStore()
const { isDataAdmin } = useAuth()
const { save, saving } = useRunSave()

const showNotes = ref(false)
const showRange = ref(false)
const skipFlowBands = ref(false)
const authorAsH2oflows = ref(false)

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

// Min chips: only values <= classMax (can't be harder than the hardest rapid)
const minChips = computed(() =>
  store.classMax != null
    ? CLASS_CHIPS.filter(c => c.value <= store.classMax!)
    : CLASS_CHIPS
)

function setClassMax(value: number) {
  store.classMax = value
  // If range is off OR min > max, keep min = max
  if (!showRange.value || (store.classMin != null && store.classMin > value)) {
    store.classMin = value
  }
}

// When range is toggled off, collapse min back to max
watch(showRange, (on) => {
  if (!on) store.classMin = store.classMax
})

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

// Skip toggle: when enabling skip, collapse thresholds to []
watch(skipFlowBands, (skip) => {
  if (skip) {
    store.flowBands = { base_label: 'Too Low', base_color: 'neutral-3', thresholds: [] }
  } else {
    // Restore defaults
    store.flowBands = { ...DEFAULT_FLOW_BANDS, thresholds: [...DEFAULT_FLOW_BANDS.thresholds] }
    effectiveFlowBands.value = store.flowBands
  }
})

async function handleCreate() {
  const result = await save(authorAsH2oflows.value)
  if (result) {
    store.goSaved()
  }
}
</script>
