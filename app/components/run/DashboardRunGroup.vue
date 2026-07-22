<template>
  <!-- ─── LIST density — divider rows inside one shared bordered box ────────── -->
  <div
    v-if="density === 'list'"
    class="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden"
  >
    <RunRow
      v-for="reach in reaches"
      :key="`${reach.id}::${reach.contextReachSlug}`"
      :vm="watchedGaugeToRunRowVM(reach)"
      view-mode="list"
      show-view
      :show-river="showRiverName"
      live-flow
      @open="$emit('open', reach, 'reach')"
      @remove="$emit('remove', reach)"
    />
  </div>

  <!-- ─── CARD densities — one standalone card per reach (parent grids them) ── -->
  <template v-else>
    <RunRow
      v-for="reach in reaches"
      :key="`${reach.id}::${reach.contextReachSlug}`"
      :vm="watchedGaugeToRunRowVM(reach)"
      :view-mode="density === 'full' ? 'full' : 'comfortable'"
      show-owner-right
      :show-river="showRiverName"
      live-flow
      @open="$emit('open', reach, 'reach')"
      @remove="$emit('remove', reach)"
    />
  </template>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import type { WatchedGauge } from '~/stores/watchlist'
import { watchedGaugeToRunRowVM } from '~/utils/runRow'

const props = defineProps<{
  reaches: WatchedGauge[]
  density?: 'comfortable' | 'full' | 'list'
  showRiverName?: boolean
}>()

defineEmits<{
  (e: 'open', gauge: WatchedGauge, mode: 'gauge' | 'reach'): void
  (e: 'remove', gauge: WatchedGauge): void
}>()

// Prefetch each reach's flow-ranges into the shared useRunFlowBand cache so the
// child <RunRow>s can resolve threshold bands.
const { prefetch } = useRunFlowBand()

function prefetchAll() {
  for (const r of props.reaches) {
    if (r.contextReachSlug) prefetch(r.contextReachSlug, r.contextReachAuthorHandle)
  }
}

onMounted(prefetchAll)
watch(() => props.reaches, prefetchAll)
</script>
