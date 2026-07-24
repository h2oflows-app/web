<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950">
    <AppHeader>
      <template v-if="run">
        <span class="text-neutral-300 dark:text-neutral-700 shrink-0">/</span>
        <span class="text-sm font-medium truncate text-neutral-700 dark:text-neutral-200">{{ run.name ?? 'Run' }}</span>
      </template>
    </AppHeader>

    <!-- Auth loading -->
    <div v-if="!authReady" class="max-w-2xl mx-auto px-4 py-20 flex justify-center">
      <div class="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
    </div>

    <!-- Not signed in (contract §6 REVISED: calendar domain is auth-only, no anon read) -->
    <div v-else-if="!isAuthenticated" class="max-w-2xl mx-auto px-4 py-20 flex flex-col items-center gap-3 text-center">
      <svg class="w-10 h-10 text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
      <h2 class="text-lg font-semibold">Sign in to view this run</h2>
      <NuxtLink :to="`/login?redirect=${encodeURIComponent(route.fullPath)}`" class="text-sm text-primary-600 dark:text-primary-400 hover:underline">Sign in</NuxtLink>
    </div>

    <div v-else-if="pending" class="max-w-2xl mx-auto px-4 py-20 flex justify-center">
      <div class="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
    </div>

    <div v-else-if="!run || !plan" class="max-w-2xl mx-auto px-4 py-20 text-center text-neutral-400">
      Run not found.
    </div>

    <main v-else class="max-w-2xl mx-auto px-4 py-8 pb-20 sm:pb-8">
      <PlanRunDetailCard :run="run" :plan="plan" @refresh="refresh" @deleted="onDeleted" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { PlanRunDetail, PlanRunDetailPlan } from '~/utils/planRun'

definePageMeta({ ssr: false })

const route = useRoute()
const config = useRuntimeConfig()
const { isAuthenticated, getToken } = useAuth()

interface PlanRunResponse {
  run: PlanRunDetail
  plan: PlanRunDetailPlan
}

const param = route.params.id as string

const authReady = ref(false)
onMounted(() => { authReady.value = true })

const data = ref<PlanRunResponse | null>(null)
const pending = ref(false)

async function load() {
  pending.value = true
  const token = await getToken()
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${config.public.apiBase}/api/v1/plan-runs/${param}`, { headers }).catch(() => null)
  data.value = res?.ok ? await res.json().catch(() => null) : null
  pending.value = false
}

watch(isAuthenticated, (v) => { if (v) load() }, { immediate: true })

const run = computed(() => data.value?.run ?? null)
const plan = computed(() => data.value?.plan ?? null)

async function refresh() {
  await load()
}

async function onDeleted() {
  await navigateTo('/calendar')
}
</script>
