<template>
  <div
    v-if="show && member"
    class="flex items-center gap-3 rounded-xl bg-linear-to-r from-amber-400 to-amber-500 dark:from-amber-600 dark:to-amber-700 px-4 py-3 text-white shadow-sm"
  >
    <div class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 12c2-4 4-6 6-6s4 6 6 6 4-6 6-6"/>
      </svg>
    </div>

    <div class="min-w-0 flex-1">
      <p class="text-sm font-medium truncate">Did you paddle {{ member.run_name }} on {{ dow(member.run_date) }}?</p>
      <p class="text-xs text-white/80 truncate">
        {{ fmtDate(member.run_date) }} · you planned it and it ran <strong class="font-semibold">{{ flowBandLabel(member.flow_band) }}<template v-if="member.gauge_cfs != null"> · {{ Math.round(member.gauge_cfs).toLocaleString() }} cfs</template></strong>
      </p>
    </div>

    <button
      type="button"
      class="shrink-0 rounded-full bg-white/90 hover:bg-white text-amber-700 px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
      :disabled="acting"
      @click="onPaddledIt"
    >Paddled it</button>
    <button
      type="button"
      class="shrink-0 rounded-full bg-white/20 hover:bg-white/30 px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
      :disabled="acting"
      @click="onNope"
    >Nope</button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useNudge } from '~/composables/useNudge'
import { usePlanRunLogSheet } from '~/composables/usePlanRunLogSheet'
import { dow, fmtDate } from '~/utils/calendarDate'
import { flowBandLabel } from '~/utils/flowBand'

const { member, promptAllowed, shownThisSession, loadCandidate, markShown, dismiss } = useNudge()
const planRunLogSheet = usePlanRunLogSheet()
const toast = useToast()

// Latched at mount time — NOT a reactive re-derivation of
// `member && promptAllowed && !shownThisSession`, since markShown() below
// flips shownThisSession to true right after we decide to show, which would
// otherwise make the card vanish the instant it appears. Nudge test
// contract: "never fires on open-alone; 1/day (second mount silent)" — a
// second /calendar mount within the same session recomputes this from
// scratch and finds shownThisSession already true, so `show` never flips.
const show = ref(false)
const acting = ref(false)

onMounted(async () => {
  await loadCandidate()
  if (member.value && promptAllowed.value && !shownThisSession.value) {
    show.value = true
    markShown()
  }
})

async function onPaddledIt() {
  if (!member.value || acting.value) return
  planRunLogSheet.openConfirm({
    user_reach_id: member.value.user_reach_id,
    run_name: member.value.run_name,
    run_date: member.value.run_date,
    flow_band: member.value.flow_band,
    gauge_cfs: member.value.gauge_cfs,
  })
  show.value = false
}

async function onNope() {
  if (!member.value || acting.value) return
  acting.value = true
  const ok = await dismiss(member.value.user_reach_id, member.value.run_date)
  acting.value = false
  show.value = false
  if (ok) toast.add({ title: "No worries — won't ask again", color: 'info' })
}
</script>
