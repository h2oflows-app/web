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

      <PlanRunDetailCard ref="detailCardRef" :run="run" @refresh="refresh" @deleted="onDeleted" @left="onLeft" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { usePlanRunLogSheet } from '~/composables/usePlanRunLogSheet'
import { useInvites } from '~/composables/useInvites'
import type { PlanRunDetail } from '~/utils/planRun'

definePageMeta({ ssr: false })

const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const { isAuthenticated, getToken } = useAuth()
const toast = useToast()

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
const run = computed(() => data.value?.run ?? null)

// Template ref onto PlanRunDetailCard's exposed openLeaveConfirm() — see
// maybeHandleLeaveIntent below, which drives it from ?leave=1.
const detailCardRef = ref<{ openLeaveConfirm: () => void } | null>(null)

// ── Auto-accept on email landing (prod-testing follow-up) ────────────────
// The invite email's Accept link now carries `?accept=1` (invites.go's
// acceptURL, both the plain and ?invite=<token> variants) so landing on the
// run page from that link accepts immediately instead of requiring a
// second manual tap on InviteAcceptCard below — product feedback after prod
// testing was that people clicked "Accept" in the email and assumed that
// alone was enough. acceptRequest is useInvites' own accept()'s underlying
// fetch, extracted specifically so this flow can drive its own toast/URL/
// refetch sequence instead of accept()'s (list-context toast + navigateTo,
// neither of which fits landing already ON the run page).
const { acceptRequest, refresh: refreshInvitesList } = useInvites()

// Guards a single AUTOMATIC POST attempt per page visit — set right before
// firing, on success OR failure, so a 409 (crew full, etc.) falls back to
// the normal manual banner/card rather than silently retrying on every
// later refresh() (e.g. the logSheetSavedCount watch below). Deliberately
// separate from checking `my_rsvp` itself: an anon viewer's pre-auth-settle
// load() has no my_member_id yet (see inviteToken's own doc comment on the
// api's `me` LATERAL only matching a real ownerID/email) and must NOT count
// as an attempt — the post-auth re-fetch (same watch below, isAuthenticated
// flips) needs to still try for real once it resolves. That's what makes
// this a "guard against double-fire", not a one-shot "ran once" flag: cheap
// re-checks are fine, only the actual POST is guarded.
const autoAcceptAttempted = ref(false)

// True only while the auto-accept POST itself is in flight — distinct from
// autoAcceptAttempted (which stays true forever once set). Referenced by
// showInviteAccept below so InviteAcceptCard's own Accept/Dismiss buttons
// stay hidden during that window: without this, data.value's synchronous
// update (my_rsvp is still 'invited' until the refresh() after a successful
// accept) can flash the manual card for the split second before the network
// round trip resolves, and a fast tap on its Accept button would race a
// second accept call against this one. Automatically un-hides the card on a
// failed attempt — exactly the "fall back to the normal banner/card" path.
const autoAccepting = ref(false)

async function stripAcceptParams() {
  const q = { ...route.query }
  delete q.accept
  delete q.invite
  await router.replace({ query: q })
}

async function maybeAutoAccept() {
  if (route.query.accept !== '1') return // NEVER auto-accept without this — a bare run-page visit must never silently accept
  // Snapshot into a local const (not repeated run.value accesses) so
  // TypeScript's narrowing of my_member_id below reliably survives to the
  // acceptRequest call further down.
  const r = run.value
  if (!r) return

  // Already accepted (a repeat visit on the same email link, or this same
  // load() firing again after a successful accept below re-triggers it via
  // refresh()) — nothing to do, just drop the param so reloading/sharing the
  // URL doesn't re-trigger anything. Checked before the attempted-guard so
  // it always fires, even on a page visit that never itself attempted.
  if (r.my_rsvp === 'accepted') {
    await stripAcceptParams()
    return
  }

  if (autoAcceptAttempted.value) return
  // Not yet resolvable for this viewer — either a genuinely different invite
  // state, or (anon path) the pre-auth-settle load that has no
  // my_member_id yet. Fall through to the normal banner/card; if this was
  // the anon case, the auth-settle watch's authed re-fetch calls load()
  // again once isAuthenticated flips, re-running this same check with the
  // now-resolved my_rsvp/my_member_id.
  if (r.my_rsvp !== 'invited' || !r.my_member_id) return

  autoAcceptAttempted.value = true
  autoAccepting.value = true
  const { ok, status, body } = await acceptRequest(r.my_member_id, inviteToken.value ?? undefined)
  autoAccepting.value = false

  if (!ok) {
    // Fall back to showing the normal banner/card (my_rsvp is still
    // 'invited' — nothing here changes that) with the api's own error
    // message, same classification useInvites' accept() uses.
    toast.add({ title: 'Could not accept invite', description: status === 409 ? (body?.error ?? 'Already a member') : body?.error, color: 'error' })
    return
  }

  toast.add({ title: "You're on the crew", color: 'success' })
  await stripAcceptParams() // before refresh() so the re-entrant load() below sees a clean query and takes the my_rsvp==='accepted' short-circuit above
  await refresh() // my_rsvp flips to 'accepted' → showInviteAccept goes false, InviteAcceptCard/banner disappears
  await refreshInvitesList() // keeps NotificationBell's unread badge from showing a stale pending invite we just silently resolved
}

