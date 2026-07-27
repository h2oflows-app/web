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
              <!-- Existing crew on this run — read-only reference so the host
                   doesn't blindly re-invite someone already aboard. Managing
                   pending JOIN requests (accept/decline) stays in the
                   "Manage" crew panel (PlanCrewPanel) — not duplicated here. -->
              <div v-if="crewLoaded && crew.length">
                <label class="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Already on this run</label>
                <div class="rounded-lg border border-neutral-100 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800 max-h-28 overflow-y-auto">
                  <div v-for="m in crew" :key="m.member_id" class="flex items-center justify-between gap-2 px-3 py-1.5 text-sm">
                    <span class="min-w-0 flex-1 truncate text-neutral-700 dark:text-neutral-300">@{{ m.handle || 'paddler' }}</span>
                    <span class="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full" :class="crewStatusClass(m.status)">{{ crewStatusLabel(m.status) }}</span>
                  </div>
                </div>
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
                <div>
                  <label class="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Message <span class="text-neutral-400 font-normal">(optional)</span></label>
                  <textarea
                    v-model="message"
                    rows="2"
                    placeholder="Add a note…"
                    class="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/40"
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
              <div v-if="results.length" class="space-y-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 px-3 py-2">
                <div v-for="r in results" :key="r.key" class="flex items-center justify-between gap-2 text-xs" :class="resultClass(r.kind)">
                  <span class="min-w-0 truncate">{{ r.label }} — {{ r.message }}</span>
                  <button
                    v-if="r.resendEmail && !r.resent"
                    type="button"
                    class="shrink-0 font-medium text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-50"
                    :disabled="r.resending"
                    @click="resend(r)"
                  >{{ r.resending ? 'Resending…' : 'Resend' }}</button>
                </div>
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
import type { CrewListResponse, CrewRequest } from '~/utils/plan'

// InviteSheet — run-scoped (web#354 W2; was plan-scoped with a run-selector
// checkbox list, #246 W5/A1). Invites live on run_invites keyed by run_id
// only now (no plan fan-out, web#354 A2) — one sheet instance targets
// exactly the run its "Invite" button was opened from (PlanItinerary owns
// the runId state, mirrors its existing PlanCrewPanel pattern).
const props = defineProps<{
  runId: string
  open: boolean
}>()

const emit = defineEmits<{ 'update:open': [boolean]; sent: [] }>()

const { apiBase } = useRuntimeConfig().public
const { getToken } = useAuth()

const mode = ref<'handle' | 'email'>('handle')
const handles = ref<string[]>([])
const email = ref('')
const message = ref('')
const attachIcs = ref(true)
const sending = ref(false)

interface ResultItem {
  key: string
  label: string
  kind: 'success' | 'existing' | 'duplicate' | 'error'
  message: string
  // Set only for a 409 hit on an EMAIL send — a handle invite has no token
  // to resend (accept is by account match, nothing to re-deliver; see
  // invites.go ResendInvite's own doc comment on why it's email-only).
  resendEmail?: string
  resending?: boolean
  resent?: boolean
}
const results = ref<ResultItem[]>([])

watch(() => props.open, (o) => {
  if (!o) return
  mode.value = 'handle'
  handles.value = []
  email.value = ''
  message.value = ''
  attachIcs.value = true
  results.value = []
  loadCrew()
})

