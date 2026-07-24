<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
        @click.self="$emit('close')"
      >
        <div class="absolute inset-0 bg-black/40" @click="$emit('close')" />

        <div class="relative w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-xl overflow-hidden">
          <div class="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
            <h2 class="text-sm font-semibold text-neutral-900 dark:text-white">Share run</h2>
            <button class="p-1 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200" @click="$emit('close')">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div class="px-5 py-4 space-y-2">
            <button
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left"
              @click="copyLink"
            >
              <span class="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                <svg class="w-4 h-4 text-neutral-600 dark:text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              </span>
              <span class="text-sm text-neutral-700 dark:text-neutral-200">{{ linkCopied ? 'Copied!' : 'Copy link' }}</span>
            </button>

            <a
              :href="facebookUrl"
              target="_blank"
              rel="noopener"
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              <span class="w-8 h-8 rounded-full bg-[#1877F2] flex items-center justify-center shrink-0">
                <svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </span>
              <span class="text-sm text-neutral-700 dark:text-neutral-200">Share on Facebook</span>
            </a>

            <button
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left"
              @click="copyForInstagram"
            >
              <span class="w-8 h-8 rounded-full bg-linear-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center shrink-0">
                <svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
              </span>
              <span class="text-sm text-neutral-700 dark:text-neutral-200">{{ igCopied ? 'Copied!' : 'Copy for Instagram' }}</span>
            </button>

            <button
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left"
              @click="copyMessage"
            >
              <span class="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center shrink-0">
                <svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.003.022.01.043.02.062a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
              </span>
              <span class="text-sm text-neutral-700 dark:text-neutral-200">{{ messageCopied ? 'Copied!' : 'Copy for Discord' }}</span>
            </button>

            <div class="border-t border-neutral-100 dark:border-neutral-800 my-1" />

            <!-- AW cross-post (re-homed mock copy-JSON flow, decision #9) -->
            <button
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-left"
              @click="awOpen = true"
            >
              <span class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center shrink-0">
                <svg class="w-4 h-4 text-primary-600 dark:text-primary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14c3-6 6-9 8-9s5 9 8 9 5-9 8-9"/><path d="M12 22V5"/></svg>
              </span>
              <span class="text-sm text-neutral-700 dark:text-neutral-200">Share to American Whitewater</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <AWShareModal
      v-if="awOpen"
      :report="awReport"
      :open="awOpen"
      @close="awOpen = false"
      @synced="awOpen = false"
    />
  </Teleport>
</template>

<script setup lang="ts">
// PlanRunShareSheet — copy-link/social clone of ShareReportModal, re-homed
// for plan_runs (#246 W3). ShareReportModal's props are tightly coupled to
// the reports shape (flat report.reach_name/reach_slug/aw_synced_at etc.),
// which the plan_runs response doesn't carry — a straight prop-fit wasn't
// possible, so this is the small standalone clone the implementation plan
// calls for. AW cross-post reuses AWShareModal itself (the re-homed mock
// copy-JSON flow, decision #9) — reach_name/reach_slug are unused inside
// AWShareModal so plan_runs (which don't carry a reach name/slug) can pass
// it a minimally-shaped report without those fields.

const props = defineProps<{
  id: string
  slug: string
  name: string
  riverName?: string | null
  gaugeCfs?: number | null
  runDate: string
  notes?: string | null
  paddled: boolean
  open: boolean
}>()
defineEmits<{ close: [] }>()

const awOpen = ref(false)

const awReport = computed(() => ({
  id: props.id,
  slug: props.slug,
  name: props.name,
  report_date: props.runDate,
  content: props.notes ?? '',
  paddled: props.paddled,
  flow_cfs: props.gaugeCfs ?? undefined,
}))

const config = useRuntimeConfig()
const linkCopied = ref(false)
const messageCopied = ref(false)
const igCopied = ref(false)

const runUrl = computed(() =>
  `${config.public.appUrl ?? 'https://h2oflows.app'}/plan-runs/${props.id}`
)

const shareText = computed(() => {
  const flow = props.gaugeCfs != null ? ` @ ${Math.round(props.gaugeCfs).toLocaleString()} cfs` : ''
  const river = props.riverName ? ` — ${props.riverName}` : ''
  return `${props.name}${river}${flow}`
})

const facebookUrl = computed(() =>
  `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(runUrl.value)}`
)

async function copyLink() {
  await navigator.clipboard.writeText(runUrl.value)
  linkCopied.value = true
  setTimeout(() => { linkCopied.value = false }, 2000)
}

async function copyMessage() {
  await navigator.clipboard.writeText(`${shareText.value}\n${runUrl.value}`)
  messageCopied.value = true
  setTimeout(() => { messageCopied.value = false }, 2000)
}

async function copyForInstagram() {
  await navigator.clipboard.writeText(`${shareText.value}\n${runUrl.value}`)
  igCopied.value = true
  setTimeout(() => { igCopied.value = false }, 2000)
}
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.15s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
