<template>
  <div class="flex flex-col gap-4">
    <!-- Header -->
    <div class="flex items-center gap-2.5">
      <UButton
        icon="i-heroicons-chevron-left"
        variant="outline"
        color="neutral"
        size="sm"
        aria-label="Back to details"
        @click="store.exitFeatureMode()"
      />
      <div class="flex-1 min-w-0">
        <h2
          class="text-base font-bold text-[--ui-text-highlighted] leading-tight"
          style="font-family: var(--font-heading, inherit)"
        >Features</h2>
        <p class="text-xs text-[--ui-text-muted]">{{ countText }} · tap a type, then tap the map</p>
      </div>
      <UButton label="Done" color="primary" size="sm" @click="store.exitFeatureMode()" />
    </div>

    <!-- Type palette -->
    <div class="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" style="scrollbar-width: none">
      <button
        v-for="t in RUN_FEATURE_TYPES"
        :key="t.key"
        type="button"
        class="flex items-center gap-1.5 shrink-0 px-2.5 rounded-lg border text-xs font-semibold transition-colors"
        style="min-height: 44px"
        :style="store.placingType === t.key
          ? { borderColor: '#2563eb', background: 'var(--ui-bg-elevated)', color: '#2563eb', boxShadow: '0 0 0 1px #2563eb' }
          : { borderColor: 'var(--ui-border)', background: 'var(--ui-bg)', color: 'var(--ui-text-muted)' }"
        @click="store.startPlacing(t.key)"
      >
        <span class="w-4 h-5 shrink-0" v-html="pinFor(t.key)" />
        <span class="whitespace-nowrap">{{ t.label }}</span>
      </button>
    </div>

    <!-- Feature list -->
    <div class="rounded-xl overflow-hidden border" :style="{ borderColor: 'var(--ui-border)' }">
      <!-- Put-in (locked) -->
      <div
        v-if="store.putIn"
        class="flex items-center gap-2.5 px-3 py-2.5 opacity-70 cursor-default border-b"
        :style="{ borderColor: 'var(--ui-border)', background: 'var(--ui-bg-muted)' }"
        @click="notifyLocked('put-in')"
      >
        <span class="w-4.5 h-5.5 shrink-0" v-html="pinFor('put_in')" />
        <div class="flex-1 min-w-0">
          <span class="text-sm font-semibold text-[--ui-text-highlighted] block">Put-in</span>
          <span class="text-xs text-[--ui-text-muted]">Set in step 1</span>
        </div>
        <UIcon name="i-heroicons-lock-closed" class="w-3.5 h-3.5 text-[--ui-text-dimmed] shrink-0" />
      </div>

      <!-- Feature rows -->
      <div
        v-for="f in store.features"
        :key="f.id"
        class="flex items-center gap-2.5 px-3 py-2.5 border-b cursor-pointer hover:bg-[--ui-bg-muted] transition-colors"
        style="min-height: 44px"
        :style="{ borderColor: 'var(--ui-border)' }"
        @click="store.editFeature(f.id)"
      >
        <span class="w-4.5 h-5.5 shrink-0" v-html="pinFor(f.type)" />
        <div class="flex-1 min-w-0">
          <span class="text-sm font-semibold text-[--ui-text-highlighted] truncate block">
            {{ f.name || featureTypeMeta(f.type).label }}
          </span>
          <span class="text-xs text-[--ui-text-muted] truncate block">{{ metaFor(f) }}</span>
        </div>
        <button
          type="button"
          class="shrink-0 w-9 h-9 flex items-center justify-center rounded-md text-[--ui-text-dimmed] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          aria-label="Delete feature"
          @click.stop="store.removeFeature(f.id)"
        >
          <UIcon name="i-heroicons-trash" class="w-4 h-4" />
        </button>
      </div>

      <!-- Take-out (locked) -->
      <div
        v-if="store.takeOut"
        class="flex items-center gap-2.5 px-3 py-2.5 opacity-70 cursor-default"
        :style="{ background: 'var(--ui-bg-muted)' }"
        @click="notifyLocked('take-out')"
      >
        <span class="w-4.5 h-5.5 shrink-0" v-html="pinFor('take_out')" />
        <div class="flex-1 min-w-0">
          <span class="text-sm font-semibold text-[--ui-text-highlighted] block">Take-out</span>
          <span class="text-xs text-[--ui-text-muted]">Set in step 2</span>
        </div>
        <UIcon name="i-heroicons-lock-closed" class="w-3.5 h-3.5 text-[--ui-text-dimmed] shrink-0" />
      </div>
    </div>

    <p class="text-[11px] text-center text-[--ui-text-dimmed]">
      Put-in &amp; take-out are set in steps 1–2 · tap a pin to edit · drag to move
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRunWizardStore, type RunFeature } from '~/stores/runWizard'
import { RUN_FEATURE_TYPES, featureTypeMeta } from '~/utils/runFeatureTypes'
import { featureListPin } from '~/utils/featureIcons'
import { classRange } from '~/utils/classRating'

const store = useRunWizardStore()
const toast = useToast()

const countText = computed(() => {
  const n = store.features.length
  return `${n} feature${n === 1 ? '' : 's'}`
})

function pinFor(type: string): string {
  return featureListPin({ type, isRapid: type === 'rapid', isSurf: type === 'surf', isHazard: type === 'hazard' })
}

function metaFor(f: RunFeature): string {
  if (f.type === 'rapid') {
    return f.classRating != null ? `Rapid · Class ${classRange(f.classRating, f.classRating)}` : 'Rapid'
  }
  if (f.type === 'hazard') {
    return f.hazardType ? `Hazard · ${f.hazardType}` : 'Hazard'
  }
  return featureTypeMeta(f.type).label
}

function notifyLocked(which: 'put-in' | 'take-out') {
  toast.add({
    title: which === 'put-in' ? 'Put-in is set in step 1' : 'Take-out is set in step 2',
    duration: 2500,
  })
}
</script>
