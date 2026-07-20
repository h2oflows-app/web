<template>
  <!-- Right placement: own-run edit pencil, navigates to the editor. Renders
       nothing when placement is 'left' or the run isn't mine. -->
  <UTooltip v-if="placement === 'right' && isMine(resolvedHandle)" text="Edit your run" class="shrink-0 inline-flex">
    <NuxtLink
      :to="slug ? `/my/runs/${slug}` : '#'"
      class="shrink-0 inline-flex p-0.5 rounded text-primary-500 dark:text-primary-400 hover:text-primary-600 dark:hover:text-primary-300 transition-colors"
      aria-label="Edit your run"
      @click.stop
    >
      <svg class="w-3 h-3 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M13 4l3 3-9 9-4 1 1-4 9-9z"/>
      </svg>
    </NuxtLink>
  </UTooltip>

  <!-- Left placement: multi-user glyph for any other owner (including special/org
       accounts). Hover reveals owner handle + optional Fork button.

       Takes up no space on your own runs — that asymmetry is the point: only
       runs you don't own get indented, which is what separates them by eye.
       So no reserved slot here.

       Gated on the profile having resolved, because isMine() reads a handle
       fetched asynchronously. Without the gate every row renders the glyph on
       first paint and then your own runs snap it away, shifting every name.
       Anonymous visitors never own anything, so they skip the wait. -->
  <UPopover
    v-else-if="placement === 'left' && (!isAuthenticated || profileLoaded) && !isMine(resolvedHandle)"
    mode="hover"
    :content="{ side: 'top' }"
    class="shrink-0 inline-flex"
  >
    <span class="shrink-0 inline-flex text-primary-500 dark:text-primary-400" @click.stop>
      <svg class="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    </span>
    <template #content>
      <div class="flex items-center gap-2 px-3 py-2 text-xs" @click.stop>
        <span class="font-medium text-neutral-700 dark:text-neutral-200 whitespace-nowrap">@{{ resolvedHandle }}</span>
        <UButton
          v-if="runId && isAuthenticated"
          size="2xs"
          color="primary"
          variant="soft"
          :loading="forking"
          @click="onFork"
        >Fork</UButton>
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = withDefaults(defineProps<{
  authorHandle?: string | null
  slug?: string | null
  runId?: string | null
  placement?: 'left' | 'right'
}>(), {
  placement: 'right',
})

const { isMine, loaded: profileLoaded, load: loadMyProfile } = useMyProfile()
const { isAuthenticated, getToken } = useAuth()
const { apiBase } = useRuntimeConfig().public
const router = useRouter()
const toast = useToast()

onMounted(() => { void loadMyProfile() })

// Null authorHandle historically defaulted to 'h2oflows' for display — kept as
// a fallback label; h2oflows is no longer special-cased, it's just another owner.
const resolvedHandle = computed(() => props.authorHandle ?? 'h2oflows')

const forking = ref(false)

async function onFork() {
  if (!props.runId || forking.value) return
  forking.value = true
  try {
    const token = await getToken()
    const headers: Record<string, string> = {}
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch(`${apiBase}/api/v1/user-runs/${props.runId}/fork`, {
      method: 'POST',
      headers,
    })
    if (!res.ok) {
      toast.add({ title: `Fork failed (${res.status})`, color: 'error', duration: 3000 })
      return
    }
    const data = await res.json()
    toast.add({ title: 'Forked to your runs', color: 'success', duration: 3000 })
    if (data.slug) router.push(`/my/runs/${data.slug}`)
  } finally {
    forking.value = false
  }
}
</script>
