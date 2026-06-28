<template>
  <div class="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 pt-3 pb-2 pointer-events-none">
    <!-- Back/Cancel -->
    <UButton
      :label="store.step === 'putin' ? 'Cancel' : 'Back'"
      leading-icon="i-heroicons-chevron-left"
      variant="soft"
      color="neutral"
      size="sm"
      class="pointer-events-auto backdrop-blur-sm bg-[--ui-bg]/80"
      @click="handleBack"
    />
    <!-- Basemap switcher -->
    <UButtonGroup size="sm" class="pointer-events-auto backdrop-blur-sm">
      <UButton
        v-for="opt in BASEMAP_OPTIONS"
        :key="opt.value"
        :label="opt.label"
        :variant="store.basemap === opt.value ? 'solid' : 'ghost'"
        :color="store.basemap === opt.value ? 'primary' : 'neutral'"
        @click="store.basemap = opt.value"
      />
    </UButtonGroup>
  </div>
</template>

<script setup lang="ts">
import { useRunWizardStore } from '~/stores/runWizard'
const store = useRunWizardStore()
const router = useRouter()

const BASEMAP_OPTIONS = [
  { value: 'street' as const, label: 'Street' },
  { value: 'topo' as const, label: 'Topo' },
  { value: 'satellite' as const, label: 'Sat' },
]

function handleBack() {
  if (store.step === 'putin') {
    router.push('/dashboard')
  } else {
    store.back()
  }
}
</script>
