<template>
  <div class="rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 space-y-4">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-xs uppercase tracking-wide text-neutral-400">Days on the water</p>
        <div class="flex items-baseline gap-2 mt-0.5">
          <span class="text-3xl font-bold font-mono text-neutral-900 dark:text-white">{{ stats?.days_on_water ?? 0 }}</span>
          <span v-if="goalDays" class="text-sm text-neutral-400">of {{ goalDays }}-day goal</span>
        </div>
      </div>

      <div
        v-if="stats?.streak"
        class="shrink-0 flex items-center gap-1 rounded-full bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 px-3 py-1 text-xs font-semibold"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 3-1 4-2 6-1.5 2.5 0 5 2 5s3.5-2.5 2-5c2 1 3 3 3 5a5 5 0 0 1-10 0c0-4 3-6 5-11z"/></svg>
        {{ stats.streak }}-day streak
      </div>
    </div>

    <div v-if="goalDays" class="space-y-1">
      <div class="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
        <div class="h-full bg-primary-500 dark:bg-primary-400 transition-all" :style="{ width: `${pct}%` }" />
      </div>
      <p class="text-xs text-neutral-400">{{ pct }}%<template v-if="remaining > 0"> · {{ remaining }} to go</template><template v-else> · goal reached 🎉</template></p>
    </div>

    <!-- Inline goal edit: pencil -> stepper/input -> PATCH /me/calendar-prefs -->
    <div class="pt-1 border-t border-neutral-100 dark:border-neutral-800">
      <button
        v-if="!editingGoal"
        type="button"
        class="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
        @click="startEdit"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
        {{ goalDays ? 'Edit goal' : 'Set a season goal' }}
      </button>

      <div v-else class="mt-3 flex items-center gap-2">
        <button
          type="button"
          class="w-7 h-7 rounded-full border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-30"
          :disabled="goalInput <= 1"
          @click="goalInput = Math.max(1, goalInput - 1)"
        >−</button>
        <input
          v-model.number="goalInput"
          type="number"
          min="1"
          max="366"
          class="w-16 text-center rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
        />
        <button
          type="button"
          class="w-7 h-7 rounded-full border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-30"
          :disabled="goalInput >= 366"
          @click="goalInput = Math.min(366, goalInput + 1)"
        >+</button>
        <span class="text-xs text-neutral-400">days</span>
        <button
          type="button"
          class="ml-1 px-2.5 py-1 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
          :disabled="saving"
          @click="saveGoal"
        >{{ saving ? 'Saving…' : 'Save' }}</button>
        <button
          type="button"
          class="px-2 py-1 text-xs text-neutral-500 dark:text-neutral-400 hover:underline"
          @click="editingGoal = false"
        >Cancel</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSeason } from '~/composables/useSeason'

const { stats, refresh } = useSeason()
const toast = useToast()
const { apiBase } = useRuntimeConfig().public
const { getToken } = useAuth()

const goalDays = computed(() => stats.value?.goal_days ?? null)

const pct = computed(() => {
  if (!goalDays.value) return 0
  return Math.min(100, Math.round(((stats.value?.days_on_water ?? 0) / goalDays.value) * 100))
})

const remaining = computed(() => Math.max(0, (goalDays.value ?? 0) - (stats.value?.days_on_water ?? 0)))

const editingGoal = ref(false)
const goalInput = ref(30)
const saving = ref(false)

function startEdit() {
  goalInput.value = goalDays.value ?? 30
  editingGoal.value = true
}

async function saveGoal() {
  if (saving.value || !stats.value) return
  const newGoal = Math.max(1, Math.min(366, Math.round(goalInput.value) || 1))
  const prevGoal = stats.value.goal_days ?? null
  saving.value = true

  // Optimistic: flip the hero immediately, revert on failure.
  stats.value = { ...stats.value, goal_days: newGoal }
  editingGoal.value = false

  const token = await getToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${apiBase}/api/v1/me/calendar-prefs`, {
    method: 'PATCH', headers, body: JSON.stringify({ season_goal_days: newGoal }),
  }).catch(() => null)
  saving.value = false

  if (!res?.ok) {
    if (stats.value) stats.value = { ...stats.value, goal_days: prevGoal }
    toast.add({ title: 'Could not update goal', color: 'error' })
    return
  }
  toast.add({ title: 'Season goal updated', color: 'success' })
  await refresh() // pick up server truth for the currently-viewed year, bypassing the 60s cache
}
</script>
