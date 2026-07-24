<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4"
        @click.self="$emit('close')"
      >
        <div class="absolute inset-0 bg-black/50" @click="$emit('close')" />

        <div class="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
          <!-- Header -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
            <div class="flex items-center gap-2">
              <button
                v-if="showPreview"
                class="p-1 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                @click="showPreview = false"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              </button>
              <h2 class="text-sm font-semibold text-neutral-900 dark:text-white">
                {{ showPreview ? 'HTTP request preview' : 'Post to American Whitewater' }}
              </h2>
            </div>
            <button class="p-1 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200" @click="$emit('close')">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <!-- Form view -->
          <div v-if="!showPreview" class="px-5 py-4 space-y-4 overflow-y-auto flex-1">
            <!-- Title -->
            <div>
              <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Title</label>
              <input
                v-model="form.title"
                type="text"
                placeholder="Trip report title"
                class="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <!-- Date -->
            <div>
              <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Date</label>
              <input
                v-model="form.date"
                type="date"
                class="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <!-- Describe the flow -->
            <div>
              <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Describe the flow</label>
              <select
                v-model="form.flowLevel"
                class="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select a level…</option>
                <option v-for="l in AW_FLOW_LEVELS" :key="l.value" :value="l.value">{{ l.label }}</option>
              </select>
            </div>

            <!-- Report detail -->
            <div>
              <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Report detail</label>
              <MarkdownEditor
                v-model="form.content"
                :rows="5"
                placeholder="Describe conditions, flow, any notable observations…"
              />
            </div>

            <!-- Photos stub -->
            <div>
              <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Photos <span class="font-normal text-neutral-400">(coming soon)</span>
              </label>
              <div class="flex items-center gap-2 rounded-lg border border-dashed border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 px-4 py-3 text-sm text-neutral-400">
                <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                Photo upload not yet available
              </div>
            </div>
          </div>

          <!-- API preview view -->
          <div v-else class="px-5 py-4 space-y-4 overflow-y-auto flex-1">
            <div class="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              AW doesn't offer a public API yet. This is what H2OFlows would submit on your behalf if they did.
            </div>

            <div class="rounded-lg bg-neutral-900 dark:bg-neutral-950 border border-neutral-700 overflow-hidden">
              <div class="flex items-center justify-between px-3 py-1.5 border-b border-neutral-700">
                <span class="text-[10px] font-mono text-neutral-500 uppercase tracking-wide">HTTP Request</span>
                <button
                  class="text-[10px] font-mono text-neutral-400 hover:text-neutral-200 transition-colors"
                  @click="copyApiJson"
                >{{ apiJsonCopied ? 'Copied!' : 'Copy JSON' }}</button>
              </div>
              <pre class="text-[11px] font-mono text-neutral-300 p-3 overflow-x-auto leading-relaxed"><span class="text-emerald-400">POST</span> <span class="text-sky-300">https://www.americanwhitewater.org/api/journal</span>
<span class="text-neutral-500">Content-Type: application/json</span>

{{ apiPreviewJson }}</pre>
            </div>

            <p class="text-[10px] text-neutral-400 dark:text-neutral-500 text-center">
              Field names verified from AW's live form · endpoint approximate
            </p>
          </div>

          <!-- Footer -->
          <div class="px-5 py-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-3 shrink-0">
            <a
              href="https://www.americanwhitewater.org/user/my-trip-reports"
              target="_blank"
              rel="noopener"
              class="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              Go to my AW Trip Reports
              <svg class="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
            <button
              v-if="!showPreview"
              class="flex-1 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
              @click="showPreview = true"
            >
              Post Trip Report
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
interface Report {
  id: string
  slug: string
  name: string
  report_date: string
  report_time?: string
  content: string
  paddled: boolean
  flow_cfs?: number
  flow_band?: string
  aw_synced_at?: string
  reach_name?: string
  reach_slug?: string
}

const props = defineProps<{ report: Report; open: boolean }>()
defineEmits<{ close: []; synced: [] }>()

const AW_FLOW_LEVELS = [
  { value: 'too-low', label: 'Too Low' },
  { value: 'low',     label: 'Low' },
  { value: 'medium',  label: 'Medium' },
  { value: 'high',    label: 'High' },
  { value: 'too-high', label: 'Too High' },
]

const awObservationNumeric: Record<string, number> = {
  'too-low':  -1,
  'low':       0.1,
  'medium':    0.45,
  'high':      0.8,
  'too-high':  1.5,
}

const showPreview = ref(false)
const apiJsonCopied = ref(false)

const form = reactive({
  title:     props.report.name,
  date:      props.report.report_date,
  flowLevel: '',
  content:   props.report.content,
})

// Reset form and view when modal opens with a new report
watch(() => props.report, (r) => {
  form.title     = r.name
  form.date      = r.report_date
  form.content   = r.content
  form.flowLevel = ''
  showPreview.value = false
})

const apiPreviewBody = computed(() => {
  const body: Record<string, unknown> = {
    title:    form.title,
    postDate: form.date,
    body:     form.content,
  }
  if (form.flowLevel) body.observation = awObservationNumeric[form.flowLevel] ?? null
  if (props.report.flow_cfs != null) body.gage_reading = Math.round(props.report.flow_cfs)
  return body
})

const apiPreviewJson = computed(() => JSON.stringify(apiPreviewBody.value, null, 2))

async function copyApiJson() {
  await navigator.clipboard.writeText(apiPreviewJson.value)
  apiJsonCopied.value = true
  setTimeout(() => { apiJsonCopied.value = false }, 2000)
}
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.15s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
