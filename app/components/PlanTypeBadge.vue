<template>
  <span
    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
    :class="meta.badgeClass"
  >
    <span class="w-1.5 h-1.5 rounded-full" :class="meta.dotClass" />
    {{ meta.label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { planTypeMeta } from '~/utils/planType'

const props = defineProps<{ type: string }>()
const meta = computed(() => planTypeMeta(props.type))
</script>
