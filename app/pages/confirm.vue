<template>
  <div class="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
    <p class="text-sm text-neutral-400">Signing in…</p>
  </div>
</template>

<script setup lang="ts">
// With implicit flow the Supabase client processes the #access_token fragment
// automatically on initialization. Just wait for the session then redirect.
definePageMeta({ ssr: false })

const client = useSupabaseClient()
const route = useRoute()

// login.vue's OAuth / sign-up branches thread the caller's original
// destination through as ?redirect= on this page's own callback URL (email
// sign-IN skips /confirm entirely and router.push's it directly). Same-origin
// path only — must start with '/' and not '//' (protocol-relative would hop
// off-site) — anything else falls back to /dashboard as before.
function redirectTarget(): string {
  const q = route.query.redirect
  if (typeof q === 'string' && q.startsWith('/') && !q.startsWith('//')) return q
  return '/dashboard'
}

onMounted(async () => {
  // Give the client a tick to process the hash fragment
  const { data } = await client.auth.getSession()
  if (data.session) {
    window.location.href = redirectTarget()
  } else {
    // Listen for the auth state change triggered by hash processing
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      if (session) {
        subscription.unsubscribe()
        window.location.href = redirectTarget()
      }
    })
    // Timeout fallback
    setTimeout(() => { window.location.href = '/' }, 5000)
  }
})
</script>
