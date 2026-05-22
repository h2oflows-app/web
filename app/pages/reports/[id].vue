<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950">
    <AppHeader>
      <template v-if="report">
        <span class="text-neutral-300 dark:text-neutral-700 shrink-0">/</span>
        <span class="text-sm font-medium truncate text-neutral-700 dark:text-neutral-200">{{ report.name }}</span>
      </template>
    </AppHeader>

    <div v-if="pending" class="max-w-2xl mx-auto px-4 py-20 flex justify-center">
      <div class="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
    </div>

    <div v-else-if="!report" class="max-w-2xl mx-auto px-4 py-20 text-center text-neutral-400">
      Report not found.
    </div>

    <main v-else class="max-w-2xl mx-auto px-4 py-8 pb-20 sm:pb-8 space-y-6">

      <!-- Header card -->
      <div class="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 px-5 py-4 space-y-3">
        <div class="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 class="text-lg font-bold text-neutral-900 dark:text-white">{{ report.name }}</h1>
            <p v-if="report.handle" class="text-xs text-neutral-400 mt-0.5">@{{ report.handle }}</p>
          </div>
          <div class="flex items-center gap-3 shrink-0">
            <button
              class="inline-flex items-center gap-1.5 rounded-lg bg-primary-50 dark:bg-primary-950/50 hover:bg-primary-100 dark:hover:bg-primary-950 px-3 py-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 transition-colors"
              @click="shareOpen = true"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              Share
            </button>
            <div class="text-right">
              <div class="text-sm font-medium text-neutral-700 dark:text-neutral-300">{{ formatDate(report.report_date) }}</div>
              <div v-if="report.report_time" class="text-xs text-neutral-400">{{ report.report_time }}</div>
            </div>
          </div>
        </div>

        <!-- Reach link -->
        <NuxtLink
          :to="`/reaches/${report.reach_slug}`"
          class="inline-flex items-center gap-1.5 text-sm text-primary-600 dark:text-primary-400 hover:underline"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14c3-6 6-9 8-9s5 9 8 9 5-9 8-9"/></svg>
          {{ report.reach_name }}
        </NuxtLink>

        <!-- Flow / paddled badges -->
        <div class="flex items-center gap-2 flex-wrap">
          <span
            v-if="report.flow_cfs != null"
            class="inline-flex items-center gap-1 rounded-md bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:text-neutral-300"
          >
            {{ Math.round(report.flow_cfs).toLocaleString() }} cfs
            <span v-if="report.flow_band" :class="bandBadgeClass(report.flow_band)" class="font-medium capitalize">{{ report.flow_band }}</span>
          </span>
          <span
            v-if="report.paddled"
            class="inline-flex items-center gap-1 rounded-md bg-primary-50 dark:bg-primary-950/50 px-2 py-0.5 text-xs font-medium text-primary-600 dark:text-primary-400"
          >
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12c2-4 4-6 6-6s4 6 6 6 4-6 6-6"/></svg>
            Paddled this reach
          </span>
        </div>
      </div>

      <!-- Content -->
      <div class="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 px-5 py-4">
        <div class="report-prose" v-html="renderedContent" />
      </div>

    </main>

    <ShareReportModal v-if="report" :report="report" :open="shareOpen" @close="shareOpen = false" />
  </div>
</template>

<script setup lang="ts">
import MarkdownIt from 'markdown-it'

const route = useRoute()
const config = useRuntimeConfig()

const md = new MarkdownIt({ html: false, linkify: true, breaks: true })

interface Report {
  id: string
  slug: string
  handle: string
  name: string
  report_date: string
  report_time?: string
  content: string
  paddled: boolean
  flow_cfs?: number
  flow_band?: string
  aw_synced_at?: string
  created_at: string
  reach_name: string
  reach_slug: string
}

const { data: report, pending } = await useAsyncData<Report | null>(
  `report-${route.params.id}`,
  () => $fetch<Report>(`${config.public.apiBase}/api/v1/reports/${route.params.id}`)
    .catch(() => null)
)

const renderedContent = computed(() =>
  report.value ? md.render(report.value.content || '') : ''
)

const shareOpen = ref(false)

function formatDate(d: string): string {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function bandBadgeClass(band: string): string {
  if (band === 'low') return 'text-sky-600 dark:text-sky-400'
  if (band === 'running') return 'text-emerald-600 dark:text-emerald-400'
  if (band === 'high') return 'text-amber-600 dark:text-amber-400'
  return 'text-neutral-500'
}

const reportTitle = computed(() =>
  report.value ? `${report.value.name} — H2OFlows` : 'Report — H2OFlows'
)
const reportDesc = computed(() => {
  if (!report.value) return ''
  const r = report.value
  const cfsPart = r.flow_cfs != null ? ` @ ${Math.round(r.flow_cfs).toLocaleString()} cfs` : ''
  return `${r.reach_name}${cfsPart} — ${r.report_date}`
})
const reportOgImage = computed(() =>
  report.value ? `${config.public.apiBase}/og/reports/${report.value.id}.png` : undefined
)
const reportCanonical = computed(() =>
  report.value ? `https://h2oflows.app/reports/${report.value.id}` : undefined
)

useSeoMeta({
  title:           () => reportTitle.value,
  description:     () => reportDesc.value,
  ogTitle:         () => report.value?.name ?? 'H2OFlows Report',
  ogDescription:   () => reportDesc.value,
  ogType:          'article',
  ogImage:         () => reportOgImage.value,
  ogImageWidth:    1200,
  ogImageHeight:   630,
  ogImageType:     'image/png',
  ogUrl:           () => reportCanonical.value,
  twitterCard:     'summary_large_image',
  twitterTitle:    () => report.value?.name ?? 'H2OFlows Report',
  twitterDescription: () => reportDesc.value,
  twitterImage:    () => reportOgImage.value,
})

// JSON-LD structured data — Article schema for the report
useHead(() => {
  if (!report.value) return {}
  const r = report.value
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: r.name,
    author: r.handle ? { '@type': 'Person', name: `@${r.handle}` } : undefined,
    datePublished: r.created_at,
    description: reportDesc.value,
    url: reportCanonical.value,
    about: { '@type': 'Place', name: r.reach_name },
  }
  return {
    script: [{
      type: 'application/ld+json',
      innerHTML: JSON.stringify(ld),
    }],
  }
})
</script>
