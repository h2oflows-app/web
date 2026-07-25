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
        @pointerdown="backdropDown" @pointerup="backdropUp($event) && cancel()"
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
                        <p v-if="riverLine(selectedRun.river_name, selectedRun.state_abbr)" class="text-xs text-neutral-400 truncate">{{ riverLine(selectedRun.river_name, selectedRun.state_abbr) }}</p>
                      </div>
                      <button type="button" class="text-xs text-primary-600 dark:text-primary-400 hover:underline shrink-0" @click="selectedRunId = ''">Change</button>
                    </div>

                    <div v-else class="space-y-2">
                      <div class="flex items-center gap-1.5">
                        <button
                          type="button"
                          class="rounded-full px-3 py-1 text-xs font-medium transition-colors"
                          :class="pickerScope === 'mine' ? 'bg-primary-600 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'"
                          @click="pickerScope = 'mine'"
                        >My runs</button>
                        <button
                          type="button"
                          class="rounded-full px-3 py-1 text-xs font-medium transition-colors"
                          :class="pickerScope === 'community' ? 'bg-primary-600 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'"
                          @click="pickerScope = 'community'"
                        >Community</button>
                      </div>
                      <input
                        v-model="runFilter"
                        type="text"
                        :placeholder="pickerScope === 'mine' ? 'Filter your runs…' : 'Search community runs…'"
                        class="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                      />
                      <div class="max-h-40 overflow-y-auto rounded-lg border border-neutral-100 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800">
                        <template v-if="pickerScope === 'mine'">
                          <div v-if="runsLoading" class="px-3 py-3 text-xs text-neutral-400 text-center">Loading your runs…</div>
                          <div v-else-if="!filteredRuns.length" class="px-3 py-3 text-xs text-neutral-400 text-center">No runs match.</div>
                          <button
                            v-for="r in filteredRuns"
                            :key="r.id"
                            type="button"
                            class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                            @click="pickMine(r)"
                          >
                            <span class="w-1.5 h-1.5 rounded-full shrink-0" :style="{ background: flowBandSolidColor(r.flow_band, r.flow_status) }" />
                            <div class="min-w-0 flex-1">
                              <p class="text-sm text-neutral-800 dark:text-neutral-100 truncate">{{ r.name }}</p>
                              <p v-if="riverLine(r.river_name, r.state_abbr)" class="text-xs text-neutral-400 truncate">{{ riverLine(r.river_name, r.state_abbr) }}</p>
                            </div>
                          </button>
                        </template>
                        <template v-else>
                          <div v-if="communityLoading" class="px-3 py-3 text-xs text-neutral-400 text-center">Searching…</div>
                          <div v-else-if="!communityRuns.length" class="px-3 py-3 text-xs text-neutral-400 text-center">No community runs match.</div>
                          <button
                            v-for="c in communityRuns"
                            :key="c.id"
                            type="button"
                            class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                            @click="pickCommunity(c)"
                          >
                            <div class="min-w-0 flex-1">
                              <p class="text-sm text-neutral-800 dark:text-neutral-100 truncate">{{ c.name }}</p>
                              <p class="text-xs text-neutral-400 truncate">
                                <template v-if="riverLine(c.river_name, c.state_abbr)">{{ riverLine(c.river_name, c.state_abbr) }} · </template>@{{ c.handle }}<template v-if="c.class_min != null || c.class_max != null"> · Class {{ classRange(c.class_min, c.class_max) }}</template>
                              </p>
                            </div>
                          </button>
                        </template>
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

                  <!-- Meet up at — free-text combobox with suggestions drawn
                       from this run's own rapids/access features (#312),
                       shown while focused. Picking one fills the text and
                       stores a feature ref; typing after that clears the ref
                       (text-only) — see meetupSpot.ts for the wire contract. -->
                  <div class="relative">
                    <label class="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                      Meet up at <span class="text-neutral-400">(optional)</span>
                    </label>
                    <input
                      v-model="meetupText"
                      type="text"
                      placeholder="e.g. gas station on CO-126"
                      class="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                      @focus="meetupFocused = true"
                      @blur="onMeetupBlur"
                    />
                    <p v-if="meetupFeatureRef" class="mt-1 flex items-center gap-1 text-[11px] text-primary-600 dark:text-primary-400">
                      <svg class="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-6.5-7-11a7 7 0 1 1 14 0c0 4.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
                      Linked to a run feature
                    </p>

                    <div
                      v-if="meetupFocused && meetupReachRef"
                      class="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg divide-y divide-neutral-100 dark:divide-neutral-800"
                    >
                      <div v-if="!meetupFetchDone" class="px-3 py-2.5 text-xs text-neutral-400 text-center">Loading features…</div>
                      <template v-else-if="filteredMeetupSuggestions.length">
                        <button
                          v-for="s in filteredMeetupSuggestions"
                          :key="`${s.type}-${s.id}`"
                          type="button"
                          class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                          @click="pickMeetupSuggestion(s)"
                        >
                          <span
                            class="shrink-0 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded text-white"
                            :style="{ background: suggestionChipColor(s) }"
                          >{{ suggestionChipLabel(s) }}</span>
                          <span class="text-sm text-neutral-700 dark:text-neutral-200 truncate">{{ s.name }}</span>
                        </button>
                      </template>
                      <div v-else class="px-3 py-2.5 text-xs text-neutral-400 text-center">No features on this run yet.</div>
                    </div>
                  </div>

                  <!-- Flow chip — only when there's something to show; the
                       auto-stamp explanation lives in the notice below -->
                  <div v-if="flowPreview" class="rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 px-3 py-2.5">
                    <p class="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mb-1">Flow <span class="normal-case font-normal">(auto)</span></p>
                    <div class="flex items-center gap-1.5 text-sm text-neutral-700 dark:text-neutral-300">
                      <span class="w-2 h-2 rounded-full shrink-0" :style="{ background: flowPreview.color }" />
                      {{ flowPreview.label }}<template v-if="flowPreview.cfs != null"> · {{ flowPreview.cfs.toLocaleString() }} cfs</template>
                      <span class="text-neutral-400">{{ flowPreview.stamped ? '' : '(current)' }}</span>
                    </div>
                  </div>

                  <hr class="border-neutral-100 dark:border-neutral-800" />

                  <!-- Crew (#246 W5: moved here from the plan-level New-plan
                       sheet — looking_for_crew/max_crew are per-run now).
                       Hidden for strictly-past dates (a run that already
                       happened can't recruit crew; TODAY keeps it — "paddling
                       this afternoon, need crew" is legit) and once paddled. -->
                  <div v-if="!form.paddled && !isPastDate" class="rounded-xl border border-neutral-100 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800">
                    <div class="flex items-center justify-between gap-3 px-3.5 py-3">
                      <div>
                        <p class="text-sm font-medium text-neutral-800 dark:text-neutral-100">Looking for crew</p>
                        <p class="text-[11px] text-neutral-400 mt-0.5">Show in Discover · paddlers can Join Run</p>
                      </div>
                      <USwitch v-model="form.lookingForCrew" :disabled="!crewAllowed" />
                    </div>

                    <!-- Client rule mirroring the api join gate: a crew run
                         needs a public plan. Visibility itself lives on the
                         plan (edited elsewhere) — this is a hint, not an
                         auto-flip, since the sheet can't reach across
                         entities to change it. -->
                    <p v-if="!crewAllowed" class="px-3.5 py-2 text-[11px] text-amber-600 dark:text-amber-400">
                      This plan is private — make the plan public to look for crew on this run.
                    </p>

                    <div v-if="form.lookingForCrew && crewAllowed" class="flex items-center justify-between gap-3 px-3.5 py-3">
                      <p class="text-sm font-medium text-neutral-800 dark:text-neutral-100">Max crew</p>
                      <div class="flex items-center gap-2">
                        <button
                          type="button"
                          class="w-7 h-7 rounded-full border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-30"
                          :disabled="form.maxCrew <= 1"
                          @click="form.maxCrew = Math.max(1, form.maxCrew - 1)"
                        >−</button>
                        <span class="w-6 text-center text-sm font-semibold text-neutral-800 dark:text-neutral-100">{{ form.maxCrew }}</span>
                        <button
                          type="button"
                          class="w-7 h-7 rounded-full border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-30"
                          :disabled="form.maxCrew >= 20"
                          @click="form.maxCrew = Math.min(20, form.maxCrew + 1)"
                        >+</button>
                      </div>
                    </div>
                  </div>

                  <!-- Log section: paddled + notes. Shown ONLY when the run
                       date is today or past (unlocked); future dates hide it
                       entirely — future days are plans, nothing to log yet
                       (product feedback 2026-07-25, replaces the old
                       disabled-with-hint treatment). -->
                  <div v-if="canTogglePaddled" class="space-y-3">
                    <p class="text-[11px] font-medium text-neutral-400 uppercase tracking-wide">Log</p>

                    <div class="flex items-center justify-between gap-3 rounded-xl border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 px-3.5 py-3">
                      <div>
                        <p class="text-sm font-medium text-neutral-800 dark:text-neutral-100">I paddled this</p>
                        <p class="text-[11px] text-neutral-400 mt-0.5">Locks the flow reading and marks it logged.</p>
                      </div>
                      <USwitch v-model="form.paddled" />
                    </div>

                    <div>
                      <label class="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                        Notes <span class="text-neutral-400">(optional, markdown supported)</span>
                      </label>
                      <textarea
                        v-model="form.notes"
                        rows="3"
                        placeholder="How was it? Conditions, hazards, lines…"
                        class="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                      />
                    </div>
                  </div>

                  <!-- Public-by-default notice -->
                  <p class="text-xs text-neutral-500 dark:text-neutral-400 rounded-lg bg-primary-50/60 dark:bg-primary-950/20 px-3 py-2">
                    Logged runs are <strong class="text-neutral-700 dark:text-neutral-200">public</strong> — they share conditions & shots on the run page, and flow is recorded automatically from the nearest gauge reading when you log. Keep a plan private before you paddle it.
                  </p>

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
import { todayYMD, isPastOrToday } from '~/utils/calendarDate'
import { classRange } from '~/utils/classRating'
import { flowBandLabel, flowBandSolidColor, colorKeyToHex } from '~/utils/flowBand'
import type { PlanRunDetail } from '~/utils/planRun'
import {
  fetchMeetupSuggestions, suggestionChipLabel, suggestionChipColor,
  type MeetupSuggestion, type MeetupFeatureRef,
} from '~/utils/meetupSpot'

interface MyRun {
  id: string
  slug: string
  name: string
  river_name: string | null
  state_abbr?: string | null
  current_cfs: number | null
  flow_band: string | null
  flow_status: string | null
}

function riverLine(river: string | null | undefined, state: string | null | undefined): string {
  return [river, state].filter(Boolean).join(' · ')
}

const { apiBase } = useRuntimeConfig().public
const { getToken } = useAuth()
const toast = useToast()

const { isOpen, mode, planId, runId, prefillDate, planVisibility, close, markSaved } = usePlanRunLogSheet()
const { addRun, patchRun } = usePlans()
const calendar = useCalendar()

const submitting = ref(false)

const form = ref({
  runDate: todayYMD(),
  runTime: '',
  notes: '',
  paddled: false,
  lookingForCrew: false,
  maxCrew: 4,
})

// #246 W5: crew requires a public PLAN (client mirror of the api join gate).
// Unknown (null, briefly before edit-mode's fetch resolves it) is treated as
// not-allowed so the toggle never renders enabled-then-flickers-disabled.
const crewAllowed = computed(() => planVisibility.value === 'public')

// ── Create mode: run picker ─────────────────────────────────────────────
// Two scopes: your own runs, and the global community catalog. A plan run
// may reference ANY live river run (they're all public) — the API resolves
// user_reach_id without an ownership gate.
const runs = ref<MyRun[]>([])
const runsLoading = ref(false)
const runsLoaded = ref(false)
const runFilter = ref('')
const selectedRunId = ref('')
const pickerScope = ref<'mine' | 'community'>('mine')

interface CommunityRun {
  id: string
  slug: string
  name: string
  river_name?: string | null
  state_abbr?: string | null
  handle: string
  class_min: number | null
  class_max: number | null
  gauge_name: string | null
}

const communityRuns = ref<CommunityRun[]>([])
const communityLoading = ref(false)
let communityTimer: ReturnType<typeof setTimeout> | null = null

// Snapshot the pick so a community re-search doesn't drop the selection.
const pickedRun = ref<MyRun | null>(null)
const selectedRun = computed(() =>
  selectedRunId.value && pickedRun.value?.id === selectedRunId.value ? pickedRun.value : null
)

// Reach owner handle for the picked run — null means "the caller's own run"
// (fetch its features via /me/runs/{slug}); set means a community pick,
// fetched via the public /users/{handle}/runs/{slug}. Only used to drive the
// meet-up-spot feature-suggestion fetch below.
const pickedRunHandle = ref<string | null>(null)

function pickMine(r: MyRun) {
  pickedRun.value = r
  selectedRunId.value = r.id
  pickedRunHandle.value = null
}

function pickCommunity(c: CommunityRun) {
  pickedRun.value = {
    id: c.id,
    slug: c.slug,
    name: c.name,
    river_name: [riverLine(c.river_name, c.state_abbr), c.handle ? `@${c.handle}` : ''].filter(Boolean).join(' · ') || null,
    current_cfs: null,
    flow_band: null,
    flow_status: null,
  }
  selectedRunId.value = c.id
  pickedRunHandle.value = c.handle
}

const filteredRuns = computed(() => {
  const q = runFilter.value.trim().toLowerCase()
  if (!q) return runs.value
  return runs.value.filter(r =>
    r.name.toLowerCase().includes(q) || (r.river_name ?? '').toLowerCase().includes(q)
  )
})

async function loadCommunityRuns() {
  communityLoading.value = true
  const q = runFilter.value.trim()
  const url = `${apiBase}/api/v1/discover/runs?limit=20${q ? `&q=${encodeURIComponent(q)}` : ''}`
  const res = await fetch(url).catch(() => null)
  const data = res?.ok ? await res.json().catch(() => null) : null
  communityRuns.value = data?.items ?? []
  communityLoading.value = false
}

watch([pickerScope, runFilter], () => {
  if (pickerScope.value !== 'community') return
  if (communityTimer) clearTimeout(communityTimer)
  communityTimer = setTimeout(loadCommunityRuns, 350)
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
    // Edit mode has no separate plan fetch — the parent plan's visibility
    // (needed for the crew-toggle gate) rides along on this response.
    planVisibility.value = data?.plan?.visibility ?? null
  }
  editLoaded.value = true
  if (editRun.value) {
    form.value = {
      runDate: editRun.value.run_date,
      runTime: (editRun.value.run_time ?? '').slice(0, 5),
      notes: editRun.value.notes ?? '',
      paddled: false, // edit mode only opens for planned (unpaddled) runs
      lookingForCrew: editRun.value.looking_for_crew ?? false,
      maxCrew: editRun.value.max_crew ?? 4,
    }
    meetupText.value = editRun.value.meetup_spot ?? ''
    meetupFeatureRef.value = editRun.value.meetup_feature_type && editRun.value.meetup_feature_id
      ? { type: editRun.value.meetup_feature_type, id: editRun.value.meetup_feature_id }
      : null
    meetupLinkedName.value = meetupFeatureRef.value ? meetupText.value : null
  }
}

// ── Meet up at: free-text + feature-suggestion combobox ─────────────────
const meetupText = ref('')
const meetupFeatureRef = ref<MeetupFeatureRef | null>(null)
// The text that was current the moment meetupFeatureRef was last set (by a
// pick, or by edit-mode prefill) — if meetupText later diverges from this,
// the ref is stale (the user typed over a picked/prefilled spot) and gets
// cleared, per the spec's "typing after a pick clears the ref" rule.
const meetupLinkedName = ref<string | null>(null)
const meetupFocused = ref(false)
const meetupSuggestions = ref<MeetupSuggestion[]>([])
const meetupFetchDone = ref(false)
let meetupBlurTimer: ReturnType<typeof setTimeout> | null = null

function onMeetupBlur() {
  if (meetupBlurTimer) clearTimeout(meetupBlurTimer)
  // Delay so a click on a suggestion button fires before the list unmounts.
  meetupBlurTimer = setTimeout(() => { meetupFocused.value = false }, 150)
}

function pickMeetupSuggestion(s: MeetupSuggestion) {
  meetupText.value = s.name
  meetupFeatureRef.value = { type: s.type, id: s.id }
  meetupLinkedName.value = s.name
  meetupFocused.value = false
}

watch(meetupText, (val) => {
  if (meetupFeatureRef.value && val !== meetupLinkedName.value) {
    meetupFeatureRef.value = null
  }
})

// Reach identity to fetch suggestions for — create mode uses the picked run
// (mine or community); edit mode uses user_reach_slug/user_reach_owner_handle
// off GET /plan-runs/{id} (see planRun.ts, plan_runs.go renderPlanRun). If a
// run somehow has no user_reach_id attached this stays null and the combobox
// degrades to free-text-only (fetchDone still flips true so the list never
// spins forever).
const meetupReachRef = computed<{ slug: string; handle?: string | null } | null>(() => {
  if (mode.value === 'create') {
    return selectedRun.value ? { slug: selectedRun.value.slug, handle: pickedRunHandle.value } : null
  }
  if (mode.value === 'edit' && editRun.value?.user_reach_slug) {
    return { slug: editRun.value.user_reach_slug, handle: editRun.value.user_reach_owner_handle ?? null }
  }
  return null
})

watch(meetupReachRef, async (ref) => {
  meetupSuggestions.value = []
  meetupFetchDone.value = false
  if (!ref) { meetupFetchDone.value = true; return }
  const token = ref.handle ? null : await getToken()
  meetupSuggestions.value = await fetchMeetupSuggestions(apiBase, ref, token)
  meetupFetchDone.value = true
}, { immediate: true })

const filteredMeetupSuggestions = computed(() => {
  const q = meetupText.value.trim().toLowerCase()
  if (!q) return meetupSuggestions.value
  return meetupSuggestions.value.filter(s => s.name.toLowerCase().includes(q))
})

watch(isOpen, (open) => {
  if (!open) return
  if (mode.value === 'create') {
    form.value = {
      runDate: prefillDate.value ?? todayYMD(), runTime: '', notes: '', paddled: false,
      lookingForCrew: false, maxCrew: 4,
    }
    selectedRunId.value = ''
    runFilter.value = ''
    meetupText.value = ''
    meetupFeatureRef.value = null
    meetupLinkedName.value = null
    pickedRunHandle.value = null
    loadMyRuns()
  } else if (mode.value === 'edit' && runId.value) {
    loadEditRun(runId.value)
  }
})

// ── Paddled toggle gating ────────────────────────────────────────────────
const canTogglePaddled = computed(() => isPastOrToday(form.value.runDate))
// Strictly past (not today): a run that already happened can't recruit crew.
const isPastDate = computed(() => !!form.value.runDate && form.value.runDate < todayYMD())
watch(() => form.value.runDate, () => {
  if (!canTogglePaddled.value) form.value.paddled = false
})
watch(crewAllowed, (allowed) => {
  if (!allowed) form.value.lookingForCrew = false
})
// Date flipped into the past while the toggle was on (section now hidden) —
// don't silently submit a stale crew call for a run that already happened.
watch(isPastDate, (past) => {
  if (past) form.value.lookingForCrew = false
})

// ── Flow (auto) preview ──────────────────────────────────────────────────
const flowPreview = computed(() => {
  if (mode.value === 'create') {
    if (!selectedRun.value) return null
    // Community picks carry no live flow fields — fall back to the hint text;
    // the server stamps real flow on save either way.
    if (!selectedRun.value.flow_band && !selectedRun.value.flow_status && selectedRun.value.current_cfs == null) return null
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
      // Notes belong to the log — locked (and not sent) for future dates.
      notes: canTogglePaddled.value ? form.value.notes.trim() || undefined : undefined,
      paddled: form.value.paddled || undefined,
      looking_for_crew: crewAllowed.value ? form.value.lookingForCrew : undefined,
      max_crew: crewAllowed.value && form.value.lookingForCrew ? form.value.maxCrew : undefined,
      // Meet up at — create has no prior state to clear, so omit entirely
      // when empty/unpicked (see usePlans.ts CreatePlanRunBody contract note).
      meetup_spot: meetupText.value.trim() || undefined,
      meetup_feature: meetupFeatureRef.value
        ? { type: meetupFeatureRef.value.type, id: meetupFeatureRef.value.id }
        : undefined,
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
    markSaved()
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
    looking_for_crew: crewAllowed.value ? form.value.lookingForCrew : undefined,
    max_crew: crewAllowed.value && form.value.lookingForCrew ? form.value.maxCrew : undefined,
    // Meet up at — edit mode always sends both together (never omitted) so
    // a cleared field actually clears server-side; see usePlans.ts
    // UpdatePlanRunBody contract note for the full rationale. `?? null` (not
    // `?? undefined`) is load-bearing: the api distinguishes an explicit
    // null from an omitted key to clear a stale ref without wiping the text.
    meetup_spot: meetupText.value.trim(),
    meetup_feature: meetupFeatureRef.value
      ? { type: meetupFeatureRef.value.type, id: meetupFeatureRef.value.id }
      : null,
  })
  submitting.value = false
  if (!ok) return

  toast.add({ title: form.value.paddled ? 'Run logged — nice paddle!' : 'Changes saved', color: 'success' })
  markSaved()
  close()
}
</script>
