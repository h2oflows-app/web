<template>
  <div class="space-y-6">
    <!-- Header card -->
    <div class="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 px-5 py-4 space-y-3">
      <div class="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 class="text-lg font-bold text-neutral-900 dark:text-white">{{ run.name ?? 'Untitled run' }}</h1>
          <p class="text-xs text-neutral-400 mt-0.5">
            Part of <strong class="text-neutral-500 dark:text-neutral-400">{{ plan.name }}</strong>
            <!-- TODO(W4): link to /plans/{handle}/{slug} once the plan detail page ships -->
          </p>
        </div>
        <div class="flex items-center gap-3 shrink-0">
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
        <PlanVisibilityBadge :visibility="plan.visibility" />
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
      :name="run.name ?? 'Untitled run'"
      :gauge-cfs="run.gauge_cfs"
      :run-date="run.run_date"
      :notes="run.notes"
      :paddled="run.paddled"
      :open="shareOpen"
      @close="shareOpen = false"
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
        <p class="text-sm text-neutral-600 dark:text-neutral-400">This removes it from your plan. This can't be undone.</p>
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
import { useMyProfile } from '~/composables/useMyProfile'
import { usePlans } from '~/composables/usePlans'
import type { PlanRunDetail, PlanRunDetailPlan } from '~/utils/planRun'

const props = defineProps<{
  run: PlanRunDetail
  plan: PlanRunDetailPlan
}>()

const emit = defineEmits<{
  refresh: []
  deleted: []
}>()

const { isAuthenticated, getToken } = useAuth()
const { isMine, load: loadMyProfile } = useMyProfile()
const { patchRun } = usePlans()
const { apiBase } = useRuntimeConfig().public

loadMyProfile()
const isOwner = computed(() => isMine(props.plan.host_handle))

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

// ── Share ──────────────────────────────────────────────────────────────
const shareOpen = ref(false)

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
