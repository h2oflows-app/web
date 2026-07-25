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

    <!-- Not signed in, no invite-token carve-out — standard gate -->
    <div v-else-if="!isAuthenticated && !inviteToken" class="max-w-2xl mx-auto px-4 py-20 flex flex-col items-center gap-3 text-center">
      <svg class="w-10 h-10 text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
      <h2 class="text-lg font-semibold">Sign in to view this plan</h2>
      <NuxtLink :to="`/login?redirect=${encodeURIComponent(route.fullPath)}`" class="text-sm text-primary-600 dark:text-primary-400 hover:underline">Sign in</NuxtLink>
    </div>

    <!-- Loading plan data -->
    <div v-else-if="!loaded" class="max-w-2xl mx-auto px-4 py-20 flex justify-center">
      <div class="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
    </div>

    <div v-else-if="!plan" class="max-w-2xl mx-auto px-4 py-20 text-center text-neutral-400">Plan not found.</div>

    <!-- Content -->
    <main v-else class="max-w-2xl mx-auto px-4 py-6 pb-24 sm:pb-8 space-y-5">
      <!-- Anon token-carve-out banner: they can see it, but need an account to accept -->
      <div v-if="!isAuthenticated" class="rounded-lg bg-primary-50 dark:bg-primary-950/20 px-3.5 py-2.5 text-xs text-primary-700 dark:text-primary-400">
        You're viewing a shared invite. <NuxtLink :to="`/login?redirect=${encodeURIComponent(route.fullPath)}`" class="font-semibold hover:underline">Sign in or create an account</NuxtLink> to respond.
      </div>

      <!-- Cover + header -->
      <div class="rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700">
        <div class="h-28 flex items-end justify-between p-4" :class="planTypeMeta(plan.type).tintClass">
          <div class="flex items-center gap-1.5">
            <PlanTypeBadge :type="plan.type" />
            <PlanVisibilityBadge :visibility="plan.visibility" />
          </div>
        </div>
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

      <!-- Pending invite(s) — #246 W5: per-run now. Covers the two cases the
           itinerary's own per-run buttons can't: anon token-carve-out
           (sign-in prompt), and an authed-but-unbound token holder (signed
           up with a different email than the invite). -->
      <InviteAcceptCard
        v-if="pendingInviteRuns.length"
        :plan="plan"
        :runs="pendingInviteRuns"
        :token="inviteToken ?? undefined"
        @resolved="onInviteResolved"
      />

      <template v-if="isAuthenticated">
        <!-- Members + invite -->
        <PlanMembersRow
          :members="members"
          :plan-type="plan.type"
          :plan-id="plan.id"
          :is-host="isHost"
          @invite="inviteSheetOpen = true"
        />
      </template>

      <!-- Itinerary — crew meter, Join, and per-run accept/decline now live
           on each run row (#246 W5, mig 000144). -->
      <section class="space-y-2">
        <h2 class="text-xs font-semibold uppercase tracking-wide text-neutral-400">Paddle plans</h2>
        <PlanItinerary
          :plan="plan"
          :itinerary="data?.itinerary ?? []"
          :is-host="isHost"
          :is-accepted-member="isAcceptedMember"
          :highlight-run-id="highlightRunId"
          @refresh="load"
        />
      </section>
    </main>

    <InviteSheet v-if="plan" v-model:open="inviteSheetOpen" :plan-id="plan.id" :runs="inviteSheetRuns" @sent="load" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { PlanDetailResponse, PlanInviteTokenRun } from '~/utils/plan'
import { aggregatePlanMembers } from '~/utils/plan'
import { useInvites } from '~/composables/useInvites'
import { useMyProfile } from '~/composables/useMyProfile'
import { usePlanRunLogSheet } from '~/composables/usePlanRunLogSheet'
import { fmtRange } from '~/utils/calendarDate'
import { planTypeMeta } from '~/utils/planType'

definePageMeta({ ssr: false })

const route = useRoute()
const { apiBase } = useRuntimeConfig().public
const { isAuthenticated, getToken } = useAuth()

const handleParam = route.params.handle as string
const slugParam = route.params.slug as string

// Anon token carve-out (contract §6 REVISED): an invite-email link
// (?invite={token}) grants a signed-out viewer read access to conversion
// — accepting still requires an account. Forwarded to the API as a query
// param per the implementation plan; the API honors it for BOTH anon and
// authed callers (renderPlan, plans.go) — the authed case matters because
// an email invite's plan_members row keeps member_owner_id NULL until
// accept, so an authed-but-unbound invitee (e.g. signed up with a
// different email than the invite) would otherwise fail the private-plan
// visibility gate too.
const inviteToken = computed(() => (typeof route.query.invite === 'string' ? route.query.invite : null))

// Email-link landing (#246 W5 item 3): the reworked invite emails link
// straight to the invited run — ?run={plan_run_id} — so the itinerary can
// scroll to + highlight it, alongside the existing ?invite= token flow.
const highlightRunId = computed(() => (typeof route.query.run === 'string' ? route.query.run : null))

const authReady = ref(false)
onMounted(() => { authReady.value = true })

const data = ref<PlanDetailResponse | null>(null)
const loaded = ref(false)

async function load() {
  loaded.value = false
  let url = `${apiBase}/api/v1/plans/${handleParam}/${slugParam}`
  if (inviteToken.value) url += `?invite=${encodeURIComponent(inviteToken.value)}`

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
  if (isAuthenticated.value || inviteToken.value) load()
  else loaded.value = true // standard gate handles the render, nothing to fetch
}, { immediate: true })

