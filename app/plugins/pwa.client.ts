// Register the service worker and wire install-prompt capture.
//
// @vite-pwa/nuxt generates /sw.js + /manifest.webmanifest at build time, but
// its runtime registration doesn't run under Nuxt 4. Register sw.js directly
// (re-registering the same URL is idempotent) so Chrome/Edge see a controlling
// SW with a fetch handler — the last criterion for installability.
export default defineNuxtPlugin(() => {
  const { wire } = usePwaInstall()
  // Wire listeners as early as possible — beforeinstallprompt can fire soon
  // after load, before component mount.
  wire()

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Registration failure shouldn't break the app.
      })
    })
  }
})
