<template>
  <div class="space-y-6">
    <!-- Header card -->
    <div class="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 px-5 py-4 space-y-3">
      <div class="flex items-start justify-between gap-3 flex-wrap">
        <div class="min-w-0">
          <!-- Name (web#354 A4/W6) — the calendar run's OWN name. Display-only
               here now (fix/run-detail-crew-edit): the inline pencil editor
               was removed once the unified PlanRunLogSheet gained a
               same-page Edit entry point (below) covering both planned and
               paddled runs — one editing surface instead of two drifting
               ones (product feedback 2026-07-29, "run details + edit modal
               ... should really share the same unified sheet"). -->
          <h1 class="text-lg font-bold text-neutral-900 dark:text-white truncate">{{ run.name }}</h1>
          <!-- Attached library run's own name (web#354 A4/W6) — secondary
               only, and only when it differs from the calendar run's own
               name (avoid "Foxton — Foxton" dupes). -->
          <p v-if="run.reach_name && run.reach_name !== run.name" class="text-xs text-neutral-400 mt-0.5 truncate">{{ run.reach_name }}</p>
        </div>
        <div class="flex items-center gap-3 shrink-0">
          <!-- Edit (owner only) — single editing surface (fix/run-detail-
               crew-edit): opens the unified PlanRunLogSheet in edit mode,
               same sheet the calendar's "+ New"/day-sheet/PlanRunItem use.
               Shown regardless of paddled — the sheet's own edit-mode
               branches to a reduced Name+Notes-only form once it sees
               editRun.paddled (api locks structural fields on a paddled run,
               plan_runs.go UpdateRun's curPaddled branch). -->
          <button
            v-if="isOwner"
            class="inline-flex items-center gap-1.5 rounded-lg bg-primary-50 dark:bg-primary-950/50 hover:bg-primary-100 dark:hover:bg-primary-950 px-3 py-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 transition-colors"
            @click="planRunLogSheet.openEdit(run.id)"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
            Edit
          </button>
          <!-- Invite (owner only) — web#354 W-fix2: entry point moved here
               from the event page's PlanItinerary rows (invites are
               run-scoped, run_invites keyed to run_id only; having the
               button live on the event page made invites read as
               event-scoped). Same InviteSheet the removed itinerary button
               opened. -->
          <!-- No inviting to a run that already happened and was logged —
               the crew who ran it belongs in the log instead (display comes
               with the invite-sync WEB-3 wave; server guard in API-2). -->
          <button
            v-if="isOwner && !run.paddled"
            class="inline-flex items-center gap-1.5 rounded-lg bg-primary-50 dark:bg-primary-950/50 hover:bg-primary-100 dark:hover:bg-primary-950 px-3 py-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 transition-colors"
            @click="inviteOpen = true"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
            Invite
          </button>
          <button
            class="inline-flex items-center gap-1.5 rounded-lg bg-primary-50 dark:bg-primary-950/50 hover:bg-primary-100 dark:hover:bg-primary-950 px-3 py-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 transition-colors"
            @click="shareOpen = true"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            Share
          </button>
          <!-- Remove from my calendar (non-owner, invite-sync WEB-3 item 2) —
               attendee-facing counterpart to the owner's Delete button
               below. Only for a live relationship (accepted or still-invited
               my_rsvp) — a declined/requested viewer has nothing left to
               remove. Same destructive-hover icon-button treatment as Flag
               just below it. -->
          <button
            v-if="!isOwner && canLeave"
            class="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:text-red-500 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            title="Remove from my calendar"
            @click="leaveOpen = true"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="9" y1="16" x2="15" y2="16"/>
            </svg>
          </button>
          <button
            v-if="!isOwner && isAuthenticated && !flagDone"
            class="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:text-red-500 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            title="Flag as inappropriate"
            @click="flagOpen = true"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
            </svg>
          </button>
          <span v-else-if="flagDone" class="text-xs text-red-400">Flagged</span>
          <div class="text-right">
            <div class="text-sm font-medium text-neutral-700 dark:text-neutral-300">{{ fmtDate(run.run_date, { month: 'short', day: 'numeric', year: 'numeric' }) }}</div>
            <div v-if="run.run_time" class="text-xs text-neutral-400">{{ fmtTime(run.run_time) }}</div>
          </div>
        </div>
      </div>

      <!-- Flow / paddled badges -->
      <div class="flex items-center gap-2 flex-wrap">
        <span
          v-if="run.flow_band || run.gauge_cfs != null"
          class="inline-flex items-center gap-1 rounded-md bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:text-neutral-300"
        >
          <template v-if="run.gauge_cfs != null">{{ Math.round(run.gauge_cfs).toLocaleString() }} cfs</template>
          <span v-if="run.flow_band" :class="colorKeyToBadgeClass(run.flow_color ?? '')" class="rounded px-1 font-medium">{{ flowBandLabel(run.flow_band) }}</span>
        </span>
        <span
          class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium"
          :class="run.paddled
            ? 'bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400'
            : 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'"
        >
          <svg v-if="run.paddled" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12c2-4 4-6 6-6s4 6 6 6 4-6 6-6"/></svg>
          {{ run.paddled ? 'Logged' : 'Planned' }}
        </span>
      </div>

      <!-- Crew who's coming / who ran it (invite-sync API-2/WEB-3
           Amendments, "Crew who ran it belongs in the log") — ACCEPTED
           handles only, for every viewer (owner included, in principle),
           but hidden for the owner here since the owner-only roster card
           below already shows the same accepted names plus pending/declined
           state — showing both would just be the same handles twice on one
           page. -->
      <div v-if="!isOwner && crewMembersLine" class="flex items-center gap-1.5 pt-1 text-xs text-neutral-500 dark:text-neutral-400">
        <svg class="w-3.5 h-3.5 text-neutral-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <span class="truncate"><span class="font-medium text-neutral-600 dark:text-neutral-300">{{ run.paddled ? 'Crew who ran it' : 'Crew' }}:</span> {{ crewMembersLine }}</span>
      </div>

      <div v-if="run.meetup_spot" class="flex items-center gap-2 pt-1">
        <svg class="w-4 h-4 text-neutral-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-6.5-7-11a7 7 0 1 1 14 0c0 4.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
        <div class="min-w-0">
          <p class="text-[11px] font-medium text-neutral-400 uppercase tracking-wide">Meet up at</p>
          <p class="text-sm text-neutral-700 dark:text-neutral-200 truncate">{{ run.meetup_spot }}</p>
        </div>
      </div>
    </div>

    <!-- Crew (owner only) — visible roster on the run detail page itself
         (product feedback 2026-07-29: "I still can't see who was invited on
         the run"). GET /plan-runs/{id}/crew (invites.go RunCrewList,
         host-only) returns accepted crew, pending join requests, AND
         still-pending EMAIL/handle invites — same endpoint InviteSheet's
         "Already on this run"/"Pending invites" panes already read, just
         surfaced here too so the owner doesn't have to open Invite to check
         status. Gated on crewLoaded (fetch-done), not row count, so it never
         flashes an empty/nag state during the async window. -->
    <div v-if="showCrewSection" class="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 px-5 py-4 space-y-3">
      <h2 class="text-xs font-semibold uppercase tracking-wide text-neutral-400">Crew</h2>

      <div v-if="!crewLoaded" class="text-sm text-neutral-400">Loading…</div>
      <!-- Paddled runs only ever reach this empty branch transiently (before
           crewLoaded) — showCrewSection hides the whole card once loaded if
           a logged run has no rows, so this copy only ever renders for an
           unpaddled run. -->
      <p v-else-if="!crew.length" class="text-sm text-neutral-400">No crew yet — invite someone</p>
      <div v-else class="divide-y divide-neutral-100 dark:divide-neutral-800 -mx-1">
        <div v-for="m in crew" :key="m.member_id" class="flex items-center gap-3 px-1 py-2.5">
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">{{ m.handle ? `@${m.handle}` : m.invite_email }}</p>
          </div>
          <button
            v-if="m.invite_email && m.status === 'invited'"
            type="button"
            class="shrink-0 text-[11px] font-medium text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-50"
            :disabled="resendingId === m.member_id"
            @click="onResendInvite(m)"
          >{{ resendingId === m.member_id ? 'Resending…' : 'Resend' }}</button>
          <!-- Re-invite (WEB-4 leftover, invite-sync R4) — a declined
               invite-origin row: the api resurrects it on a plain repeat
               invite call (flips back to invited + fresh token), so this is
               the whole re-invite. Join-request declines (origin=request)
               don't get this — re-inviting isn't a coherent action for
               someone who asked to join and was turned down. -->
          <button
            v-if="m.status === 'declined' && m.origin === 'invite' && !run.paddled"
            type="button"
            class="shrink-0 text-[11px] font-medium text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-50"
            :disabled="reinvitingId === m.member_id"
            @click="onReinvite(m)"
          >{{ reinvitingId === m.member_id ? 'Inviting…' : 'Re-invite' }}</button>
          <span class="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full" :class="crewChipClass(m)">{{ crewChipLabel(m) }}</span>
        </div>
      </div>
    </div>

    <!-- Notes — display-only (see the Name comment above; editing moved to
         the unified sheet's Edit button). -->
    <div class="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 px-5 py-4 space-y-3">
      <h2 class="text-xs font-semibold uppercase tracking-wide text-neutral-400">Notes</h2>
      <div v-if="run.notes" class="plan-run-prose" v-html="renderedNotes" />
      <p v-else class="text-sm text-neutral-400">No notes yet.</p>
    </div>

    <!-- Owner actions -->
    <div v-if="isOwner" class="flex justify-end">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-red-500 transition-colors"
        @click="deleteOpen = true"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
        Delete
      </button>
    </div>

    <PlanRunShareSheet
      :id="run.id"
      :slug="run.slug"
      :name="run.name"
      :gauge-cfs="run.gauge_cfs"
      :run-date="run.run_date"
      :notes="run.notes"
      :paddled="run.paddled"
      :open="shareOpen"
      @close="shareOpen = false"
    />

    <!-- Invite (owner only, unlogged runs only) — run-scoped (web#354 A2). -->
    <InviteSheet
      v-if="isOwner && !run.paddled"
      :run-id="run.id"
      :open="inviteOpen"
      @update:open="inviteOpen = $event"
      @sent="onInviteSent"
    />

    <!-- Flag -->
    <UModal v-model:open="flagOpen" title="Flag this run">
      <template #body>
        <div class="space-y-3">
          <p class="text-sm text-neutral-600 dark:text-neutral-400">Why are you flagging this run?</p>
          <div class="space-y-1.5">
            <label v-for="opt in flagReasons" :key="opt.value" class="flex items-center gap-2.5 cursor-pointer">
              <input v-model="flagReason" type="radio" :value="opt.value" class="accent-primary-500" />
              <span class="text-sm text-neutral-700 dark:text-neutral-300">{{ opt.label }}</span>
            </label>
          </div>
          <textarea
            v-model="flagNote"
            rows="2"
            maxlength="300"
            placeholder="Additional context (optional)"
            class="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <p v-if="flagError" class="text-xs text-red-500">{{ flagError }}</p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="flagOpen = false">Cancel</UButton>
          <UButton color="error" :loading="flagSaving" @click="submitFlag">Submit report</UButton>
        </div>
      </template>
    </UModal>

    <!-- Delete confirm -->
    <UModal v-model:open="deleteOpen" title="Delete this run?">
      <template #body>
        <p class="text-sm text-neutral-600 dark:text-neutral-400">This can't be undone.</p>
        <p v-if="deleteError" class="text-xs text-red-500 mt-2">{{ deleteError }}</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" :disabled="deleting" @click="deleteOpen = false">Cancel</UButton>
          <UButton color="error" :loading="deleting" @click="confirmDelete">Delete</UButton>
        </div>
      </template>
    </UModal>

    <!-- Remove-from-calendar confirm (non-owner, invite-sync WEB-3 item 2) -->
    <UModal v-model:open="leaveOpen" title="Remove from your calendar?">
      <template #body>
        <p class="text-sm text-neutral-600 dark:text-neutral-400">Remove this run from your calendar? The organizer will be notified that you can't make it.</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" :disabled="leaving" @click="leaveOpen = false">Cancel</UButton>
          <UButton color="error" :loading="leaving" @click="confirmLeave">Remove</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import MarkdownIt from 'markdown-it'
import { computed, ref, watch } from 'vue'
import { fmtDate, fmtTime } from '~/utils/calendarDate'
import { colorKeyToBadgeClass, flowBandLabel } from '~/utils/flowBand'
import { usePlans } from '~/composables/usePlans'
import { usePlanRunLogSheet } from '~/composables/usePlanRunLogSheet'
import type { PlanRunDetail } from '~/utils/planRun'
import { reinviteTargetFor, type CrewListResponse, type CrewRequest } from '~/utils/plan'

const props = defineProps<{
  run: PlanRunDetail
}>()

const emit = defineEmits<{
  refresh: []
  deleted: []
  left: []
}>()

const { isAuthenticated, getToken } = useAuth()
const { resendInvite, reinviteCrew, leaveRun } = usePlans()
const planRunLogSheet = usePlanRunLogSheet()
const { apiBase } = useRuntimeConfig().public

// web#354 A2 added `is_owner` directly onto GET /plan-runs/{id}'s response
// (plans.go/plan_runs.go's planRunSummary) — the run has no `plan` wrapper
// (standalone, decoupled), but the api now tells us straight up whether the
// viewer is this run's own owner, restoring the pre-354 owner-only
// affordances below (crew roster, delete).
const isOwner = computed(() => props.run.is_owner)

// Crew "who's coming"/"who ran it" line (invite-sync API-2/WEB-3 Amendments)
// — plain "@a · @b" join, empty string (falsy) when crew_members is empty so
// the header row's v-if just checks truthiness.
const crewMembersLine = computed(() => props.run.crew_members.map(m => `@${m.handle}`).join(' · '))

const md = new MarkdownIt({ html: false, linkify: true, breaks: true })
const renderedNotes = computed(() => md.render(props.run.notes || ''))

// ── Name + Notes — display-only now (fix/run-detail-crew-edit). The 24h
// post-paddle clock was already removed (user, 2026-07-29; api PR #170) —
// name/notes stay editable indefinitely, but editing itself moved entirely
// to the unified PlanRunLogSheet (Edit button above), one surface instead of
// this card's own inline pencil/Edit affordances plus the sheet.

// ── Crew (owner only) — product feedback 2026-07-29: "I still can't see
// who was invited on the run." GET /plan-runs/{id}/crew is host-only
// (invites.go RunCrewList 403s a non-owner), so this never fetches unless
// isOwner. Mirrors InviteSheet.vue's own loadCrew — same endpoint, same
// CrewListResponse shape.
const crew = ref<CrewRequest[]>([])
const crewLoaded = ref(false)
const resendingId = ref<string | null>(null)
const reinvitingId = ref<string | null>(null)

async function loadCrew() {
  if (!isOwner.value) { crewLoaded.value = true; return }
  crewLoaded.value = false
  const token = await getToken()
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${apiBase}/api/v1/plan-runs/${props.run.id}/crew`, { headers }).catch(() => null)
  const data: CrewListResponse | null = res?.ok ? await res.json().catch(() => null) : null
  crew.value = data?.members ?? []
  crewLoaded.value = true
}

// Runs once on mount and again if the card is ever reused against a
// different run id (route param change without remount).
watch(() => props.run.id, () => { loadCrew() }, { immediate: true })

// fetch-done gated (CLAUDE.md convention): while crewLoaded is false we show
// a loading row rather than guessing empty, so a slow fetch never flashes
// the "No crew yet" nag. Once loaded: unpaddled runs always show (rows, or
// the invite nudge); a paddled run only shows the card at all if it actually
// has rows — a solo logged run needs no empty-crew nag.
const showCrewSection = computed(() => {
  if (!isOwner.value) return false
  if (!crewLoaded.value) return true
  return props.run.paddled ? crew.value.length > 0 : true
})

function crewChipLabel(m: CrewRequest): string {
  if (m.status === 'accepted') return 'Accepted'
  if (m.status === 'declined') return 'Declined'
  return m.origin === 'invite' ? 'Invited' : 'Requested'
}

// Same three-color scheme InviteSheet.vue's crewStatusClass already uses for
// this run's crew rows — reused verbatim, just split the "pending" amber
// bucket into Invited vs Requested by origin instead of one catch-all label.
function crewChipClass(m: CrewRequest): string {
  if (m.status === 'accepted') return 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
  if (m.status === 'declined') return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'
  return 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400'
}

async function onResendInvite(m: CrewRequest) {
  if (!m.invite_email || resendingId.value) return
  resendingId.value = m.member_id
  await resendInvite(props.run.id, m.invite_email) // toasts success/error itself
  resendingId.value = null
  await loadCrew()
}

// Re-invite a declined invite-origin row (WEB-4 leftover) — see
// reinviteTargetFor's doc comment (utils/plan.ts) for the handle-vs-email
// resolution; reinviteCrew (usePlans) posts it back through InviteToRun,
// which resurrects the row server-side.
async function onReinvite(m: CrewRequest) {
  const target = reinviteTargetFor(m)
  if (!target || reinvitingId.value) return
  reinvitingId.value = m.member_id
  await reinviteCrew(props.run.id, target) // toasts success/error itself
  reinvitingId.value = null
  await loadCrew()
}

function onInviteSent() {
  emit('refresh')
  loadCrew()
}

// ── Share ──────────────────────────────────────────────────────────────
const shareOpen = ref(false)

// ── Invite (owner only) — web#354 W-fix2 ─────────────────────────────────
const inviteOpen = ref(false)

// ── Flag (non-owners) ─────────────────────────────────────────────────
const flagOpen = ref(false)
const flagReason = ref('inappropriate')
const flagNote = ref('')
const flagSaving = ref(false)
const flagError = ref('')
const flagDone = ref(false)

const flagReasons = [
  { value: 'inappropriate', label: 'Inappropriate or offensive content' },
  { value: 'inaccurate', label: 'Seriously inaccurate / dangerous info' },
  { value: 'spam', label: 'Spam or self-promotion' },
  { value: 'other', label: 'Other' },
]

async function submitFlag() {
  flagSaving.value = true
  flagError.value = ''
  try {
    const token = await getToken()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch(`${apiBase}/api/v1/plan-runs/${props.run.id}/flag`, {
      method: 'POST', headers,
      body: JSON.stringify({ reason: flagReason.value, note: flagNote.value || undefined }),
    })
    if (!res.ok) { flagError.value = `Error ${res.status}`; return }
    flagDone.value = true
    flagOpen.value = false
  } catch (e: any) {
    flagError.value = e?.message ?? 'Submit failed'
  } finally {
    flagSaving.value = false
  }
}

// ── Delete (owner, tombstone) ─────────────────────────────────────────
const deleteOpen = ref(false)
const deleting = ref(false)
const deleteError = ref('')

async function confirmDelete() {
  deleting.value = true
  deleteError.value = ''
  try {
    const token = await getToken()
    const headers: Record<string, string> = {}
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch(`${apiBase}/api/v1/plan-runs/${props.run.id}`, { method: 'DELETE', headers })
    if (!res.ok && res.status !== 204) {
      const d = await res.json().catch(() => ({}))
      deleteError.value = d.error ?? `HTTP ${res.status}`
      return
    }
    deleteOpen.value = false
    emit('deleted')
  } catch (e: any) {
    deleteError.value = e?.message ?? 'Delete failed'
  } finally {
    deleting.value = false
  }
}

// ── Remove from my calendar (non-owner, invite-sync WEB-3 item 2) ───────
// "Leave" this run — attendee-facing counterpart to Delete above. Gated on a
// still-live relationship (accepted or still-invited); a declined/requested
// my_rsvp has nothing left to remove.
// accepted ONLY (review 2026-07-30): a not-yet-answered invitee already has
// Accept/Dismiss via InviteAcceptCard — a second "Remove from my calendar"
// action there was redundant and mis-worded (nothing on their calendar yet).
const canLeave = computed(() => props.run.my_rsvp === 'accepted')
const leaveOpen = ref(false)
const leaving = ref(false)

async function confirmLeave() {
  if (leaving.value) return
  leaving.value = true
  const ok = await leaveRun(props.run.id, props.run.run_date) // toasts success/error itself
  leaving.value = false
  if (!ok) return
  leaveOpen.value = false
  emit('left')
}
</script>

<style scoped>
.plan-run-prose :deep(p) { margin-bottom: 0.75em; }
.plan-run-prose :deep(a) { color: var(--ui-primary); text-decoration: underline; }
.plan-run-prose { font-size: 0.875rem; line-height: 1.6; color: inherit; }
</style>
