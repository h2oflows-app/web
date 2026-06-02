<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950">

    <AppHeader>
      <template v-if="run">
        <span class="text-neutral-300 dark:text-neutral-700 shrink-0">/</span>
        <span class="text-sm font-medium truncate text-neutral-700 dark:text-neutral-200">{{ run.name }}</span>
      </template>
    </AppHeader>

    <div v-if="pending" class="max-w-3xl mx-auto px-3 py-12 text-center text-neutral-400">
      Loading…
    </div>

    <div v-else-if="!run" class="max-w-3xl mx-auto px-3 py-12 text-center text-neutral-400">
      Run not found or is private.
    </div>

    <main v-else class="max-w-3xl mx-auto px-3 py-6 pb-32 sm:pb-10 space-y-6">

      <!-- Hero -->
      <section>
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div v-if="run.river_name" class="text-xs font-medium text-primary-500 uppercase tracking-wide mb-1">{{ run.river_name }}</div>
            <h1 class="text-2xl font-bold leading-tight text-neutral-900 dark:text-white">{{ run.name }}</h1>
            <div v-if="run.river_state_abbr || run.river_basin" class="text-sm text-neutral-500 mt-0.5">
              {{ [run.river_state_abbr, run.river_basin].filter(Boolean).join(' · ') }}
            </div>
          </div>

          <!-- Icon toolbar -->
          <div class="shrink-0 flex items-center gap-1 mt-0.5">
            <!-- Upvote (hidden on own run) -->
            <button
              v-if="!isOwnRun"
              class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors"
              :class="userUpvoted
                ? 'bg-primary-50 dark:bg-primary-950 border-primary-300 dark:border-primary-700 text-primary-600 dark:text-primary-400'
                : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-primary-300 hover:text-primary-600'"
              :disabled="upvoteLoading || !isAuthenticated"
              :title="isAuthenticated ? 'Upvote this run' : 'Sign in to upvote'"
              @click="toggleUpvote"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/>
                <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/>
              </svg>
              {{ upvoteCount }}
            </button>

            <!-- Dashboard picker (auth only) -->
            <RunDashboardMembershipPicker v-if="isAuthenticated && run" :slug="run.slug" :reach-id="run.id" />

            <!-- Fork (auth only) -->
            <button
              v-if="isAuthenticated"
              :disabled="forking"
              class="flex items-center justify-center p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors disabled:opacity-40"
              title="Fork this run — create your own copy"
              @click="forkRun"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/>
                <path d="M12 7v3m0 0c0 2-2 3-4 3H7m5 0c0 2 2 3 4 3h1"/>
              </svg>
            </button>

            <!-- Flag (auth only) -->
            <button
              v-if="isAuthenticated && !flagDone"
              class="flex items-center justify-center p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:text-red-500 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
              title="Flag as inappropriate"
              @click="flagOpen = true"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
              </svg>
            </button>
            <span v-else-if="flagDone" class="text-xs text-red-400 px-1">Flagged</span>
          </div>
        </div>

        <!-- Author badge -->
        <div class="mt-2">
          <RunAuthorBadge :is-official="run.is_official" :author-handle="run.author_handle" />
        </div>
      </section>

      <!-- Quick stats -->
      <section>
        <div class="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 px-4 py-3">
          <div class="grid grid-cols-3 gap-3" :class="run.current_cfs != null ? 'sm:grid-cols-4' : ''">
            <div>
              <div class="text-[10px] text-neutral-400 uppercase tracking-wide mb-1">Difficulty</div>
              <div class="text-lg font-bold text-neutral-800 dark:text-neutral-100">
                {{ classLabel || '—' }}
              </div>
            </div>
            <div>
              <div class="text-[10px] text-neutral-400 uppercase tracking-wide mb-1">Length</div>
              <div class="text-lg font-bold text-neutral-800 dark:text-neutral-100">
                {{ run.length_mi != null ? `${run.length_mi} mi` : '—' }}
              </div>
            </div>
            <div>
              <div class="text-[10px] text-neutral-400 uppercase tracking-wide mb-1">Gradient</div>
              <div class="text-lg font-bold text-neutral-800 dark:text-neutral-100">
                {{ run.gradient_fpm != null ? `${run.gradient_fpm} ft/mi` : '—' }}
              </div>
            </div>
            <!-- Flow -->
            <div v-if="run.current_cfs != null || run.gauge_name" class="col-span-3 sm:col-span-1 border-t sm:border-t-0 sm:border-l border-neutral-200 dark:border-neutral-700 pt-2 sm:pt-0 sm:pl-4">
              <div class="text-[10px] text-neutral-400 uppercase tracking-wide mb-1">Flow</div>
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-lg font-bold tabular-nums" :class="run.flow_band ? flowBandTextClass(run.flow_band) : 'text-neutral-800 dark:text-neutral-100'">
                  {{ run.current_cfs != null ? run.current_cfs.toLocaleString() : '—' }}
                </span>
                <span class="text-xs text-neutral-500">cfs</span>
                <span v-if="run.flow_band" :class="['inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium', bandBadgeClass(run.flow_band)]">
                  {{ flowBandLabel(run.flow_band) }}
                </span>
              </div>
              <p v-if="run.gauge_name" class="text-xs text-neutral-400 mt-0.5 truncate">{{ run.gauge_name }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Note / description -->
      <section v-if="run.note">
        <div class="prose prose-sm dark:prose-invert max-w-none text-neutral-700 dark:text-neutral-300 whitespace-pre-line leading-relaxed">
          {{ run.note }}
        </div>
      </section>

      <!-- Map -->
      <section>
        <ClientOnly>
          <RunMap
            :name="run.name"
            :class-max="run.class_max"
            :centerline="run.centerline"
            :rapids="mapRapids"
            :access="mapAccess"
            :put-in-lat="run.put_in_lat"
            :put-in-lng="run.put_in_lng"
            :take-out-lat="run.take_out_lat"
            :take-out-lng="run.take_out_lng"
          />
        </ClientOnly>
      </section>

      <!-- Reports -->
      <section>
        <div class="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
          <div class="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 class="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Trip Reports</h2>
            <NuxtLink
              v-if="isAuthenticated"
              :to="`/my/runs/${run.slug}`"
              class="text-xs text-primary-500 hover:text-primary-600 dark:text-primary-400 font-medium transition-colors"
            >
              + Add report
            </NuxtLink>
            <span v-else class="text-xs text-neutral-400">
              <NuxtLink to="/login" class="text-primary-500 hover:underline">Sign in</NuxtLink> to add a report
            </span>
          </div>

          <div v-if="!reportsFetchDone" class="px-4 pb-4 text-xs text-neutral-400">Loading reports…</div>
          <div v-else-if="reports.length === 0" class="px-4 pb-4 text-sm text-neutral-400">No reports yet.</div>
          <div v-else class="divide-y divide-neutral-100 dark:divide-neutral-800">
            <div
              v-for="rep in visibleReports"
              :key="rep.id"
              class="px-4 py-3"
            >
              <div class="flex items-start justify-between gap-2 mb-1">
                <div class="min-w-0">
                  <span class="text-sm font-medium text-neutral-800 dark:text-neutral-200">{{ rep.name }}</span>
                  <span v-if="rep.handle" class="ml-1.5 text-xs text-neutral-400">@{{ rep.handle }}</span>
                </div>
                <div class="shrink-0 text-right">
                  <div class="text-xs text-neutral-400">{{ rep.report_date }}</div>
                  <div v-if="rep.flow_cfs" class="text-xs font-mono text-neutral-500">{{ rep.flow_cfs.toLocaleString() }} cfs</div>
                </div>
              </div>
              <p class="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-3">{{ extractPreview(rep.content) }}</p>
              <NuxtLink :to="`/reports/${rep.id}`" class="text-xs text-primary-500 hover:underline mt-1 inline-block">Read more →</NuxtLink>
            </div>
          </div>

          <div v-if="reports.length > reportsPageSize" class="px-4 py-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-3">
            <button
              v-if="!reportsExpanded"
              class="text-xs text-primary-500 hover:text-primary-600 font-medium transition-colors"
              @click="reportsExpanded = true"
            >
              Show all {{ reports.length }} reports
            </button>
            <button
              v-else
              class="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
              @click="reportsExpanded = false"
            >
              Show less
            </button>
            <button
              v-if="reportsNextCursor"
              :disabled="reportsLoadingMore"
              class="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors disabled:opacity-40"
              @click="loadMoreReports"
            >
              Load more…
            </button>
          </div>
        </div>
      </section>

      <!-- Similar Runs -->
      <section v-if="clusterRuns.length > 0">
        <div class="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 px-4 py-4 space-y-2">
          <p class="text-xs text-neutral-400 uppercase tracking-wide font-medium">Similar Runs <span class="font-normal normal-case">(same section)</span></p>
          <div v-for="cr in clusterRuns" :key="cr.id" class="flex items-center gap-2 py-0.5 text-xs">
            <svg v-if="cr.is_official" class="w-3 h-3 text-primary-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span v-else class="w-2 h-2 rounded-full bg-neutral-300 dark:bg-neutral-600 shrink-0" />
            <NuxtLink
              :to="cr.author_handle ? `/runs/${cr.author_handle}/${cr.slug}` : `/runs/h2oflows/${cr.slug}`"
              class="font-medium text-neutral-700 dark:text-neutral-300 hover:text-primary-600 dark:hover:text-primary-400 hover:underline truncate flex-1"
            >{{ cr.name }}</NuxtLink>
            <span class="text-neutral-400 shrink-0">{{ cr.report_count }} report{{ cr.report_count !== 1 ? 's' : '' }}</span>
            <span v-if="cr.author_handle" class="text-neutral-400 shrink-0">@{{ cr.author_handle }}</span>
            <span v-else-if="cr.is_official" class="text-primary-500 shrink-0">Official</span>
          </div>
        </div>
      </section>

      <!-- Community Flow Proposals (read-only) -->
      <section v-if="proposals.length > 0">
        <div class="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 px-4 py-4 space-y-3">
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs text-neutral-400 uppercase tracking-wide font-medium">Community Flow Proposals</p>
            <span v-if="proposalMedianMin != null" class="text-xs text-neutral-400">
              median {{ proposalMedianMin }}–{{ proposalMedianMax }} cfs
            </span>
          </div>
          <div v-for="p in proposals" :key="p.id" class="flex items-start gap-2 py-1 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  {{ p.running_min }}–{{ p.running_max }} cfs
                </span>
                <span v-if="p.low_max" class="text-xs text-neutral-400">low &lt;{{ p.low_max }}</span>
                <span v-if="p.high_min" class="text-xs text-neutral-400">high &gt;{{ p.high_min }}</span>
              </div>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span class="text-xs text-neutral-400">@{{ p.author_handle ?? p.author_id.slice(0, 8) }}</span>
                <span v-if="p.note" class="text-xs text-neutral-400 truncate">· {{ p.note }}</span>
              </div>
            </div>
            <span class="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-500 shrink-0">
              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/>
                <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/>
              </svg>
              {{ p.vote_count }}
            </span>
          </div>
          <p v-if="isAuthenticated" class="text-xs text-neutral-400">
            <NuxtLink :to="`/my/runs/${run.slug}`" class="text-primary-500 hover:underline">Go to your run</NuxtLink> to submit or vote on proposals.
          </p>
          <p v-else class="text-xs text-neutral-400">
            <NuxtLink to="/login" class="text-primary-500 hover:underline">Sign in</NuxtLink> to vote or submit a proposal.
          </p>
        </div>
      </section>

    </main>

    <!-- Flag modal -->
    <UModal v-model:open="flagOpen" title="Flag this run">
      <template #body>
        <div class="space-y-3">
          <p class="text-sm text-neutral-600 dark:text-neutral-400">Why are you flagging this run?</p>
          <div class="space-y-1.5">
            <label v-for="opt in flagReasons" :key="opt.value" class="flex items-center gap-2.5 cursor-pointer">
              <input type="radio" v-model="flagReason" :value="opt.value" class="accent-primary-500" />
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

    <!-- First-run CTA sticky banner (anon only) -->
    <ClientOnly>
      <Transition
        enter-active-class="transition-transform duration-300 ease-out"
        enter-from-class="translate-y-full"
        enter-to-class="translate-y-0"
        leave-active-class="transition-transform duration-200 ease-in"
        leave-from-class="translate-y-0"
        leave-to-class="translate-y-full"
      >
        <div
          v-if="!isAuthenticated && !ctaDismissed && run"
          class="fixed bottom-0 inset-x-0 z-40 pb-safe"
        >
          <div class="bg-primary-600 dark:bg-primary-700 text-white px-4 py-3 sm:py-4 flex items-center gap-3 sm:gap-4 shadow-lg">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold leading-snug">Track your runs on H2OFlows</p>
              <p class="text-xs text-primary-100 mt-0.5 leading-snug hidden sm:block">
                Log flows, add reports, and get live gauge alerts for your favorite sections.
              </p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <NuxtLink
                to="/login"
                class="px-3 py-1.5 rounded-lg bg-white text-primary-700 hover:bg-primary-50 text-xs font-semibold transition-colors"
              >
                Get started
              </NuxtLink>
              <button
                class="p-1 text-primary-200 hover:text-white transition-colors"
                title="Dismiss"
                @click="ctaDismissed = true"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </ClientOnly>

  </div>
</template>

<script setup lang="ts">
import { classRange } from '~/utils/classRating'
import { flowBandLabel as flowBandLabelFn } from '~/utils/flowBand'

const route  = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const { isAuthenticated, getToken } = useAuth()
const { apiBase } = config.public
const { bandBadgeClass } = useFlowBandPalette()

const runId = computed(() => route.params.id as string)

// ── Interfaces ────────────────────────────────────────────────────────────────

interface FlowRange {
  label: string; min_value: number | null; max_value: number | null
}

interface RunRapid {
  id: string; name: string; description: string | null
  class_rating: number | null; is_surf_wave: boolean; is_permanent_hazard: boolean
  hazard_type: string | null; lng: number | null; lat: number | null
}

interface RunAccessPoint {
  id: string; access_type: string; name: string | null
  notes: string | null; lng: number | null; lat: number | null
}

interface PublicRunDetail {
  id:               string
  slug:             string
  name:             string
  river_name:       string | null
  river_slug:       string | null
  river_state_abbr: string | null
  river_basin:      string | null
  class_min:        number | null
  class_max:        number | null
  length_mi:        number | null
  gradient_fpm:     number | null
  put_in_lng:       number
  put_in_lat:       number
  take_out_lng:     number
  take_out_lat:     number
  gauge_id:         string | null
  gauge_name:       string | null
  current_cfs:      number | null
  flow_band:        string | null
  note:             string | null
  is_official:      boolean
  author_handle:    string | null
  forked_from_slug: string | null
  forked_from_name: string | null
  flow_ranges:      FlowRange[]
  rapids:           RunRapid[]
  access_points:    RunAccessPoint[]
  upvote_count:     number
  user_upvoted:     boolean
  centerline:       object | null
  is_own?:          boolean
}

interface FlowRangeProposal {
  id: string; author_id: string; author_handle: string | null
  low_max: number | null; running_min: number; running_max: number
  high_min: number | null; note: string | null; vote_count: number; user_voted: boolean
}

interface RunReport {
  id: string; slug: string; name: string; report_date: string
  report_time?: string; content: string; paddled: boolean
  flow_cfs?: number; flow_band?: string; created_at: string; handle?: string; url?: string
}

interface ClusterRun {
  id: string; slug: string; name: string
  author_handle: string | null; is_official: boolean
  class_min: number | null; class_max: number | null
  report_count: number; rank_score: number
}

// ── Auth helper ───────────────────────────────────────────────────────────────

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ── Main data fetch ───────────────────────────────────────────────────────────

const run = ref<PublicRunDetail | null>(null)
const pending = ref(true)

async function loadRun() {
  pending.value = true
  try {
    const headers = await authHeaders()
    const res = await fetch(`${apiBase}/api/v1/user-runs/${runId.value}`, { headers })
    if (!res.ok) { run.value = null; return }
    run.value = await res.json()
  } catch {
    run.value = null
  } finally {
    pending.value = false
  }
}

// ── Reports ───────────────────────────────────────────────────────────────────

const reports = ref<RunReport[]>([])
const reportsNextCursor = ref<string | null>(null)
const reportsFetchDone = ref(false)
const reportsLoadingMore = ref(false)
const reportsPageSize = 5
const reportsExpanded = ref(false)

const visibleReports = computed(() =>
  reportsExpanded.value ? reports.value : reports.value.slice(0, reportsPageSize)
)

function extractPreview(content: string): string {
  const firstPara = content.split(/\n\n+/)[0].trim()
  return firstPara
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
}

async function loadReports(cursor?: string) {
  const url = cursor
    ? `${apiBase}/api/v1/user-runs/${runId.value}/reports?cursor=${cursor}`
    : `${apiBase}/api/v1/user-runs/${runId.value}/reports`
  const res = await fetch(url).catch(() => null)
  if (!res?.ok) { reportsFetchDone.value = true; return }
  const data = await res.json()
  if (cursor) {
    reports.value.push(...(data.reports ?? []))
  } else {
    reports.value = data.reports ?? []
  }
  reportsNextCursor.value = data.next_cursor ?? null
  reportsFetchDone.value = true
}

async function loadMoreReports() {
  if (!reportsNextCursor.value || reportsLoadingMore.value) return
  reportsLoadingMore.value = true
  await loadReports(reportsNextCursor.value)
  reportsLoadingMore.value = false
}

// ── Flow proposals (read-only) ────────────────────────────────────────────────

const proposals = ref<FlowRangeProposal[]>([])
const proposalMedianMin = ref<number | null>(null)
const proposalMedianMax = ref<number | null>(null)

async function loadProposals() {
  const res = await fetch(`${apiBase}/api/v1/user-runs/${runId.value}/flow-proposals`).catch(() => null)
  if (!res?.ok) return
  const data = await res.json()
  proposals.value = data.proposals ?? []
  proposalMedianMin.value = data.median_running_min ?? null
  proposalMedianMax.value = data.median_running_max ?? null
}

// ── Similar runs (cluster) ────────────────────────────────────────────────────

const clusterRuns = ref<ClusterRun[]>([])

async function loadCluster() {
  const res = await fetch(`${apiBase}/api/v1/user-runs/${runId.value}/cluster`).catch(() => null)
  if (!res?.ok) return
  const data = await res.json()
  clusterRuns.value = data.runs ?? []
}

// ── Upvote ────────────────────────────────────────────────────────────────────

const upvoteCount = computed(() => run.value?.upvote_count ?? 0)
const isOwnRun    = computed(() => run.value?.is_own ?? false)
const userUpvoted = ref(false)
const upvoteLoading = ref(false)

watch(() => run.value?.user_upvoted, v => { if (v != null) userUpvoted.value = v }, { immediate: true })

async function toggleUpvote() {
  if (!run.value || !isAuthenticated.value) return
  upvoteLoading.value = true
  try {
    const headers = await authHeaders()
    const res = await fetch(`${apiBase}/api/v1/user-runs/${run.value.id}/upvote`, { method: 'POST', headers })
    if (!res.ok) return
    const data = await res.json()
    userUpvoted.value = data.upvoted
    if (run.value) run.value.upvote_count = data.upvote_count
  } catch {}
  finally { upvoteLoading.value = false }
}

// ── Fork ──────────────────────────────────────────────────────────────────────

const forking = ref(false)

async function forkRun() {
  if (!run.value || forking.value) return
  forking.value = true
  try {
    const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) }
    const res = await fetch(`${apiBase}/api/v1/user-runs/${run.value.id}/fork`, { method: 'POST', headers })
    if (!res.ok) return
    const data = await res.json()
    if (data.slug) router.push(`/my/runs/${data.slug}`)
  } catch {}
  finally { forking.value = false }
}

