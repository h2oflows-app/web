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

      <!-- Pending invite (viewer, anon token-carve-out, or authed token-holder
           not yet bound to the invite — different-email conversion) -->
      <InviteAcceptCard
        v-if="showInviteAcceptCard"
        :plan="plan"
        :member-id="myPendingInvite?.member_id ?? data?.invite_member_id ?? ''"
        :token="inviteToken ?? undefined"
        @accepted="onInviteResolved"
        @dismissed="onInviteResolved"
      />

      <template v-if="isAuthenticated">
        <!-- Members + invite -->
        <PlanMembersRow
          :members="data?.members ?? []"
          :plan-type="plan.type"
          :is-host="isHost"
          @invite="inviteSheetOpen = true"
        />

        <!-- Crew meter -->
        <div v-if="plan.looking_for_crew" class="rounded-xl border border-neutral-100 dark:border-neutral-800 px-3.5 py-3">
          <PlanCrewMeter :filled="data?.crew.filled ?? 0" :max="data?.crew.max">
            <template v-if="isHost" #action>
              <button type="button" class="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline" @click="crewPanelOpen = true">Manage</button>
            </template>
          </PlanCrewMeter>
        </div>

        <!-- Join Run (authed non-member, public + looking-for-crew) -->
        <div v-if="showJoin" class="flex items-center justify-between gap-3 rounded-xl border border-primary-100 dark:border-primary-900/50 bg-primary-50/60 dark:bg-primary-950/20 px-3.5 py-3">
          <div>
            <p class="text-sm font-medium text-neutral-800 dark:text-neutral-100">Looking for crew</p>
            <p class="text-[11px] text-neutral-400 mt-0.5">Send the host a request to join</p>
          </div>
          <button
            type="button"
            class="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            :class="joinRequested ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400' : 'bg-primary-600 hover:bg-primary-700 text-white'"
            :disabled="joining || joinRequested || crewFull"
            @click="onJoin"
          >{{ joinRequested ? 'Requested' : crewFull ? 'Crew full' : joining ? '…' : 'Join Run' }}</button>
        </div>
      </template>

      <!-- Itinerary -->
      <section class="space-y-2">
        <h2 class="text-xs font-semibold uppercase tracking-wide text-neutral-400">Itinerary</h2>
        <PlanItinerary
          :plan="plan"
          :itinerary="data?.itinerary ?? []"
          :is-host="isHost"
          :is-accepted-member="isAcceptedMember"
          @refresh="load"
        />
      </section>
    </main>

    <InviteSheet v-if="plan" v-model:open="inviteSheetOpen" :plan-id="plan.id" @sent="load" />
    <PlanCrewPanel v-if="plan" v-model:open="crewPanelOpen" :plan-id="plan.id" @refresh="load" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { PlanDetailResponse } from '~/utils/plan'
import { useInvites } from '~/composables/useInvites'
import { useMyProfile } from '~/composables/useMyProfile'
import { fmtRange } from '~/utils/calendarDate'
import { planTypeMeta } from '~/utils/planType'

definePageMeta({ ssr: false })

const route = useRoute()
const { apiBase } = useRuntimeConfig().public
const { isAuthenticated, getToken } = useAuth()
const toast = useToast()

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

const plan = computed(() => data.value?.plan ?? null)

// ── Identity ──────────────────────────────────────────────────────────────
const { handle: myHandle, load: loadMyProfile } = useMyProfile()
onMounted(() => { if (isAuthenticated.value) loadMyProfile() })
watch(isAuthenticated, (v) => { if (v) loadMyProfile() })

const isHost = computed(() => !!plan.value && !!myHandle.value && myHandle.value.toLowerCase() === plan.value.host_handle.toLowerCase())

const myMember = computed(() => {
  if (!myHandle.value || !data.value) return null
  return data.value.members.find(m => m.handle.toLowerCase() === myHandle.value!.toLowerCase()) ?? null
})
const isAcceptedMember = computed(() => !isHost.value && myMember.value?.status === 'accepted')

// ── Pending invite (viewer) ──────────────────────────────────────────────
const { invites: myInvites, refresh: refreshInvites } = useInvites()
watch(isAuthenticated, (v) => { if (v) refreshInvites() }, { immediate: true })

const myPendingInvite = computed(() => {
  if (!plan.value) return null
  return myInvites.value.find(i => i.plan.id === plan.value!.id && i.status === 'invited' && !i.dismissed_at) ?? null
})

const showInviteAcceptCard = computed(() => {
  if (!plan.value || isHost.value) return false
  if (!isAuthenticated.value) return !!inviteToken.value
  // Either the invite is already bound/discoverable via /me/invites, or the
  // caller is holding a valid token the API resolved to a not-yet-bound
  // invite (different-email conversion — invite_member_id on the response).
  return !!myPendingInvite.value || !!(inviteToken.value && data.value?.invite_member_id)
})

async function onInviteResolved() {
  await refreshInvites()
  await load()
}

// ── Join Run (authed non-member, public + looking-for-crew) ─────────────
const joining = ref(false)
const joinRequested = ref(false)

const crewFull = computed(() => {
  const c = data.value?.crew
  return !!c && c.max != null && c.filled >= c.max
})

const showJoin = computed(() => {
  if (!plan.value || isHost.value) return false
  if (myMember.value) return false // already invited/requested/accepted/declined
  return plan.value.visibility === 'public' && plan.value.looking_for_crew
})

async function onJoin() {
  if (!plan.value || joining.value) return
  joining.value = true
  const token = await getToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${apiBase}/api/v1/plans/${plan.value.id}/join`, {
    method: 'POST', headers, body: JSON.stringify({}),
  }).catch(() => null)
  joining.value = false

  if (!res?.ok) {
    const msg = await res?.json().catch(() => null)
    toast.add({ title: res?.status === 409 ? 'Crew is full' : 'Could not send join request', description: msg?.error, color: 'error' })
    return
  }
  joinRequested.value = true
  toast.add({ title: "Request sent — you'll hear back", color: 'success' })
  await load()
}

// ── Sheets ────────────────────────────────────────────────────────────────
const inviteSheetOpen = ref(false)
const crewPanelOpen = ref(false)
</script>
