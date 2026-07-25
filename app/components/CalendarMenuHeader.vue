<template>
  <div class="px-3 py-2.5 border-b border-neutral-100 dark:border-neutral-800">
    <p class="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate">
      {{ handle ? `@${handle}` : (user?.email ?? user?.user_metadata?.user_name ?? 'You') }}
    </p>
    <p class="text-xs text-neutral-400 mt-0.5 truncate">
      <template v-if="stats">{{ stats.days_on_water }} day{{ stats.days_on_water === 1 ? '' : 's' }} on water<template v-if="stats.streak"> · {{ stats.streak }}-day streak</template></template>
      <template v-else-if="loading">Loading…</template>
      <template v-else>&nbsp;</template>
    </p>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useMyProfile } from '~/composables/useMyProfile'
import { useSeason } from '~/composables/useSeason'

// Mounted at the top of AppHeader's avatar dropdown — fetches lazily, only
// once the menu is actually opened (`open` prop), so a season call doesn't
// ride along on every single page load (AppHeader mounts on every page,
// including ssr:true ones). Both loadProfile/load are internally
// idempotent/cached, so re-opening the menu is cheap.
const props = defineProps<{ open: boolean }>()

const { user, isAuthenticated } = useAuth()
const { handle, load: loadProfile } = useMyProfile()
const { stats, loading, load } = useSeason()

watch(() => props.open, (isOpen) => {
  if (isOpen && isAuthenticated.value) {
    loadProfile()
    load()
  }
})
</script>