// ── Computed ──────────────────────────────────────────────────────────────────

const classLabel = computed(() => {
  if (!run.value) return null
  const r = run.value
  if (r.class_min == null && r.class_max == null) return null
  return 'Class ' + classRange(r.class_min, r.class_max)
})

function flowBandLabel(band: string): string {
  return flowBandLabelFn(band)
}

function flowBandTextClass(band: string): string {
  const map: Record<string, string> = {
    too_low: 'text-neutral-400',
    low:     'text-sky-500',
    running: 'text-emerald-500',
    high:    'text-amber-500',
    too_high:'text-red-500',
  }
  return map[band] ?? 'text-neutral-800 dark:text-neutral-100'
}

const mapRapids = computed(() => {
  if (!run.value) return []
  return run.value.rapids.map(r => ({
    id:                r.id,
    name:              r.name,
    description:       r.description,
    class_rating:      r.class_rating,
    is_surf_wave:      r.is_surf_wave,
    is_permanent_hazard: r.is_permanent_hazard,
    hazard_type:       r.hazard_type,
    lng:               r.lng,
    lat:               r.lat,
    type:              r.is_surf_wave ? 'wave' : 'rapid',
  }))
})

const mapAccess = computed(() => {
  if (!run.value) return []
  return run.value.access_points.map(a => ({
    id:          a.id,
    type:        a.access_type,
    name:        a.name,
    notes:       a.notes,
    lng:         a.lng,
    lat:         a.lat,
  }))
})

