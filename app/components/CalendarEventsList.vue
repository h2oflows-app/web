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

    <div v-if="!plans.length" class="text-sm text-neutral-400 py-3">No plans this month yet.</div>

    <div v-else class="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
      <!-- TODO(W4): plan detail page (/plans/:handle/:slug) doesn't exist yet — non-link row -->
      <div
        v-for="plan in sortedPlans"
        :key="plan.id"
        class="flex items-center gap-3 py-2.5"
      >
        <span class="w-2 h-2 rounded-full shrink-0" :class="planTypeMeta(plan.type).dotClass" />
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">{{ plan.name }}</p>
          <p class="text-xs text-neutral-400">{{ fmtRange(plan.start_date, plan.end_date) }}<template v-if="runCount(plan.id)"> · {{ runCount(plan.id) }} run{{ runCount(plan.id) === 1 ? '' : 's' }}</template></p>
        </div>
        <PlanTypeBadge :type="plan.type" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CalendarDay, CalendarPlan } from '~/composables/useCalendar'
import { fmtRange } from '~/utils/calendarDate'
import { planTypeMeta } from '~/utils/planType'

const props = defineProps<{
  plans: CalendarPlan[]
  days: CalendarDay[]
}>()

defineEmits<{ 'new-plan': [] }>()

const sortedPlans = computed(() => [...props.plans].sort((a, b) => a.start_date.localeCompare(b.start_date)))

function runCount(planId: string): number {
  let n = 0
  for (const d of props.days) for (const r of d.runs) if (r.plan_id === planId) n++
  return n
}
</script>
