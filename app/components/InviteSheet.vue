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
        v-if="open"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
        @pointerdown="backdropDown" @pointerup="backdropUp($event) && close()"
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
            v-if="open"
            class="w-full sm:max-w-md max-h-[90vh] flex flex-col bg-white dark:bg-neutral-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden pb-[env(safe-area-inset-bottom)]"
          >
            <div class="flex justify-center pt-3 pb-1 sm:hidden">
              <div class="w-9 h-1 rounded-full bg-neutral-200 dark:bg-neutral-700" />
            </div>

            <div class="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between shrink-0">
              <h2 class="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Invite paddlers</h2>
              <button
                class="p-1 rounded text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                aria-label="Close"
                @click="close"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div class="flex-1 overflow-y-auto p-4 space-y-4">
              <!-- Run selector (#246 W5: invites RSVP per run now — an
                   invite fans out to one row per checked run). All checked
                   by default so the common "invite to the whole plan" case
                   is zero extra taps. -->
              <div v-if="runs.length > 1">
                <div class="flex items-center justify-between mb-1">
                  <label class="block text-xs font-medium text-neutral-600 dark:text-neutral-400">Invite to which runs?</label>
                  <button type="button" class="text-[11px] text-primary-600 dark:text-primary-400 hover:underline" @click="toggleAllRuns">
                    {{ selectedRunIds.length === runs.length ? 'Clear all' : 'Select all' }}
                  </button>
                </div>
                <div class="rounded-lg border border-neutral-100 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800 max-h-32 overflow-y-auto">
                  <label
                    v-for="r in runs"
                    :key="r.id"
                    class="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    <input type="checkbox" :value="r.id" v-model="selectedRunIds" class="rounded border-neutral-300 dark:border-neutral-600 text-primary-600 focus:ring-primary-500/40" />
                    <span class="min-w-0 flex-1 truncate text-neutral-700 dark:text-neutral-300">{{ r.name ?? 'Untitled run' }}</span>
                    <span class="shrink-0 text-xs text-neutral-400">{{ fmtDate(r.run_date) }}</span>
                  </label>
                </div>
                <p v-if="!selectedRunIds.length" class="text-xs text-red-500 mt-1">Select at least one run</p>
              </div>

              <!-- Mode toggle -->
              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  class="flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
                  :class="mode === 'handle' ? 'bg-primary-600 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'"
                  @click="mode = 'handle'"
                >By @handle</button>
                <button
                  type="button"
                  class="flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
                  :class="mode === 'email' ? 'bg-primary-600 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'"
                  @click="mode = 'email'"
                >By email</button>
              </div>

              <!-- Handle mode -->
              <InviteHandleSearch v-if="mode === 'handle'" v-model="handles" />

              <!-- Email mode -->
              <template v-else>
                <div>
                  <label class="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Email</label>
                  <input
                    v-model="email"
                    type="email"
                    placeholder="paddler@example.com"
                    class="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                  />
                </div>
                <div class="flex items-center justify-between gap-3 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 px-3.5 py-3">
                  <div>
                    <p class="text-sm font-medium text-neutral-800 dark:text-neutral-100">Attach calendar invite (.ics)</p>
                    <p class="text-[11px] text-neutral-400 mt-0.5">Adds to Apple / Google / Outlook — no account needed</p>
                  </div>
                  <USwitch v-model="attachIcs" />
                </div>
              </template>

              <!-- Per-item send summary -->
              <div v-if="results.length" class="space-y-1 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 px-3 py-2">
                <p v-for="(r, i) in results" :key="i" class="text-xs" :class="r.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'">
                  {{ r.label }} — {{ r.message }}
                </p>
              </div>
            </div>

            <div class="p-4 border-t border-neutral-100 dark:border-neutral-800 shrink-0">
              <button
                type="button"
                class="w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
                :disabled="!canSend || sending"
                @click="send"
              >{{ sendLabel }}</button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { fmtDate } from '~/utils/calendarDate'

export interface InviteSheetRun {
  id: string
  name?: string | null
  run_date: string
}

const props = defineProps<{
  planId: string
  open: boolean
  // The plan's runs, for the run-selector checkbox list (#246 W5). A
  // single-run plan skips the selector entirely (nothing to choose).
  runs: InviteSheetRun[]
}>()

const emit = defineEmits<{ 'update:open': [boolean]; sent: [] }>()

const { apiBase } = useRuntimeConfig().public
const { getToken } = useAuth()

const mode = ref<'handle' | 'email'>('handle')
const handles = ref<string[]>([])
const email = ref('')
const attachIcs = ref(true)
const sending = ref(false)
const results = ref<{ label: string; ok: boolean; message: string }[]>([])
const selectedRunIds = ref<string[]>([])

function toggleAllRuns() {
  selectedRunIds.value = selectedRunIds.value.length === props.runs.length ? [] : props.runs.map(r => r.id)
}

watch(() => props.open, (o) => {
  if (!o) return
  mode.value = 'handle'
  handles.value = []
  email.value = ''
  attachIcs.value = true
  results.value = []
  selectedRunIds.value = props.runs.map(r => r.id) // all checked by default
})

const canSend = computed(() => {
  if (props.runs.length > 1 && !selectedRunIds.value.length) return false
  if (mode.value === 'handle') return handles.value.length > 0
  return /\S+@\S+\.\S+/.test(email.value.trim())
})

const sendLabel = computed(() => {
  if (sending.value) return 'Sending…'
  if (mode.value === 'email') return 'Send email invite'
  return handles.value.length ? `Add ${handles.value.length} paddler${handles.value.length > 1 ? 's' : ''}` : 'Done'
})

function close() {
  emit('update:open', false)
}

async function sendOne(body: Record<string, unknown>): Promise<{ ok: boolean; message: string }> {
  const token = await getToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${apiBase}/api/v1/plans/${props.planId}/invite`, {
    method: 'POST', headers, body: JSON.stringify(body),
  }).catch(() => null)
  if (!res?.ok) {
    const msg = await res?.json().catch(() => null)
    return { ok: false, message: msg?.error ?? `Failed (${res?.status ?? 'network'})` }
  }
  const data = await res.json().catch(() => null)
  if (data?.status === 'existing') return { ok: true, message: 'already invited' }
  return { ok: true, message: data?.sent ? 'invited — email sent' : 'invited' }
}

async function send() {
  if (!canSend.value || sending.value) return
  sending.value = true
  results.value = []

  // Omit plan_run_ids entirely when every run is selected (or there's only
  // one run) — the contract's default ("all runs") already covers it, and
  // sending the full list either way is equally correct, just noisier.
  const planRunIds = selectedRunIds.value.length && selectedRunIds.value.length < props.runs.length
    ? selectedRunIds.value
    : undefined

  if (mode.value === 'handle') {
    for (const h of handles.value) {
      const r = await sendOne({ handle: h, plan_run_ids: planRunIds })
      results.value = [...results.value, { label: `@${h}`, ...r }]
    }
  } else {
    const r = await sendOne({ email: email.value.trim().toLowerCase(), attach_ics: attachIcs.value, plan_run_ids: planRunIds })
    results.value = [...results.value, { label: email.value.trim(), ...r }]
  }

  sending.value = false
  emit('sent')

  // Give the per-item results a beat on screen before auto-closing when
  // everything sent cleanly; leave the sheet open on any failure so the
  // host can see which invite(s) need retrying.
  if (results.value.every(r => r.ok)) {
    setTimeout(() => { if (props.open) close() }, 900)
  }
}
</script>