const canSend = computed(() => {
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

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

function resultClass(kind: ResultItem['kind']): string {
  if (kind === 'success') return 'text-emerald-600 dark:text-emerald-400'
  if (kind === 'error') return 'text-red-500'
  // 'existing' (self-invite no-op, handle mode only) and 'duplicate' (409
  // already-invited) are both non-error, informational outcomes — neutral
  // tone, never red (contract: 409 is "a friendly inline note, not an error
  // toast").
  return 'text-neutral-500 dark:text-neutral-400'
}

function resultKey(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
}

async function sendOne(body: Record<string, unknown>): Promise<{ status: number; body: any }> {
  const headers = await authHeaders()
  const res = await fetch(`${apiBase}/api/v1/plan-runs/${props.runId}/invite`, {
    method: 'POST', headers, body: JSON.stringify(body),
  }).catch(() => null)
  const json = await res?.json().catch(() => null)
  return { status: res?.status ?? 0, body: json }
}

function classifyHandleResult(handle: string, status: number, body: any): ResultItem {
  const label = `@${handle}`
  if (status === 201) return { key: resultKey(), label, kind: 'success', message: 'invited' }
  if (status === 200) return { key: resultKey(), label, kind: 'existing', message: "that's you — already in this run" }
  if (status === 409) return { key: resultKey(), label, kind: 'duplicate', message: 'already invited to this run' }
  return { key: resultKey(), label, kind: 'error', message: body?.error ?? `Failed (${status || 'network'})` }
}

function classifyEmailResult(emailAddr: string, status: number, body: any): ResultItem {
  if (status === 201) return { key: resultKey(), label: emailAddr, kind: 'success', message: body?.sent ? 'invited — email sent' : 'invited' }
  if (status === 409) return { key: resultKey(), label: emailAddr, kind: 'duplicate', message: 'already invited to this run', resendEmail: emailAddr }
  return { key: resultKey(), label: emailAddr, kind: 'error', message: body?.error ?? `Failed (${status || 'network'})` }
}

async function send() {
  if (!canSend.value || sending.value) return
  sending.value = true

  if (mode.value === 'handle') {
    for (const h of handles.value) {
      const { status, body } = await sendOne({ handle: h })
      results.value = [...results.value, classifyHandleResult(h, status, body)]
    }
  } else {
    const trimmedEmail = email.value.trim().toLowerCase()
    const { status, body } = await sendOne({
      email: trimmedEmail,
      attach_ics: attachIcs.value,
      message: message.value.trim() || undefined,
    })
    results.value = [...results.value, classifyEmailResult(trimmedEmail, status, body)]
  }

  sending.value = false
  emit('sent')

  // Give the per-item results a beat on screen before auto-closing — only
  // when every result was a clean 201, never on a 409/self-invite/error, so
  // a duplicate's inline Resend action doesn't vanish before the host can
  // use it.
  if (results.value.every(r => r.kind === 'success')) {
    setTimeout(() => { if (props.open) close() }, 900)
  }
}

async function resend(item: ResultItem) {
  if (!item.resendEmail || item.resending) return
  item.resending = true
  const headers = await authHeaders()
  const res = await fetch(`${apiBase}/api/v1/plan-runs/${props.runId}/invite/resend`, {
    method: 'POST', headers, body: JSON.stringify({ email: item.resendEmail }),
  }).catch(() => null)
  item.resending = false
  if (!res?.ok) {
    const msg = await res?.json().catch(() => null)
    item.message = msg?.error ?? 'could not resend'
    return
  }
  item.resent = true
  item.message = 'already invited to this run — resent'
}

// ── Existing crew (read-only reference) ───────────────────────────────────
// GET /plan-runs/{id}/crew (RunCrewList): accepted members of any origin +
// pending JOIN requests — NOT a live feed of not-yet-responded invites (an
// invited-but-unaccepted row has no home here; the 409 branch above, on a
// repeat invite attempt, is how the host discovers a still-pending one).
// Shown for context so the host doesn't blindly re-invite someone already
// aboard.
const crew = ref<CrewRequest[]>([])
const crewLoaded = ref(false)

async function loadCrew() {
  crewLoaded.value = false
  const headers = await authHeaders()
  const res = await fetch(`${apiBase}/api/v1/plan-runs/${props.runId}/crew`, { headers }).catch(() => null)
  const data: CrewListResponse | null = res?.ok ? await res.json().catch(() => null) : null
  crew.value = data?.members ?? []
  crewLoaded.value = true
}

function crewStatusLabel(status: string): string {
  if (status === 'accepted') return 'Accepted'
  if (status === 'declined') return 'Declined'
  return 'Requested'
}

function crewStatusClass(status: string): string {
  if (status === 'accepted') return 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
  if (status === 'declined') return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'
  return 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400'
}
</script>
