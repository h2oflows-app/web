<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4"
        @click.self="$emit('close')"
      >
        <div class="absolute inset-0 bg-black/50" @click="$emit('close')" />

        <div class="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-xl overflow-hidden">
          <!-- Header -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
            <h2 class="text-sm font-semibold text-neutral-900 dark:text-white">Share dashboard</h2>
            <button class="p-1 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200" @click="$emit('close')">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div class="px-5 py-4 space-y-4">
            <p class="text-sm text-neutral-600 dark:text-neutral-400">
              Sharing {{ gauges.length }} gauge item{{ gauges.length !== 1 ? 's' : '' }}.
              Recipients get their own copy — future changes won't sync.
            </p>

            <!-- Share link -->
            <div>
              <p class="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1.5">Share link</p>
              <div class="flex gap-2">
                <input
                  readonly
                  :value="shareUrl"
                  class="flex-1 min-w-0 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-xs font-mono text-neutral-600 dark:text-neutral-300 truncate"
                />
                <button
                  class="shrink-0 px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium transition-colors min-w-[52px]"
                  @click="copyLink"
                >{{ linkCopied ? 'Copied!' : 'Copy' }}</button>
              </div>
            </div>

            <!-- JSON payload -->
            <div>
              <p class="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1.5">JSON snapshot</p>
              <div class="rounded-lg overflow-hidden border border-neutral-700">
                <div class="flex items-center justify-between px-3 py-1.5 bg-neutral-800 border-b border-neutral-700">
                  <span class="text-[10px] font-mono text-neutral-400 uppercase tracking-wide">JSON</span>
                  <button class="text-[10px] font-mono text-neutral-400 hover:text-neutral-200 transition-colors" @click="copyJson">
                    {{ jsonCopied ? 'Copied!' : 'Copy' }}
                  </button>
                </div>
                <pre class="text-[11px] font-mono text-neutral-300 bg-neutral-900 px-3 py-2.5 overflow-x-auto leading-relaxed max-h-40 overflow-y-auto">{{ jsonPretty }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { WatchedGauge } from '~/stores/watchlist'

const props = defineProps<{
  open: boolean
  gauges: WatchedGauge[]
}>()
defineEmits<{ close: [] }>()

const config = useRuntimeConfig()

function itemLabel(g: WatchedGauge): string {
  return g.contextReachCommonName
    ?? g.contextReachFullName
    ?? g.contextReachSlug
    ?? `${g.source.toUpperCase()}-${g.externalId}`
}

// Payload deliberately excludes labels — recipient fetches gauge metadata
// (including names) from /api/v1/gauges/batch on the share page. Including
// labels here bloats the URL beyond Netlify's 414 limit for large watchlists.
const payload = computed(() => ({
  v: 1,
  items: props.gauges.map(g => ({
    t: 'g' as const,
    id: g.id,
    rs: g.contextReachSlug ?? null,
  })),
}))

const token = computed(() => {
  const json = JSON.stringify(payload.value)
  const bytes = new TextEncoder().encode(json)
  const b64 = btoa(String.fromCharCode(...bytes))
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
})

const shareUrl = computed(() => {
  const base = (config.public as any).appUrl ?? 'https://h2oflows.app'
  return `${base}/share/${token.value}`
})

const jsonPretty = computed(() => JSON.stringify(payload.value, null, 2))

const linkCopied = ref(false)
const jsonCopied = ref(false)

async function copyLink() {
  await navigator.clipboard.writeText(shareUrl.value)
  linkCopied.value = true
  setTimeout(() => { linkCopied.value = false }, 2000)
}

async function copyJson() {
  await navigator.clipboard.writeText(jsonPretty.value)
  jsonCopied.value = true
  setTimeout(() => { jsonCopied.value = false }, 2000)
}
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.15s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