// Refetch the itinerary after the log sheet saves a run — the sheet only
// refreshes the calendar store, which left this page stale until a manual
// reload (prod bug, 2026-07-25).
const { savedCount: logSheetSavedCount } = usePlanRunLogSheet()
watch(logSheetSavedCount, () => { load() })

const plan = computed(() => data.value?.plan ?? null)

// The API emits one flat row per (person, run) — group into one summary
// per person for PlanMembersRow (see PlanMemberRow/aggregatePlanMembers).
const members = computed(() => aggregatePlanMembers(data.value?.members ?? []))

// ── Identity ──────────────────────────────────────────────────────────────
const { handle: myHandle, load: loadMyProfile } = useMyProfile()
onMounted(() => { if (isAuthenticated.value) loadMyProfile() })
watch(isAuthenticated, (v) => { if (v) loadMyProfile() })

const isHost = computed(() => !!plan.value && !!myHandle.value && myHandle.value.toLowerCase() === plan.value.host_handle.toLowerCase())

// #246 W5: "accepted member" is now derived straight off the itinerary —
// any run row where the viewer's own RSVP is accepted — rather than a
// single plan-wide membership status (crew/RSVPs are per-run).
const isAcceptedMember = computed(() => {
  if (isHost.value || !data.value) return false
  return data.value.itinerary.some(day => day.runs.some(r => r.my_rsvp === 'accepted'))
})

// ── Pending invite(s) (viewer) ────────────────────────────────────────────
const { invites: myInvites, refresh: refreshInvites } = useInvites()
watch(isAuthenticated, (v) => { if (v) refreshInvites() }, { immediate: true })

// Bound invite: this account's own pending run rows on THIS plan, sourced
// from /me/invites (covers the common case — already-signed-up invitee).
const myPendingRuns = computed<PlanInviteTokenRun[]>(() => {
  if (!plan.value) return []
  const group = myInvites.value.find(i => i.plan.id === plan.value!.id)
  if (!group) return []
  return group.runs
    .filter(r => r.status === 'invited' && !r.dismissed_at)
    .map(r => ({ member_id: r.member_id, plan_run_id: r.plan_run_id, run_name: r.run_name, run_date: r.run_date, run_time: r.run_time }))
})

// Unbound token holder (different-email conversion) — API-resolved rows
// that aren't reachable via /me/invites yet.
const tokenRuns = computed<PlanInviteTokenRun[]>(() => data.value?.invite_token_runs ?? [])

// Union, de-duped by member_id (a bound invite that ALSO forwarded a valid
// token would otherwise double-list the same run).
const pendingInviteRuns = computed<PlanInviteTokenRun[]>(() => {
  if (!plan.value || isHost.value) return []
  const seen = new Set<string>()
  const merged: PlanInviteTokenRun[] = []
  for (const r of [...myPendingRuns.value, ...tokenRuns.value]) {
    if (seen.has(r.member_id)) continue
    seen.add(r.member_id)
    merged.push(r)
  }
  return merged
})

async function onInviteResolved() {
  await refreshInvites()
  await load()
}

// ── Sheets ────────────────────────────────────────────────────────────────
const inviteSheetOpen = ref(false)

// Flattened run list for InviteSheet's run-selector checkbox list.
const inviteSheetRuns = computed(() =>
  (data.value?.itinerary ?? []).flatMap(day => day.runs.map(r => ({ id: r.id, name: r.name, run_date: r.run_date })))
)
</script>
