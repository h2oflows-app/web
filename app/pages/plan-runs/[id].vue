<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950">
    <AppHeader>
      <template v-if="run">
        <span class="text-neutral-300 dark:text-neutral-700 shrink-0">/</span>
        <span class="text-sm font-medium truncate text-neutral-700 dark:text-neutral-200">{{ run.name }}</span>
      </template>
    </AppHeader>

    <!-- Auth loading -->
    <div v-if="!authReady" class="max-w-2xl mx-auto px-4 py-20 flex justify-center">
      <div class="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
    </div>

    <!-- Not signed in, no invite-token carve-out — standard gate. web#354
         W4: the api's ?invite=<token> carve-out (renderPlanRun, plan_runs.go)
         moved here from the old event-page carve-out — an anon viewer
         WITHOUT a token still gets the ordinary auth gate; WITH one, they
         fall through to the fetch below. -->
    <div v-else-if="!isAuthenticated && !inviteToken" class="max-w-2xl mx-auto px-4 py-20 flex flex-col items-center gap-3 text-center">
      <svg class="w-10 h-10 text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
      <h2 class="text-lg font-semibold">Sign in to view this run</h2>
      <NuxtLink :to="`/login?redirect=${encodeURIComponent(route.fullPath)}`" class="text-sm text-primary-600 dark:text-primary-400 hover:underline">Sign in</NuxtLink>
    </div>

    <div v-else-if="pending" class="max-w-2xl mx-auto px-4 py-20 flex justify-center">
      <div class="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
    </div>

    <div v-else-if="!run" class="max-w-2xl mx-auto px-4 py-20 text-center text-neutral-400">
      Run not found.
    </div>

    <main v-else class="max-w-2xl mx-auto px-4 py-8 pb-20 sm:pb-8 space-y-4">
      <!-- Anon token carve-out (web#354 W4 — moved here from the old
           plan-page carve-out): they can see the run, but need an account to
           respond. No separate page-level banner here — an anon viewer only
           ever reaches <main> with a valid token (see the gate above), which
           means showInviteAccept is always true too, so InviteAcceptCard's
           own "Sign in to accept" CTA below already covers this (with run
           context); a second, page-level prompt was pure duplication. -->
      <InviteAcceptCard
        v-if="showInviteAccept"
        :run="run"
        :token="inviteToken ?? undefined"
        @resolved="refresh"
      />

      <PlanRunDetailCard :run="run" @refresh="refresh" @deleted="onDeleted" @left="onLeft" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { usePlanRunLogSheet } from '~/composables/usePlanRunLogSheet'
import type { PlanRunDetail } from '~/utils/planRun'

definePageMeta({ ssr: false })

const route = useRoute()
const config = useRuntimeConfig()
const { isAuthenticated, getToken } = useAuth()

// web#354 A1: GET /plan-runs/{param} no longer wraps a `plan` alongside
// `run` — the run is standalone (decoupled from any specific event), so the
// response is just `{run}` now (plan_runs.go renderPlanRun).
interface PlanRunResponse {
  run: PlanRunDetail
}

const param = route.params.id as string

// Anon token carve-out (web#354 §1, moved here from the old event-page
// carve-out — GetRun/renderPlanRun in plan_runs.go): an invite-email link
// (?invite={token}) grants a signed-out viewer read access to conversion —
// accepting still requires an account. Forwarded to the API as a query
// param; the api honors it for BOTH anon and authed callers — the authed
// case matters because an email invite's run_invites row keeps
// member_owner_id NULL until accept, so an authed-but-unbound invitee (e.g.
// signed up with a different email than the invite) would otherwise fail
// the run's visibility gate too.
const inviteToken = computed(() => (typeof route.query.invite === 'string' ? route.query.invite : null))

const authReady = ref(false)
onMounted(() => { authReady.value = true })

const data = ref<PlanRunResponse | null>(null)
const pending = ref(false)

// Monotonic request counter — the token-landing watch below can dispatch two
// loads in quick succession (an anon-token fetch before the session
// hydrates, then an authed re-fetch once it does; see useAuth's getToken doc
// comment on why session hydration lags mount). Without a sequence guard the
// two in-flight responses race and a naive last-writer-wins `data.value =`
// can land the stale (anon) response after the authed one. Tag each call and
// drop any response that isn't from the most recent call.
let requestSeq = 0

async function load() {
  const seq = ++requestSeq
  pending.value = true
  let url = `${config.public.apiBase}/api/v1/plan-runs/${param}`
  if (inviteToken.value) url += `?invite=${encodeURIComponent(inviteToken.value)}`

  const headers: Record<string, string> = {}
  if (isAuthenticated.value) {
    const token = await getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(url, { headers }).catch(() => null)
  const json = res?.ok ? await res.json().catch(() => null) : null
  if (seq !== requestSeq) return // a newer load() superseded this one
  data.value = json
  pending.value = false
}

watch([authReady, isAuthenticated], () => {
  if (!authReady.value) return
  if (isAuthenticated.value || inviteToken.value) load()
  else pending.value = false // standard gate handles the render, nothing to fetch
}, { immediate: true })

const run = computed(() => data.value?.run ?? null)

// Show the invite-accept surface for: an anon viewer riding the token
// carve-out (InviteAcceptCard itself only ever shows the sign-in prompt in
// this case — see its own doc comment for why), or an authed viewer with a
// still-pending invite bound to their account.
const showInviteAccept = computed(() => {
  if (!run.value) return false
  if (!isAuthenticated.value) return !!inviteToken.value
  return run.value.my_rsvp === 'invited'
})

async function refresh() {
  await load()
}

// Refetch after the unified sheet's Edit button (PlanRunDetailCard) saves —
// mirrors plans/[handle]/[slug].vue's own savedCount watch: the sheet only
// refreshes the calendar store itself, which otherwise leaves this
// standalone page's own `run` fetch stale until a manual reload (same class
// of bug as the 2026-07-25 event-page report).
const { savedCount: logSheetSavedCount } = usePlanRunLogSheet()
watch(logSheetSavedCount, () => { refresh() })

async function onDeleted() {
  await navigateTo('/calendar')
}

// Invite-sync WEB-3 item 2 — the run is still live (only the caller's own
// membership changed), but there's nothing left for THIS viewer to look at
// once they've removed themselves, so same exit as delete.
async function onLeft() {
  await navigateTo('/calendar')
}
</script>
