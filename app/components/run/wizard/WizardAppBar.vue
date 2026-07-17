<template>
  <!-- Constrained to the map area on desktop (md:right-[420px]) so the basemap
       switcher clears the fixed 420px WizardSheet panel instead of hiding under it. -->
  <div class="absolute top-0 left-0 right-0 md:right-105 z-20 flex items-center justify-between gap-2 px-3 pt-3 pb-2 pointer-events-none">
    <!-- Back/Cancel + run/river chip (kept together, top-left) -->
    <div class="flex items-center gap-2 min-w-0">
      <UButton
        :label="store.step === 'putin' ? 'Cancel' : 'Back'"
        leading-icon="i-heroicons-chevron-left"
        variant="solid"
        color="neutral"
        size="sm"
        class="pointer-events-auto shadow-md shrink-0"
        @click="handleBack"
      />
      <RiverNameChip />
    </div>
    <!-- Basemap switcher (Street / Topo / Sat). Solid buttons so they stay legible
         over satellite imagery; active = primary. -->
    <UButtonGroup size="sm" class="pointer-events-auto shadow-md shrink-0">
      <UButton
        v-for="opt in BASEMAP_OPTIONS"
        :key="opt.value"
        :label="opt.label"
        variant="solid"
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
  // Edit mode lands on the 'details' step (the "Edit run" screen). Sub-steps
  // it can enter: 'gauge' (Change/Add gauge) and putin/takeout via the
  // "Reset flow line" action. Back never walks the create-wizard sequence
  // (issue #308) — it cancels back to the edit screen.
  if (store.mode === 'edit') {
    if (store.step === 'details') {
      // Leave the editor the way the browser back button would.
      if (import.meta.client && window.history.state?.back) router.back()
      else router.push('/my/runs')
    } else if (store.step === 'putin' || store.step === 'takeout') {
      // Mid flow-line reset — cancel and restore the previous geometry.
      store.cancelFlowLineReset()
    } else {
      // Gauge sub-step — return to the edit screen.
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
