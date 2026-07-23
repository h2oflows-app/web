<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
        @click.self="cancel"
      >
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="translate-y-full sm:translate-y-4 sm:opacity-0"
          enter-to-class="translate-y-0 sm:opacity-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="translate-y-0 sm:opacity-100"
          leave-to-class="translate-y-full sm:translate-y-4 sm:opacity-0"
        >
          <div
            v-if="isOpen"
            class="w-full sm:max-w-md max-h-[90vh] flex flex-col bg-white dark:bg-neutral-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden pb-[env(safe-area-inset-bottom)]"
          >
            <div class="flex justify-center pt-3 pb-1 sm:hidden">
              <div class="w-9 h-1 rounded-full bg-neutral-200 dark:bg-neutral-700" />
            </div>

            <div class="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between shrink-0">
              <h2 class="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{{ mode === 'edit' ? 'Edit run' : 'Add a run' }}</h2>
              <button
                class="p-1 rounded text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                aria-label="Close"
                @click="cancel"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div class="flex-1 overflow-y-auto p-4 space-y-4">
              <!-- Locked (edit mode, run somehow already paddled) -->
              <div v-if="mode === 'edit' && editLoaded && editRun?.paddled" class="text-center py-8 space-y-2">
                <p class="text-sm text-neutral-500 dark:text-neutral-400">This run has already been logged.</p>
                <NuxtLink :to="`/plan-runs/${runId}`" class="text-sm text-primary-600 dark:text-primary-400 hover:underline" @click="close">View the logged run →</NuxtLink>
              </div>

              <!-- Fetch failure (edit mode) -->
              <div v-else-if="mode === 'edit' && editLoaded && !editRun" class="text-center py-8">
                <p class="text-sm text-neutral-500 dark:text-neutral-400">Could not load this run.</p>
              </div>

              <template v-else>
                <!-- Loading (edit mode fetch) -->
                <div v-if="mode === 'edit' && !editLoaded" class="space-y-3">
                  <div class="h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
                  <div class="h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
                </div>

                <template v-else>
                  <!-- Run picker (create mode) -->
                  <div v-if="mode === 'create'">
                    <label class="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Run</label>

                    <div v-if="selectedRun" class="flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-2">
                      <svg class="w-4 h-4 text-neutral-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14c3-6 6-9 8-9s5 9 8 9"/></svg>
                      <div class="min-w-0 flex-1">
                        <p class="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">{{ selectedRun.name }}</p>
                        <p v-if="selectedRun.river_name" class="text-xs text-neutral-400 truncate">{{ selectedRun.river_name }}</p>
                      </div>
                      <button type="button" class="text-xs text-primary-600 dark:text-primary-400 hover:underline shrink-0" @click="selectedRunId = ''">Change</button>
                    </div>

                    <div v-else class="space-y-2">
                      <input
                        v-model="runFilter"
                        type="text"
                        placeholder="Filter your runs…"
                        class="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                      />
                      <div class="max-h-40 overflow-y-auto rounded-lg border border-neutral-100 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800">
                        <div v-if="runsLoading" class="px-3 py-3 text-xs text-neutral-400 text-center">Loading your runs…</div>
                        <div v-else-if="!filteredRuns.length" class="px-3 py-3 text-xs text-neutral-400 text-center">No runs match.</div>
                        <button
                          v-for="r in filteredRuns"
                          :key="r.id"
                          type="button"
                          class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                          @click="selectedRunId = r.id"
                        >
                          <span class="w-1.5 h-1.5 rounded-full shrink-0" :style="{ background: flowBandSolidColor(r.flow_band, r.flow_status) }" />
                          <div class="min-w-0 flex-1">
                            <p class="text-sm text-neutral-800 dark:text-neutral-100 truncate">{{ r.name }}</p>
                            <p v-if="r.river_name" class="text-xs text-neutral-400 truncate">{{ r.river_name }}</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Reach (read-only, edit mode) -->
                  <div v-else class="flex items-center gap-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 px-3 py-2 text-sm">
                    <svg class="w-4 h-4 text-neutral-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14c3-6 6-9 8-9s5 9 8 9"/></svg>
                    <span class="text-neutral-700 dark:text-neutral-300 truncate">{{ editRun?.name ?? 'Untitled run' }}</span>
                  </div>

                  <!-- Date + Time -->
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Date</label>
                      <input
                        v-model="form.runDate"
                        type="date"
                        class="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                      />
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Time <span class="text-neutral-400">(optional)</span></label>
                      <input
                        v-model="form.runTime"
                        type="time"
                        class="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                      />
                    </div>
                  </div>

                  <!-- Flow (auto) chip — read-only, server-stamped -->
                  <div class="rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 px-3 py-2.5">
                    <p class="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-1">Flow <span class="normal-case font-normal">(auto)</span></p>
                    <div v-if="flowPreview" class="flex items-center gap-1.5 text-sm text-neutral-700 dark:text-neutral-300">
                      <span class="w-2 h-2 rounded-full shrink-0" :style="{ background: flowPreview.color }" />
                      {{ flowPreview.label }}<template v-if="flowPreview.cfs != null"> · {{ flowPreview.cfs.toLocaleString() }} cfs</template>
                      <span class="text-neutral-400">{{ flowPreview.stamped ? '' : '(current)' }}</span>
                    </div>
                    <p v-else class="text-xs text-neutral-400">{{ mode === 'create' && !selectedRun ? 'Pick a run to preview current flow.' : 'Recorded automatically from the nearest gauge reading when you save.' }}</p>
                  </div>

                  <!-- Paddled toggle / future-date guard -->
                  <div v-if="canTogglePaddled" class="flex items-center justify-between gap-3 rounded-xl border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 px-3.5 py-3">
                    <div>
                      <p class="text-sm font-medium text-neutral-800 dark:text-neutral-100">I paddled this</p>
                      <p class="text-[11px] text-neutral-400 mt-0.5">Locks the flow reading and marks it logged.</p>
                    </div>
                    <USwitch v-model="form.paddled" />
                  </div>
                  <div v-else class="rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 px-3.5 py-3 text-xs text-neutral-500 dark:text-neutral-400">
                    Saving as a <strong class="text-neutral-700 dark:text-neutral-200">plan</strong>. You can mark it paddled on {{ fmtDate(form.runDate) }}.
                  </div>

                  <!-- Public-by-default notice -->
                  <p class="text-xs text-neutral-500 dark:text-neutral-400 rounded-lg bg-primary-50/60 dark:bg-primary-950/20 px-3 py-2">
                    Logged runs are <strong class="text-neutral-700 dark:text-neutral-200">public</strong> — they share conditions & shots on the run page. Keep a plan private before you paddle it.
                  </p>

                  <!-- Notes -->
                  <div>
                    <label class="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Notes <span class="text-neutral-400">(optional, markdown supported)</span></label>
                    <textarea
                      v-model="form.notes"
                      rows="3"
                      placeholder="How was it? Conditions, hazards, lines…"
                      class="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                    />
                  </div>

                  <!-- Photos stub -->
                  <div class="flex items-center gap-2 rounded-lg border border-dashed border-neutral-200 dark:border-neutral-700 px-3 py-2.5 text-xs text-neutral-400">
                    <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                    @nuxt/image + TwicPics — responsive uploads land here next
                  </div>
                </template>
              </template>
            </div>

            <div v-if="!(mode === 'edit' && editLoaded && (editRun?.paddled || !editRun))" class="p-4 border-t border-neutral-100 dark:border-neutral-800 shrink-0">
              <button
                type="button"
                class="w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
                :disabled="!canSubmit || submitting"
                @click="submit"
              >{{ submitting ? 'Saving…' : saveLabel }}</button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { usePlanRunLogSheet } from '~/composables/usePlanRunLogSheet'
