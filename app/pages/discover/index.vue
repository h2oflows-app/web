<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950">
    <AppHeader>
      <span class="text-neutral-300 dark:text-neutral-700 shrink-0">/</span>
      <span class="text-sm font-medium text-neutral-700 dark:text-neutral-200">Discover</span>
    </AppHeader>

    <main class="max-w-3xl mx-auto px-4 py-6 pb-24 sm:pb-6 space-y-5">
      <h1 class="text-xl font-bold text-neutral-900 dark:text-white">Discover</h1>

      <div class="mt-16 flex flex-col items-center gap-3 text-center text-neutral-400">
        <svg class="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <p class="text-sm">Public trips looking for crew are coming in this release chain.</p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ ssr: false })
</script>
