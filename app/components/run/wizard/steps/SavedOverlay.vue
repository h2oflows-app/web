<template>
  <div
    class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 px-6"
    :style="{ background: 'color-mix(in srgb, var(--ui-bg) 95%, transparent)', backdropFilter: 'blur(8px)' }"
  >
    <!-- Green check disc (pop-in) -->
    <div
      class="w-16 h-16 rounded-full flex items-center justify-center"
      style="background: #16a34a; animation: wizardCheckPop 0.35s cubic-bezier(0.175,0.885,0.32,1.275) both"
    >
      <UIcon name="i-heroicons-check" class="text-white text-3xl" />
    </div>

    <!-- Headline -->
    <div class="text-center">
      <h2 class="text-2xl font-bold text-[--ui-text-highlighted]" style="font-family: var(--font-heading, inherit)">Run created</h2>
      <p class="text-sm text-[--ui-text-muted] mt-1">It's live on your dashboard and shared to Explore.</p>
    </div>

    <!-- Summary card -->
    <UCard
      class="w-full max-w-sm"
      :ui="{ body: 'p-4' }"
    >
      <div class="flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <!-- Difficulty colored dot -->
          <span
            class="w-2.5 h-2.5 rounded-full shrink-0"
            :style="{ background: store.classMax ? classColor(store.classMax) : '#6b7280' }"
          />
          <span class="font-semibold text-[--ui-text-highlighted] flex-1 truncate">
            {{ store.name || 'Run' }}
          </span>
          <!-- Class range badge -->
          <span
            v-if="store.classMax"
            class="tabular-nums text-xs font-mono font-semibold px-2 py-0.5 rounded-full"
            :style="{
              color: classColor(store.classMax),
              background: 'color-mix(in srgb, ' + classColor(store.classMax) + ' 12%, transparent)',
            }"
          >{{ classRange(store.classMin, store.classMax) }}</span>
        </div>

        <!-- River + distance -->
        <div class="flex items-center gap-2 text-sm text-[--ui-text-muted]">
          <span class="flex-1 truncate">{{ store.riverName || '—' }}</span>
          <span v-if="store.distanceMi > 0" class="tabular-nums shrink-0">{{ store.distanceMi.toFixed(1) }} mi</span>
        </div>

        <!-- Gauge reading if present -->
        <div v-if="store.gauge" class="flex items-center gap-1.5 text-xs text-[--ui-text-dimmed]">
          <UIcon name="i-heroicons-beaker" class="w-3.5 h-3.5" />
          <span class="truncate">{{ store.gauge.name || store.gauge.externalId }}</span>
        </div>
      </div>
    </UCard>

    <!-- Actions -->
    <div class="flex flex-col gap-3 w-full max-w-sm">
      <UButton
        label="View run"
        size="xl"
        block
        color="primary"
        leading-icon="i-heroicons-eye"
        :to="viewRunPath"
        @click="$emit('reset')"
      />
      <UButton
        label="Add another run"
        variant="ghost"
        color="neutral"
        block
        @click="$emit('reset')"
      />
    </div>
  </div>

  <!-- Pop-in keyframe -->
  <Teleport to="head">
    <component :is="'style'" v-once>
      @keyframes wizardCheckPop {
        0%   { transform: scale(0.5); opacity: 0 }
        80%  { transform: scale(1.1); opacity: 1 }
        100% { transform: scale(1);   opacity: 1 }
      }
    </component>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRunWizardStore } from '~/stores/runWizard'
import { classColor, classRange } from '~/utils/classRating'

defineEmits<{ reset: [] }>()

const store = useRunWizardStore()

// Mirror UserRunAuthor post-create nav:
//   - admin-as-h2oflows → /runs/h2oflows/{slug}
//   - own run            → /my/runs/{slug}
const viewRunPath = computed(() => {
  if (!store.savedSlug) return '/my/runs'
  if (store.savedAsH2oflows) return `/runs/h2oflows/${store.savedSlug}`
  return `/my/runs/${store.savedSlug}`
})
</script>
