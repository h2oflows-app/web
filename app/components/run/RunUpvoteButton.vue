<template>
  <button
    class="inline-flex items-center gap-1 rounded-md border transition-colors"
    :class="[
      sizeClasses,
      upvotedLocal
        ? 'bg-primary-50 dark:bg-primary-950 border-primary-300 dark:border-primary-700 text-primary-600 dark:text-primary-400'
        : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-primary-300 hover:text-primary-600 dark:hover:text-primary-400',
      (loading || !canUpvote) ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
    ]"
    :disabled="loading || !canUpvote"
    :title="canUpvote ? (upvotedLocal ? 'Remove upvote' : 'Upvote this run') : 'Sign in to upvote'"
    @click.stop="toggle"
  >
    <svg :class="iconClass" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/>
      <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/>
    </svg>
    <span>{{ countLocal }}</span>
  </button>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = withDefaults(defineProps<{
  runId: string
  count: number
  upvoted: boolean
  size?: 'sm' | 'md'
}>(), { size: 'sm' })

const emit = defineEmits<{
  (e: 'update:count', count: number): void
  (e: 'update:upvoted', upvoted: boolean): void
}>()

const { isAuthenticated, getToken } = useAuth()
const { apiBase } = useRuntimeConfig().public

const upvotedLocal = ref(props.upvoted)
const countLocal = ref(props.count)
const loading = ref(false)

watch(() => props.upvoted, v => { upvotedLocal.value = v })
watch(() => props.count,   v => { countLocal.value = v })

const canUpvote = computed(() => isAuthenticated.value)

const sizeClasses = computed(() => props.size === 'md'
  ? 'px-2.5 py-1.5 text-sm font-medium'
  : 'px-1.5 py-0.5 text-xs font-medium'
)
const iconClass = computed(() => props.size === 'md' ? 'w-4 h-4' : 'w-3 h-3')

async function toggle() {
  if (!canUpvote.value || loading.value) return
  const token = await getToken()
  if (!token) return
  // Optimistic update
  const wasUpvoted = upvotedLocal.value
  const wasCount = countLocal.value
  upvotedLocal.value = !wasUpvoted
  countLocal.value = wasUpvoted ? wasCount - 1 : wasCount + 1
  loading.value = true
  try {
    const res = await fetch(`${apiBase}/api/v1/user-runs/${props.runId}/upvote`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error('upvote failed')
    const data = await res.json()
    upvotedLocal.value = data.upvoted
    countLocal.value = data.upvote_count
    emit('update:count', data.upvote_count)
    emit('update:upvoted', data.upvoted)
  } catch {
    // Revert optimistic
    upvotedLocal.value = wasUpvoted
    countLocal.value = wasCount
  } finally {
    loading.value = false
  }
}
</script>