// ── Flag ──────────────────────────────────────────────────────────────────────

const flagOpen   = ref(false)
const flagReason = ref('inappropriate')
const flagNote   = ref('')
const flagSaving = ref(false)
const flagError  = ref('')
const flagDone   = ref(false)

const flagReasons = [
  { value: 'inappropriate', label: 'Inappropriate or offensive content' },
  { value: 'inaccurate',    label: 'Seriously inaccurate / dangerous info' },
  { value: 'spam',          label: 'Spam or self-promotion' },
  { value: 'other',         label: 'Other' },
]

async function submitFlag() {
  if (!run.value) return
  flagSaving.value = true; flagError.value = ''
  try {
    const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) }
    const res = await fetch(`${apiBase}/api/v1/user-runs/${run.value.id}/flag`, {
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

// ── CTA dismiss ───────────────────────────────────────────────────────────────

const ctaDismissed = ref(false)

// ── Init ──────────────────────────────────────────────────────────────────────

onMounted(async () => {
  await loadRun()
  // Redirect to canonical /runs/{handle}/{slug} if author_handle is available (V5).
  if (run.value?.author_handle && run.value?.slug) {
    navigateTo(`/runs/${run.value.author_handle}/${run.value.slug}`, { redirectCode: 301, replace: true })
    return
  }
  loadReports()
  loadProposals()
  loadCluster()
})
</script>
