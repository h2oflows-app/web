import { ref } from 'vue'

// Minimal hand-rolled PWA install handling.
//
// @vite-pwa/nuxt generates sw.js + manifest.webmanifest at build time (that
// works), but its runtime plugin / head injection don't fire under Nuxt 4
// (the module's peerDep is Nuxt 3) — so `$pwa` never initializes and the
// manifest <link> never reaches the served HTML. We wire the runtime bits
// ourselves instead: capture `beforeinstallprompt`, expose install state.

// Module-level singletons — shared across every usePwaInstall() caller.
const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
const canInstall = ref(false)
let wired = false

// Not in the standard lib DOM types yet.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePwaInstall() {
  /** Attach the beforeinstallprompt / appinstalled listeners once (client only). */
  function wire() {
    if (wired || typeof window === 'undefined') return
    wired = true

    window.addEventListener('beforeinstallprompt', (e) => {
      // Suppress Chrome's default mini-infobar so we control the prompt.
      e.preventDefault()
      deferredPrompt.value = e as BeforeInstallPromptEvent
      canInstall.value = true
    })

    window.addEventListener('appinstalled', () => {
      deferredPrompt.value = null
      canInstall.value = false
    })
  }

  /** Trigger the native install dialog. No-op if no deferred prompt. */
  async function install() {
    const e = deferredPrompt.value
    if (!e) return
    await e.prompt()
    await e.userChoice
    // The deferred prompt can only be used once.
    deferredPrompt.value = null
    canInstall.value = false
  }

  return { canInstall, install, wire }
}
