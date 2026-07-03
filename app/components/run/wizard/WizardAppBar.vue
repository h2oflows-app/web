<template>
  <div class="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 pt-3 pb-2 pointer-events-none">
    <!-- Back/Cancel -->
    <UButton
      :label="store.step === 'putin' ? 'Cancel' : 'Back'"
      leading-icon="i-heroicons-chevron-left"
      variant="solid"
      color="neutral"
      size="sm"
      class="pointer-events-auto shadow-md"
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
  // Edit mode lands on the 'details' step; the only sub-step it can drill into
  // is 'gauge' (Change/Add gauge). It must NOT walk backward through the create
  // wizard's putin/takeout steps (issue #308).
  if (store.mode === 'edit') {
    if (store.step === 'details') {
      // Leave the editor the way the browser back button would.
      if (import.meta.client && window.history.state?.back) router.back()
      else router.push('/my/runs')
    } else {
      // Drilled into the gauge sub-step — return to the run details.
      store.goDetails()
    }
    return
  }

  // Create mode: sequential step-back; 'putin' cancels out to the dashboard.
  if (store.step === 'putin') {
    router.push('/dashboard')
  } else {
    store.back()
  }
}
</script>