import { usePlans } from '~/composables/usePlans'
import { useCalendar } from '~/composables/useCalendar'
import { todayYMD, fmtDate, isPastOrToday } from '~/utils/calendarDate'
import { flowBandLabel, flowBandSolidColor, colorKeyToHex } from '~/utils/flowBand'
import type { PlanRunDetail } from '~/utils/planRun'

interface MyRun {
  id: string
  slug: string
  name: string
  river_name: string | null
  current_cfs: number | null
  flow_band: string | null
  flow_status: string | null
}

const { apiBase } = useRuntimeConfig().public
const { getToken } = useAuth()
const toast = useToast()

const { isOpen, mode, planId, runId, prefillDate, close } = usePlanRunLogSheet()
const { addRun, patchRun } = usePlans()
const calendar = useCalendar()

const submitting = ref(false)

const form = ref({
  runDate: todayYMD(),
  runTime: '',
  notes: '',
  paddled: false,
})

// ── Create mode: run picker ─────────────────────────────────────────────
const runs = ref<MyRun[]>([])
const runsLoading = ref(false)
const runsLoaded = ref(false)
const runFilter = ref('')
const selectedRunId = ref('')

const selectedRun = computed(() => runs.value.find(r => r.id === selectedRunId.value) ?? null)

const filteredRuns = computed(() => {
  const q = runFilter.value.trim().toLowerCase()
  if (!q) return runs.value
  return runs.value.filter(r =>
    r.name.toLowerCase().includes(q) || (r.river_name ?? '').toLowerCase().includes(q)
  )
})

