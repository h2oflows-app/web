<template>
  <div v-if="feature" class="flex flex-col gap-4">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <span class="shrink-0 mt-0.5" style="width: 24px; height: 31px" v-html="headerPin" />
      <div class="flex-1 min-w-0">
        <h2
          class="text-base font-bold text-[--ui-text-highlighted] leading-tight"
          style="font-family: var(--font-heading, inherit)"
        >{{ heading }}</h2>
        <p class="text-xs text-[--ui-text-muted]">{{ subLine }}</p>
      </div>
      <UButton
        icon="i-heroicons-x-mark"
        variant="ghost"
        color="neutral"
        size="sm"
        aria-label="Close"
        @click="store.cancelFeatureForm()"
      />
    </div>

    <!-- Type switcher -->
    <div class="flex gap-1.5 overflow-x-auto pb-1" style="scrollbar-width: none">
      <button
        v-for="t in RUN_FEATURE_TYPES"
        :key="t.key"
        type="button"
        class="shrink-0 flex items-center justify-center rounded-lg border transition-colors"
        style="width: 36px; height: 36px"
        :style="feature.type === t.key
          ? { borderColor: '#2563eb', background: 'var(--ui-bg-elevated)', boxShadow: '0 0 0 1.5px #2563eb' }
          : { borderColor: 'var(--ui-border)', background: 'var(--ui-bg)' }"
        :aria-label="t.label"
        :title="t.label"
        @click="store.changeFeatureType(feature!.id, t.key)"
      >
        <span class="pointer-events-none" style="width: 14px; height: 18px" v-html="pinFor(t.key)" />
      </button>
    </div>

    <!-- Name -->
    <UFormField label="Name">
      <UInput
        :model-value="feature.name"
        :placeholder="meta.namePlaceholder"
        size="lg"
        class="w-full"
        @update:model-value="(v: string | number) => store.updateFeature(feature!.id, { name: String(v) })"
      />
    </UFormField>

    <!-- Description -->
    <UFormField label="Description">
      <UTextarea
        :model-value="feature.description"
        :placeholder="meta.descPlaceholder"
        :rows="2"
        class="w-full"
        resize
        @update:model-value="(v: string | number) => store.updateFeature(feature!.id, { description: String(v) })"
      />
    </UFormField>

    <!-- Class chips (rapid only) -->
    <div v-if="feature.type === 'rapid'" class="flex flex-col gap-2">
      <span class="text-sm font-medium text-[--ui-text]">Class</span>
      <div class="flex gap-1.5 flex-wrap">
        <button
          v-for="chip in RUN_FEATURE_CLASS_CHIPS"
          :key="chip.value"
          type="button"
          class="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
          :style="feature.classRating === chip.value
            ? { background: classColor(chip.value), borderColor: classColor(chip.value), color: '#fff' }
            : { background: 'var(--ui-bg-muted)', borderColor: 'var(--ui-border)', color: 'var(--ui-text-muted)' }"
          @click="store.updateFeature(feature!.id, { classRating: chip.value })"
        >{{ chip.label }}</button>
      </div>
    </div>

    <!-- Hazard chips (hazard only) -->
    <div v-if="feature.type === 'hazard'" class="flex flex-col gap-2">
      <span class="text-sm font-medium text-[--ui-text]">Hazard type</span>
      <div class="flex gap-1.5 flex-wrap">
        <button
          v-for="chip in RUN_FEATURE_HAZARD_CHIPS"
          :key="chip"
          type="button"
          class="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
          :style="feature.hazardType === chip
            ? { background: '#dc2626', borderColor: '#dc2626', color: '#fff' }
            : { background: 'var(--ui-bg-muted)', borderColor: 'var(--ui-border)', color: 'var(--ui-text-muted)' }"
          @click="store.updateFeature(feature!.id, { hazardType: chip })"
        >{{ chip }}</button>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex gap-2 pt-1">
      <UButton
        v-if="!isDraft"
        icon="i-heroicons-trash"
        color="error"
        variant="outline"
        size="lg"
        aria-label="Delete feature"
        @click="handleDelete"
      />
      <UButton
        :label="isDraft ? 'Add feature' : 'Save feature'"
        color="primary"
        size="lg"
        block
        class="flex-1"
        @click="handleConfirm"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRunWizardStore } from '~/stores/runWizard'
import {
  RUN_FEATURE_TYPES,
  RUN_FEATURE_CLASS_CHIPS,
  RUN_FEATURE_HAZARD_CHIPS,
  featureTypeMeta,
  featureDefaultLabel,
} from '~/utils/runFeatureTypes'
import { featureListPin } from '~/utils/featureIcons'
import { classColor } from '~/utils/classRating'

const store = useRunWizardStore()
const toast = useToast()

const feature = computed(() => store.features.find(f => f.id === store.editingFeatureId) ?? null)
const isDraft = computed(() => !!store.editingFeatureId && store.editingFeatureId === store.draftFeatureId)
const meta = computed(() => featureTypeMeta(feature.value?.type ?? 'access'))

const heading = computed(() => {
  if (!feature.value) return ''
  const label = meta.value.label.toLowerCase()
  return isDraft.value ? `New ${label}` : `Edit ${label}`
})

const subLine = computed(() => meta.value.isRiver
  ? 'On the river — snapped to the flowline'
  : 'Placed freely — drag the pin to adjust')

const headerPin = computed(() => feature.value ? pinFor(feature.value.type) : '')

function pinFor(type: string): string {
  return featureListPin({ type, isRapid: type === 'rapid', isSurf: type === 'surf', isHazard: type === 'hazard' })
}

function handleConfirm() {
  const f = feature.value
  if (!f) return
  const name = f.name.trim() || featureDefaultLabel(f.type)
  const wasDraft = isDraft.value
  store.confirmFeature()
  toast.add({ title: wasDraft ? `Added ${name}` : `Updated ${name}`, color: 'success' })
}

function handleDelete() {
  const f = feature.value
  if (!f) return
  const name = f.name.trim() || featureDefaultLabel(f.type)
  store.removeFeature(f.id)
  toast.add({ title: `Removed ${name}`, color: 'neutral' })
}
</script>
