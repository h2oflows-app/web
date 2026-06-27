<template>
  <div class="fixed inset-0 z-40 bg-[--ui-bg]">
    <!-- Full-bleed map -->
    <RunWizardMap ref="mapRef" class="absolute inset-0" />

    <!-- App bar overlay -->
    <WizardAppBar />

    <!-- River name chip -->
    <RiverNameChip />

    <!-- Bottom sheet / side panel -->
    <WizardSheet>
      <StepPutIn v-if="store.step === 'putin'" @set-putin="mapRef?.confirmPutIn()" />
      <StepTakeOut
        v-else-if="store.step === 'takeout'"
        @set-takeout="mapRef?.confirmTakeOut()"
        @redo-putin="store.redoPutIn()"
      />
      <StepGauge
        v-else-if="store.step === 'gauge'"
        @continue="store.goDetails()"
        @skip="() => { store.gaugeSkipped = true; store.goDetails() }"
      />
      <StepDetails
        v-else-if="store.step === 'details'"
        @save="store.goSaved()"
      />
    </WizardSheet>

    <!-- Saved overlay (above sheet) -->
    <SavedOverlay v-if="store.step === 'saved'" @reset="handleReset" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRunWizardStore } from '~/stores/runWizard'

defineProps<{ mode?: 'create' | 'edit' }>()

const store = useRunWizardStore()
const mapRef = ref<{ confirmPutIn: () => void; confirmTakeOut: () => void } | null>(null)

function handleReset() {
  store.reset()
}

onMounted(() => {
  store.reset()
})
</script>