async function loadMyRuns() {
  if (runsLoaded.value || runsLoading.value) return
  runsLoading.value = true
  const token = await getToken()
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${apiBase}/api/v1/me/runs`, { headers }).catch(() => null)
  if (res?.ok) runs.value = await res.json().catch(() => [])
  runsLoading.value = false
  runsLoaded.value = true
}

// ── Edit mode: fetch the existing (planned) run ─────────────────────────
const editRun = ref<PlanRunDetail | null>(null)
const editLoaded = ref(false)

async function loadEditRun(id: string) {
  editLoaded.value = false
  editRun.value = null
  const token = await getToken()
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${apiBase}/api/v1/plan-runs/${id}`, { headers }).catch(() => null)
  if (res?.ok) {
    const data = await res.json().catch(() => null)
    editRun.value = data?.run ?? null
  }
  editLoaded.value = true
  if (editRun.value) {
    form.value = {
      runDate: editRun.value.run_date,
      runTime: (editRun.value.run_time ?? '').slice(0, 5),
      notes: editRun.value.notes ?? '',
      paddled: false, // edit mode only opens for planned (unpaddled) runs
    }
  }
}

watch(isOpen, (open) => {
  if (!open) return
  if (mode.value === 'create') {
    form.value = { runDate: prefillDate.value ?? todayYMD(), runTime: '', notes: '', paddled: false }
    selectedRunId.value = ''
    runFilter.value = ''
    loadMyRuns()
  } else if (mode.value === 'edit' && runId.value) {
    loadEditRun(runId.value)
  }
})

// ── Paddled toggle gating ────────────────────────────────────────────────
const canTogglePaddled = computed(() => isPastOrToday(form.value.runDate))
watch(() => form.value.runDate, () => {
  if (!canTogglePaddled.value) form.value.paddled = false
})

// ── Flow (auto) preview ──────────────────────────────────────────────────
const flowPreview = computed(() => {
  if (mode.value === 'create') {
    if (!selectedRun.value) return null
    return {
      label: flowBandLabel(selectedRun.value.flow_band, selectedRun.value.flow_status),
      cfs: selectedRun.value.current_cfs != null ? Math.round(selectedRun.value.current_cfs) : null,
      color: flowBandSolidColor(selectedRun.value.flow_band, selectedRun.value.flow_status),
      stamped: false,
    }
  }
  if (editRun.value?.flow_band || editRun.value?.gauge_cfs != null) {
    return {
      label: flowBandLabel(editRun.value?.flow_band),
      cfs: editRun.value?.gauge_cfs != null ? Math.round(editRun.value.gauge_cfs) : null,
      color: editRun.value?.flow_color ? colorKeyToHex(editRun.value.flow_color) : flowBandSolidColor(editRun.value?.flow_band),
      stamped: true,
    }
  }
  return null
})

const saveLabel = computed(() => {
  if (mode.value === 'edit') return 'Save changes'
  return form.value.paddled ? 'Log paddle' : 'Save to plan'
})

const canSubmit = computed(() => {
  if (!form.value.runDate) return false
  if (mode.value === 'create') return !!selectedRunId.value
  return true
})

function cancel() {
  close()
}

async function submit() {
  if (!canSubmit.value || submitting.value) return
  submitting.value = true

  if (mode.value === 'create') {
    if (!planId.value) { submitting.value = false; return }
    const result = await addRun(planId.value, {
      user_reach_id: selectedRunId.value,
      run_date: form.value.runDate,
      run_time: form.value.runTime || undefined,
      notes: form.value.notes.trim() || undefined,
      paddled: form.value.paddled || undefined,
    })
    submitting.value = false
    if (!result) return // error toast already shown by usePlans

    const day = calendar.days.value.find(d => d.date === form.value.runDate)
    const saved = day?.runs.find(r => r.id === result.id)
    if (form.value.paddled && saved?.flow_band) {
      const cfsPart = saved.gauge_cfs != null ? ` · ${Math.round(saved.gauge_cfs).toLocaleString()} cfs` : ''
      toast.add({ title: `Logged — ${flowBandLabel(saved.flow_band)}${cfsPart}`, color: 'success' })
    } else {
      toast.add({ title: form.value.paddled ? 'Run logged — nice paddle!' : 'Run saved to your plan', color: 'success' })
    }
    close()
    return
  }

  // edit mode
  if (!runId.value) { submitting.value = false; return }
  const ok = await patchRun(runId.value, {
    run_date: form.value.runDate,
    run_time: form.value.runTime || undefined,
    notes: form.value.notes.trim() || undefined,
    paddled: form.value.paddled || undefined,
  })
  submitting.value = false
  if (!ok) return

  toast.add({ title: form.value.paddled ? 'Run logged — nice paddle!' : 'Changes saved', color: 'success' })
  close()
}
</script>
