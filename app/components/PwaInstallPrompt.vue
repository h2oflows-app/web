<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-full opacity-0"
  >
    <!-- Chromium install prompt (Android / desktop) -->
    <div
      v-if="showChromium"
      class="fixed bottom-16 sm:bottom-4 inset-x-3 sm:inset-x-auto sm:right-4 sm:max-w-sm z-20 rounded-lg border border-primary-200 dark:border-primary-800 bg-white dark:bg-neutral-900 shadow-lg p-4"
      role="banner"
      aria-label="Install H2OFlows app"
    >
      <div class="flex items-center gap-3">
        <img src="/pwa-192x192.png" alt="" class="w-10 h-10 rounded-lg shrink-0" aria-hidden="true" />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Install H2OFlows</p>
          <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Quick access from your home screen</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <UButton size="xs" color="primary" variant="solid" @click="install">Install</UButton>
          <button
            type="button"
            class="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded"
            aria-label="Dismiss"
            @click="dismiss"
          >
            <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- iOS Safari hint (no beforeinstallprompt — manual instructions only) -->
    <div
      v-else-if="showIos"
      class="fixed bottom-16 sm:bottom-4 inset-x-3 sm:inset-x-auto sm:right-4 sm:max-w-sm z-20 rounded-lg border border-primary-200 dark:border-primary-800 bg-white dark:bg-neutral-900 shadow-lg p-3"
      role="banner"
      aria-label="Install H2OFlows on iOS"
    >
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5 text-primary-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 12V3M8 7l4-4 4 4"/>
        </svg>
        <p class="flex-1 text-xs text-neutral-700 dark:text-neutral-300">
          Install: tap <strong>Share</strong> then <strong>Add to Home Screen</strong>
        </p>
        <button
          type="button"
          class="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded shrink-0"
          aria-label="Dismiss"
          @click="dismiss"
        >
          <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const STORAGE_KEY = 'pwa-install-dismissed'

const { $pwa } = useNuxtApp()
const dismissed = ref(false)

onMounted(() => {
  try {
    dismissed.value = window.localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    // localStorage blocked — treat as not dismissed
  }
})

/** True when running on iOS Safari outside standalone mode */
const isIos = computed(() => {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !('standalone' in navigator && (navigator as { standalone?: boolean }).standalone)
})

/** Show Chromium native install prompt */
const showChromium = computed(() =>
  !dismissed.value &&
  !!($pwa as { showInstallPrompt?: boolean } | undefined)?.showInstallPrompt
)

/** Show iOS manual hint */
const showIos = computed(() =>
  !dismissed.value &&
  isIos.value &&
  !showChromium.value
)

function install() {
  ($pwa as { install?: () => void } | undefined)?.install?.()
}

function dismiss() {
  dismissed.value = true
  try {
    window.localStorage.setItem(STORAGE_KEY, 'true')
  } catch {
    // ignore
  }
}
</script>
