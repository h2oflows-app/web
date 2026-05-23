<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col">
    <!-- Header bar -->
    <div class="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-sm border-b border-neutral-200 dark:border-neutral-800">
      <div class="flex items-center gap-2 min-w-0">
        <NuxtLink to="/my/runs" class="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 shrink-0">My Runs</NuxtLink>
        <span class="text-neutral-300 dark:text-neutral-700 shrink-0">/</span>
        <h2 class="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate">New Run</h2>
      </div>
      <button
        type="button"
        class="shrink-0 flex items-center justify-center w-8 h-8 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        aria-label="Cancel and close"
        @click="router.push('/my/runs')"
      >
        <svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
        </svg>
      </button>
    </div>

    <!-- Auth gate -->
    <div v-if="!isAuthenticated && authReady" class="flex-1 flex flex-col items-center justify-center gap-3 text-center">
      <h2 class="text-lg font-semibold">Sign in to create a run</h2>
      <NuxtLink to="/login" class="text-sm text-primary-600 dark:text-primary-400 hover:underline">Sign in</NuxtLink>
    </div>

    <div v-else-if="!authReady" class="flex-1 flex items-center justify-center">
      <div class="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
    </div>

    <div v-else class="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
      <UserRunAuthor @created="onCreated" @cancel="router.push('/my/runs')" />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ ssr: false })

const router = useRouter()
const { isAuthenticated } = useAuth()
const authReady = ref(false)

onMounted(() => { authReady.value = true })

function onCreated(slug: string) {
  router.push(`/my/runs/${slug}`)
}
</script>