// ── "Not going" intent from the update email (?leave=1) ──────────────────
// notifyRunMaterialChange's "Not going" button (api notifications.go) links
// here with ?leave=1 — added alongside PARTSTAT preservation (api's
// AttendeePartStat): once an already-accepted recipient's ATTENDEE line
// stops resetting to NEEDS-ACTION;RSVP=TRUE on every update, their mail
// client no longer offers its own native Decline UI on the update, so this
// is the one remaining one-tap way to bail straight from the email.
//
// Modeled on maybeAutoAccept above, but with the one difference that
// matters most: this must NEVER auto-execute the leave. Accepting is
// reversible/idempotent-ish (re-invite exists); declining drops someone off
// the crew and emails the organizer (notifyOrganizerDeclined) — and mail
// scanners (Outlook SafeLinks and similar) prefetch every link in an email
// on delivery, well before a human ever opens it. A bare GET-triggered
// auto-decline would silently boot people who never clicked anything. So
// ?leave=1 only ever OPENS the same confirm modal the in-app "Remove from
// my calendar" button opens (PlanRunDetailCard's leaveOpen, driven here via
// its exposed openLeaveConfirm — detailCardRef) — the actual POST
// /plan-runs/{id}/leave call only ever fires from that modal's own Remove
// button, same as every other visitor to this confirm.
async function stripLeaveParam() {
  const q = { ...route.query }
  delete q.leave
  await router.replace({ query: q })
}

// Once-per-visit guard, same shape/reasoning as autoAcceptAttempted above —
// without it, every reactive re-load (refresh() after an unrelated edit,
// the logSheetSavedCount watch, etc.) would reopen the confirm modal a
// second time even after the visitor already dismissed or acted on it.
const leaveIntentHandled = ref(false)

async function maybeHandleLeaveIntent() {
  if (route.query.leave !== '1') return // never act without this explicit intent param
  if (leaveIntentHandled.value) return

  if (!isAuthenticated.value) {
    // Same redirect construction as the top-level anon gate in the
    // template above (`/login?redirect=${encodeURIComponent(route.fullPath)}`)
    // — route.fullPath already carries ?leave=1, and confirm.vue's
    // redirectTarget() only ever honors a same-origin path (starts with
    // '/', not '//'), so this can't be turned into an open redirect. Once
    // signed in they land back on this exact URL, the auth watch re-fires
    // load(), and this function runs again — now authenticated.
    leaveIntentHandled.value = true
    await navigateTo(`/login?redirect=${encodeURIComponent(route.fullPath)}`)
    return
  }

  const r = run.value
  if (!r) return // not loaded yet — re-invoked once load() resolves and calls this again

  leaveIntentHandled.value = true

  // Owner, or never a member (my_rsvp absent/declined/requested) — nothing
  // to leave. Strip the param silently rather than opening a confirm for
  // something that doesn't apply to this viewer.
  const isMember = !r.is_owner && (r.my_rsvp === 'invited' || r.my_rsvp === 'accepted')
  if (!isMember) {
    await stripLeaveParam()
    return
  }

  // Open the existing confirm — never call the leave endpoint directly.
  // nextTick: this is often the FIRST load() to resolve, the same tick that
  // flips the `v-else="!run"` template gate from "Run not found"/spinner to
  // <main>, which is what actually mounts PlanRunDetailCard (and populates
  // detailCardRef) — without waiting a tick, the ref can still be null here.
  await nextTick()
  detailCardRef.value?.openLeaveConfirm()
}

// After a successful leave (PlanRunDetailCard's own confirmLeave ->
// emit('left')), onLeft below navigates away entirely, so there's no
// "strip the param and stay" case to handle here for the success path —
// the param goes away with the whole page.

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
  await maybeAutoAccept() // no-op unless ?accept=1 is present — see its own doc comment
  await maybeHandleLeaveIntent() // no-op unless ?leave=1 is present — see its own doc comment
}

watch([authReady, isAuthenticated], () => {
  if (!authReady.value) return
  if (isAuthenticated.value || inviteToken.value) load()
  else pending.value = false // standard gate handles the render, nothing to fetch
}, { immediate: true })

// Show the invite-accept surface for: an anon viewer riding the token
// carve-out (InviteAcceptCard itself only ever shows the sign-in prompt in
// this case — see its own doc comment for why), or an authed viewer with a
// still-pending invite bound to their account.
const showInviteAccept = computed(() => {
  if (!run.value) return false
  if (autoAccepting.value) return false // in-flight auto-accept — see its own doc comment
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
