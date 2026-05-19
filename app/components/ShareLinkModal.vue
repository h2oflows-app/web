<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4"
        @click.self="$emit('close')"
      >
        <div class="absolute inset-0 bg-black/50" @click="$emit('close')" />

        <div class="relative w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-xl overflow-hidden">
          <!-- Header -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
            <h2 class="text-sm font-semibold text-neutral-900 dark:text-white">{{ title }}</h2>
            <button class="p-1 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200" @click="$emit('close')">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div class="px-5 py-4 space-y-4">
            <!-- Loading -->
            <div v-if="loading" class="flex justify-center py-4">
              <div class="w-5 h-5 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
            </div>

            <template v-else>
              <!-- Share link -->
              <div>
                <p class="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1.5">Share link</p>
                <div class="flex items-center gap-2">
                  <input
                    readonly
                    :value="link"
                    class="flex-1 min-w-0 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-1.5 text-xs font-mono text-neutral-600 dark:text-neutral-300 focus:outline-none truncate"
                    @click="($event.target as HTMLInputElement).select()"
                  />
                  <button
                    class="shrink-0 flex items-center gap-1 rounded-lg border border-neutral-200 dark:border-neutral-700 px-2.5 py-1.5 text-xs text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                    @click="copyLink"
                  >
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    {{ linkCopied ? 'Copied!' : 'Copy' }}
                  </button>
                </div>
                <p class="text-[10px] text-neutral-400 mt-1">Recipient logs in → one-click import</p>
              </div>

              <!-- JSON snippet -->
              <div>
                <p class="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1.5">JSON payload</p>
                <div class="rounded-lg bg-neutral-900 dark:bg-neutral-950 border border-neutral-700 overflow-hidden">
                  <div class="flex items-center justify-between px-3 py-1.5 border-b border-neutral-700">
                    <span class="text-[10px] font-mono text-neutral-500 uppercase tracking-wide">Paste to import dialog</span>
                    <button
                      class="text-[10px] font-mono text-neutral-400 hover:text-neutral-200 transition-colors"
                      @click="copyJson"
                    >{{ jsonCopied ? 'Copied!' : 'Copy JSON' }}</button>
                  </div>
                  <pre class="text-[11px] font-mono text-neutral-300 p-3 max-h-48 overflow-y-auto leading-relaxed">{{ json }}</pre>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  open: boolean
  title?: string
  link: string
  json: string
  loading?: boolean
}>()

defineEmits<{ close: [] }>()

const linkCopied = ref(false)
const jsonCopied = ref(false)

async function copyLink() {
  await navigator.clipboard.writeText(props.link)
  linkCopied.value = true
  setTimeout(() => { linkCopied.value = false }, 2000)
}

async function copyJson() {
  await navigator.clipboard.writeText(props.json)
  jsonCopied.value = true
  setTimeout(() => { jsonCopied.value = false }, 2000)
}
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.15s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
