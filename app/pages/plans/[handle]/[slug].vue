<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950">
    <AppHeader>
      <template v-if="plan">
        <span class="text-neutral-300 dark:text-neutral-700 shrink-0">/</span>
        <span class="text-sm font-medium truncate text-neutral-700 dark:text-neutral-200">{{ plan.name }}</span>
      </template>
    </AppHeader>

    <!-- Auth loading -->
    <div v-if="!authReady" class="max-w-2xl mx-auto px-4 py-20 flex justify-center">
      <div class="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
    </div>

    <!-- Not signed in — the event page is owner-only now (web#354 A1): there
         is no anon carve-out here anymore (that moved to the run page,
         renderPlanRun's ?invite= grant), so this is an unconditional gate. -->
    <div v-else-if="!isAuthenticated" class="max-w-2xl mx-auto px-4 py-20 flex flex-col items-center gap-3 text-center">
      <svg class="w-10 h-10 text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
      <h2 class="text-lg font-semibold">Sign in to view this event</h2>
      <NuxtLink :to="`/login?redirect=${encodeURIComponent(route.fullPath)}`" class="text-sm text-primary-600 dark:text-primary-400 hover:underline">Sign in</NuxtLink>
    </div>

    <!-- Loading event data -->
    <div v-else-if="!loaded" class="max-w-2xl mx-auto px-4 py-20 flex justify-center">
      <div class="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
    </div>

    <!-- 404 (non-owner) or a genuinely missing event both land here — the
         api never distinguishes the two to an authed caller (uniform 404). -->
    <div v-else-if="!plan" class="max-w-2xl mx-auto px-4 py-20 text-center text-neutral-400">Event not found.</div>

    <!-- Content -->
    <main v-else class="max-w-2xl mx-auto px-4 py-6 pb-24 sm:pb-8 space-y-5">
      <!-- Cover + header. web#354 A1/W1: no badges — event-type + visibility
           concepts removed entirely; a single Event tint replaces the old
           per-type cover color. -->
      <div class="rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700">
        <div class="h-28 flex items-end justify-between p-4" :class="EVENT_COLOR.tintClass" />
        <div class="bg-white dark:bg-neutral-900 px-4 py-4 space-y-2">
          <h1 class="text-lg font-bold text-neutral-900 dark:text-white">{{ plan.name }}</h1>
          <p class="text-xs text-neutral-400">Organized by @{{ plan.host_handle }}</p>
          <div class="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
            <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            {{ fmtRange(plan.start_date, plan.end_date) }}
            <template v-if="plan.location"> · {{ plan.location }}</template>
          </div>
        </div>
      </div>

      <!-- Itinerary — crew meter, Join/Accept-decline, and per-run Invite all
           live on each run row now (#246 W5, mig 000144; invite moved here
           web#354 W2/A2). -->
      <section class="space-y-2">
        <h2 class="text-xs font-semibold uppercase tracking-wide text-neutral-400">Runs during this Event</h2>
        <PlanItinerary
          :itinerary="data?.itinerary ?? []"
          :is-host="isHost"
          :is-accepted-member="isAcceptedMember"
          :highlight-run-id="highlightRunId"
          @refresh="load"
        />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { PlanDetailResponse } from '~/utils/plan'
import { useMyProfile } from '~/composables/useMyProfile'
import { usePlanRunLogSheet } from '~/composables/usePlanRunLogSheet'
import { fmtRange } from '~/utils/calendarDate'
import { EVENT_COLOR } from '~/utils/planType'

definePageMeta({ ssr: false })

const route = useRoute()
const { apiBase } = useRuntimeConfig().public
const { isAuthenticated, getToken } = useAuth()

const handleParam = route.params.handle as string
const slugParam = route.params.slug as string

// Email-link landing (#246 W5 item 3): scrolls to + rings a specific run
// named by ?run={plan_run_id} once the itinerary renders. Unrelated to the
// (removed) ?invite= token carve-out, which lived at the EVENT level and
// moved entirely to the run page in web#354 A1/A2 — this is just a same-page
// anchor.
const highlightRunId = computed(() => (typeof route.query.run === 'string' ? route.query.run : null))

const authReady = ref(false)
onMounted(() => { authReady.value = true })

const data = ref<PlanDetailResponse | null>(null)
const loaded = ref(false)

async function load() {
  loaded.value = false
  const url = `${apiBase}/api/v1/plans/${handleParam}/${slugParam}`

  const headers: Record<string, string> = {}
  if (isAuthenticated.value) {
    const token = await getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(url, { headers }).catch(() => null)
  data.value = res?.ok ? await res.json().catch(() => null) : null
  loaded.value = true
}

watch([authReady, isAuthenticated], () => {
  if (!authReady.value) return
  if (isAuthenticated.value) load()
  else loaded.value = true // standard gate handles the render, nothing to fetch
}, { immediate: true })

// Refetch the itinerary after the log sheet saves a run — the sheet only
// refreshes the calendar store, which left this page stale until a manual
// reload (prod bug, 2026-07-25).
const { savedCount: logSheetSavedCount } = usePlanRunLogSheet()
watch(logSheetSavedCount, () => { load() })

// web#354 A1 JSON wrapper rename: `plan`→`event`. Kept the local var name
// `plan` (minimal churn — every other reference in this file already reads
// `plan.value.*`).
const plan = computed(() => data.value?.event ?? null)

// ── Identity ──────────────────────────────────────────────────────────────
const { handle: myHandle, load: loadMyProfile } = useMyProfile()
onMounted(() => { if (isAuthenticated.value) loadMyProfile() })
watch(isAuthenticated, (v) => { if (v) loadMyProfile() })

const isHost = computed(() => !!plan.value && !!myHandle.value && myHandle.value.toLowerCase() === plan.value.host_handle.toLowerCase())

// #246 W5: "accepted member" is derived straight off the itinerary — any run
// row where the viewer's own RSVP is accepted — rather than a single
// plan-wide membership status (crew/RSVPs are per-run). web#354 A1: the
// event page is owner-only now (renderPlan 404s any non-owner), so in
// practice this is always false here (isHost is always true whenever `plan`
// loaded at all) — kept as-is since PlanItinerary's isAcceptedMember prop is
// a real, independently meaningful part of its contract regardless of which
// page happens to render it.
const isAcceptedMember = computed(() => {
  if (isHost.value || !data.value) return false
  return data.value.itinerary.some(day => day.runs.some(r => r.my_rsvp === 'accepted'))
})
</script>
