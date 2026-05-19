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
  v: 2,
  items: props.gauges.map(g => ({
    t: 'g' as const,
    id: g.id,
    rs: g.contextReachSlug ?? null,
  })),
}))

// Token = "z" + base64url(gzip(JSON)) — gzip cuts payload size ~3x for
// repetitive JSON (UUIDs share structure). Older v1 tokens remain decodable
// on the share page via legacy fallback (no "z" prefix → plain base64 JSON).
const token = ref('')

async function encodeToken(p: unknown): Promise<string> {
  const json = JSON.stringify(p)
  const enc = new TextEncoder().encode(json)
  const stream = new Blob([enc]).stream().pipeThrough(new CompressionStream('gzip'))
  const buf = await new Response(stream).arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  // Chunked to avoid stack-overflow on large arrays
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk) as unknown as number[])
  }
  const b64 = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  return 'z' + b64
}

watch(payload, async (p) => {
  token.value = await encodeToken(p)
}, { immediate: true })

const shareUrl = computed(() => {
  // Prefer current origin so share URLs generated from deploy previews point
  // back at the same deploy. Prod requests fall back to the configured app URL.
  const base = typeof window !== 'undefined'
    ? window.location.origin
    : ((config.public as any).appUrl ?? 'https://h2oflows.app')
  return token.value ? `${base}/share/${token.value}` : ''
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
