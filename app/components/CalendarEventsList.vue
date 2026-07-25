<template>
  <div>
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Plans this month</h3>
      <button
        type="button"
        class="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
        @click="$emit('new-plan')"
      >+ New plan</button>
    </div>

    <div v-if="loading" class="flex flex-col gap-1.5 py-1">
      <div v-for="i in 2" :key="i" class="h-10 rounded bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
    </div>

    <div v-else-if="!plans.length" class="text-sm text-neutral-400 py-3">No plans this month yet.</div>

    <div v-else class="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
      <NuxtLink
        v-for="plan in sortedPlans"
        :key="plan.id"
        :to="planLink(plan)"
        class="flex items-center gap-3 py-2.5 -mx-2 px-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors"
      >
        <span class="w-2 h-2 rounded-full shrink-0" :class="planTypeMeta(plan.type).dotClass" />
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">{{ plan.name }}</p>
          <p class="text-xs text-neutral-400">{{ fmtRange(plan.start_date, plan.end_date) }}<template v-if="runCount(plan.id)"> · {{ runCount(plan.id) }} run{{ runCount(plan.id) === 1 ? '' : 's' }}</template></p>
        </div>
        <PlanTypeBadge :type="plan.type" />
        <svg class="w-4 h-4 text-neutral-300 dark:text-neutral-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import type { CalendarDay, CalendarPlan } from '~/composables/useCalendar'
import { useMyProfile } from '~/composables/useMyProfile'
import { fmtRange } from '~/utils/calendarDate'
import { planTypeMeta } from '~/utils/planType'

const props = defineProps<{
  plans: CalendarPlan[]
  days: CalendarDay[]
  loading?: boolean
}>()

defineEmits<{ 'new-plan': [] }>()

const sortedPlans = computed(() => [...props.plans].sort((a, b) => a.start_date.localeCompare(b.start_date)))

// host_handle ships with api#163; until that API is live, own plans can
// still link via the viewer's own handle (host = me when role==='own').
const { handle: myHandle, load: loadProfile } = useMyProfile()
onMounted(() => { loadProfile() })

function planLink(plan: CalendarPlan): string {
  const handle = plan.host_handle || (plan.role === 'own' ? myHandle.value : '')
  return handle ? `/plans/${handle}/${plan.slug}` : '/calendar'
}

function runCount(planId: string): number {
  let n = 0
  for (const d of props.days) for (const r of d.runs) if (r.plan_id === planId) n++
  return n
}
</script>
