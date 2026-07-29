<template>
  <div class="space-y-6">
    <!-- Header card -->
    <div class="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 px-5 py-4 space-y-3">
      <div class="flex items-start justify-between gap-3 flex-wrap">
        <div class="min-w-0">
          <!-- Name (web#354 A4/W6) — the calendar run's OWN name, editable
               inline by the owner under the same 24h post-paddle lock window
               as Notes below (nameEditable is a plain alias of
               notesEditable — the api groups name with notes as
               user-descriptive text, not trip logistics, updatePlanRunBody
               doc comment). Unpaddled runs stay freely editable here too
               (notesEditable is true whenever !run.paddled), same as Notes
               already was pre-W6. -->
          <div v-if="editingName" class="flex items-center gap-2">
            <input
              v-model="nameDraft"
              type="text"
              class="min-w-0 flex-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2.5 py-1 text-lg font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              @keyup.enter="saveName"
              @keyup.escape="editingName = false"
            />
            <button type="button" class="shrink-0 text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:underline" :disabled="savingName" @click="editingName = false">Cancel</button>
            <button type="button" class="shrink-0 text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-50" :disabled="savingName || !nameDraft.trim()" @click="saveName">{{ savingName ? 'Saving…' : 'Save' }}</button>
          </div>
          <div v-else class="flex items-center gap-1.5">
            <h1 class="text-lg font-bold text-neutral-900 dark:text-white truncate">{{ run.name }}</h1>
            <button
              v-if="isOwner && nameEditable"
              type="button"
              class="shrink-0 p-1 rounded text-neutral-300 dark:text-neutral-600 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              title="Edit name"
              @click="startEditName"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
            </button>
          </div>
          <!-- Attached library run's own name (web#354 A4/W6) — secondary
               only, and only when it differs from the calendar run's own
               name (avoid "Foxton — Foxton" dupes). -->
          <p v-if="run.reach_name && run.reach_name !== run.name" class="text-xs text-neutral-400 mt-0.5 truncate">{{ run.reach_name }}</p>
        </div>
        <div class="flex items-center gap-3 shrink-0">
          <!-- Invite (owner only) — web#354 W-fix2: entry point moved here
               from the event page's PlanItinerary rows (invites are
               run-scoped, run_invites keyed to run_id only; having the
               button live on the event page made invites read as
               event-scoped). Same InviteSheet the removed itinerary button
               opened. -->
          <button
            v-if="isOwner"
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

      <div v-if="run.meetup_spot" class="flex items-center gap-2 pt-1">
        <svg class="w-4 h-4 text-neutral-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-6.5-7-11a7 7 0 1 1 14 0c0 4.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
        <div class="min-w-0">
          <p class="text-[11px] font-medium text-neutral-400 uppercase tracking-wide">Meet up at</p>
          <p class="text-sm text-neutral-700 dark:text-neutral-200 truncate">{{ run.meetup_spot }}</p>
        </div>
      </div>
    </div>

    <!-- Notes -->
    <div class="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 px-5 py-4 space-y-3">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-xs font-semibold uppercase tracking-wide text-neutral-400">Notes</h2>
        <button
          v-if="isOwner && !editingNotes && notesEditable"
          type="button"
          class="text-xs text-primary-600 dark:text-primary-400 hover:underline"
          @click="startEditNotes"
        >Edit</button>
        <span v-else-if="isOwner && notesLocked" class="inline-flex items-center gap-1 text-xs text-neutral-400">
          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Locked
        </span>
      </div>

      <template v-if="editingNotes">
        <textarea
          v-model="notesDraft"
          rows="5"
          placeholder="How was it? Conditions, hazards, lines…"
          class="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/40"
        />
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" size="sm" :disabled="savingNotes" @click="editingNotes = false">Cancel</UButton>
          <UButton color="primary" size="sm" :loading="savingNotes" @click="saveNotes">Save</UButton>
        </div>
      </template>
      <div v-else-if="run.notes" class="plan-run-prose" v-html="renderedNotes" />
      <p v-else class="text-sm text-neutral-400">No notes yet.</p>

      <p v-if="isOwner && run.paddled && notesLocked" class="text-xs text-neutral-400">
        Notes lock 24 hours after a run is marked paddled.
      </p>
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

    <!-- Invite (owner only) — run-scoped, unchanged (web#354 A2). -->
    <InviteSheet
      v-if="isOwner"
      :run-id="run.id"
      :open="inviteOpen"
      @update:open="inviteOpen = $event"
      @sent="emit('refresh')"
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
  </div>
</template>

<script setup lang="ts">
import MarkdownIt from 'markdown-it'
import { computed, ref } from 'vue'
import { fmtDate, fmtTime } from '~/utils/calendarDate'
import { colorKeyToBadgeClass, flowBandLabel } from '~/utils/flowBand'
import { usePlans } from '~/composables/usePlans'
import type { PlanRunDetail } from '~/utils/planRun'

const props = defineProps<{
  run: PlanRunDetail
}>()

const emit = defineEmits<{
  refresh: []
  deleted: []
}>()

const { isAuthenticated, getToken } = useAuth()
const { patchRun } = usePlans()
const { apiBase } = useRuntimeConfig().public

// web#354 A2 added `is_owner` directly onto GET /plan-runs/{id}'s response
// (plans.go/plan_runs.go's planRunSummary) — the run has no `plan` wrapper
// (standalone, decoupled), but the api now tells us straight up whether the
// viewer is this run's own owner, restoring the pre-354 owner-only
// affordances below (edit notes, delete).
const isOwner = computed(() => props.run.is_owner)

const md = new MarkdownIt({ html: false, linkify: true, breaks: true })
const renderedNotes = computed(() => md.render(props.run.notes || ''))

// ── Notes edit (24h post-paddle lock, mirrors old my/reports lock UX) ────
const editingNotes = ref(false)
const notesDraft = ref('')
const savingNotes = ref(false)

const notesLocked = computed(() => {
  if (!props.run.paddled) return false
  if (!props.run.paddled_at) return true
  return Date.now() - new Date(props.run.paddled_at).getTime() > 24 * 60 * 60 * 1000
})
const notesEditable = computed(() => !notesLocked.value)

function startEditNotes() {
  notesDraft.value = props.run.notes ?? ''
  editingNotes.value = true
}

async function saveNotes() {
  savingNotes.value = true
  const ok = await patchRun(props.run.id, { notes: notesDraft.value })
  savingNotes.value = false
  if (!ok) return
  editingNotes.value = false
  emit('refresh')
}

// ── Name edit (web#354 A4/W6) — SAME 24h post-paddle lock window as Notes
// above (the api groups name with notes as the one pair still writable once
// locked, updatePlanRunBody doc comment), so this reuses notesEditable
// directly rather than re-deriving an identical rule under a second name.
// Unpaddled runs stay freely editable (notesEditable is true whenever
// !run.paddled) — same behavior Notes already had.
const nameEditable = notesEditable
const editingName = ref(false)
const nameDraft = ref('')
const savingName = ref(false)

function startEditName() {
  nameDraft.value = props.run.name
  editingName.value = true
}

async function saveName() {
  const trimmed = nameDraft.value.trim()
  if (!trimmed) return // match the create/edit sheet's disabled-save pattern — block an empty name client-side too
  savingName.value = true
  const ok = await patchRun(props.run.id, { name: trimmed })
  savingName.value = false
  if (!ok) return
  editingName.value = false
  emit('refresh')
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
</script>

<style scoped>
.plan-run-prose :deep(p) { margin-bottom: 0.75em; }
.plan-run-prose :deep(a) { color: var(--ui-primary); text-decoration: underline; }
.plan-run-prose { font-size: 0.875rem; line-height: 1.6; color: inherit; }
</style>
