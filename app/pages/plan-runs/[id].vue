<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950">
    <AppHeader>
      <template v-if="run">
        <span class="text-neutral-300 dark:text-neutral-700 shrink-0">/</span>
        <span class="text-sm font-medium truncate text-neutral-700 dark:text-neutral-200">{{ run.name ?? 'Run' }}</span>
      </template>
    </AppHeader>

    <div v-if="pending" class="max-w-2xl mx-auto px-4 py-20 flex justify-center">
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
import type { PlanRunDetail, PlanRunDetailPlan } from '~/utils/planRun'

const route = useRoute()
const config = useRuntimeConfig()
const { getToken } = useAuth()

interface PlanRunResponse {
  run: PlanRunDetail
  plan: PlanRunDetailPlan
}

const param = route.params.id as string

// SSR-safe fetch, anon (no token) — the common case (public plan runs, OG
// scrapers, shared links). A private plan 404s here even for its own
// owner/members during the SSR pass (no session cookie to read) — the
// client-side retry below picks that case up once auth is ready. Never
// leak existence: a private-plan 404 must look identical to a truly
// missing id both here and after the retry fails too.
const { data, pending, refresh: refreshAsync } = await useAsyncData<PlanRunResponse | null>(
  `plan-run-${param}`,
  () => $fetch<PlanRunResponse>(`${config.public.apiBase}/api/v1/plan-runs/${param}`).catch(() => null)
)

const run = computed(() => data.value?.run ?? null)
const plan = computed(() => data.value?.plan ?? null)

// Client-side retry with auth, only when the anon fetch came back empty —
// covers "private plan, viewed by its own host/member" without ever
// sending a token for the (much more common) public case.
const { isAuthenticated } = useAuth()
async function retryWithAuth() {
  if (data.value) return
  const token = await getToken()
  if (!token) return
  const res = await fetch(`${config.public.apiBase}/api/v1/plan-runs/${param}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => null)
  if (res?.ok) data.value = await res.json().catch(() => null)
}
watch(isAuthenticated, (v) => { if (v) retryWithAuth() }, { immediate: true })

async function refresh() {
  if (isAuthenticated.value) {
    const token = await getToken()
    if (token) {
      const res = await fetch(`${config.public.apiBase}/api/v1/plan-runs/${param}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null)
      if (res?.ok) { data.value = await res.json().catch(() => null); return }
    }
  }
  await refreshAsync()
}

async function onDeleted() {
  await navigateTo('/calendar')
}

// ── SEO / OG (mirrors old reports/[id].vue) ──────────────────────────────
// canonical uses run.value.id (the resolved id) rather than the raw route
// param — GetRun resolves id | source_report_id | slug, so an old
// /reports/{uuid} link or a slug URL both canonicalize to the same
// /plan-runs/{id}.
const pageTitle = computed(() =>
  run.value ? `${run.value.name ?? 'Run'} — H2OFlows` : 'Run — H2OFlows'
)
const pageDesc = computed(() => {
  if (!run.value) return ''
  const cfsPart = run.value.gauge_cfs != null ? ` @ ${Math.round(run.value.gauge_cfs).toLocaleString()} cfs` : ''
  return `${plan.value?.name ?? ''}${cfsPart} — ${run.value.run_date}`.trim()
})
// #246 A5 (nudge/season/og) has not shipped yet — /og/plan-runs/{id}.png
// doesn't exist on the api yet, so this image 404s until that PR lands.
// Wired to the contract now per the implementation plan rather than left
// out, since the URL shape itself is already binding.
const pageOgImage = computed(() =>
  run.value ? `${config.public.apiBase}/og/plan-runs/${run.value.id}.png` : undefined
)
const pageCanonical = computed(() =>
  run.value ? `https://h2oflows.app/plan-runs/${run.value.id}` : undefined
)

useSeoMeta({
  title: () => pageTitle.value,
  description: () => pageDesc.value,
  ogTitle: () => run.value?.name ?? 'H2OFlows Run',
  ogDescription: () => pageDesc.value,
  ogType: 'article',
  ogImage: () => pageOgImage.value,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageType: 'image/png',
  ogUrl: () => pageCanonical.value,
  twitterCard: 'summary_large_image',
  twitterTitle: () => run.value?.name ?? 'H2OFlows Run',
  twitterDescription: () => pageDesc.value,
  twitterImage: () => pageOgImage.value,
})

useHead(() => {
  if (!run.value || !plan.value) return {}
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: run.value.name ?? 'Paddle run',
    author: plan.value.host_handle ? { '@type': 'Person', name: `@${plan.value.host_handle}` } : undefined,
    datePublished: run.value.created_at,
    description: pageDesc.value,
    url: pageCanonical.value,
  }
  return {
    script: [{ type: 'application/ld+json', innerHTML: JSON.stringify(ld) }],
  }
})
</script>
