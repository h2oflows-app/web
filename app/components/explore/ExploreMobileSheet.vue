<template>
  <div
    ref="sheetEl"
    class="sm:hidden fixed inset-x-0 z-20 flex flex-col rounded-t-2xl bg-white dark:bg-neutral-950 border-t border-x border-neutral-200 dark:border-neutral-800 shadow-[0_-8px_30px_-10px_rgba(0,0,0,0.28)]"
    :style="sheetStyle"
  >
    <!-- Grab handle + header: the drag surface -->
    <div
      class="shrink-0 touch-none select-none cursor-grab"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <div class="mx-auto mt-2 h-1 w-10 rounded-full bg-neutral-300 dark:bg-neutral-700" />
      <div class="px-4 pt-2 pb-2 flex items-center justify-between gap-2">
        <span class="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 truncate">{{ title }}</span>
        <slot name="header-right" />
      </div>
    </div>

    <!-- Content (scrolls natively; drag only from the handle/header) -->
    <div class="flex-1 min-h-0 overflow-hidden flex flex-col">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect, onMounted, onUnmounted } from 'vue'
import { clampOffset, snapTarget, type DetentName, type Detents } from '~/utils/detent'

// Hand-rolled 3-detent bottom sheet for explore mobile (web#335). No sheet
// primitive exists in the repo (CreateChooserSheet & co. are static slide-ups)
// — mechanics live here, pure snap math in utils/detent.ts. The sheet rides
// above MobileTabBar; drag is confined to the handle/header so the list keeps
// native scrolling.
const props = withDefaults(defineProps<{
  title: string
  /** Height of the peek detent's visible portion, px. */
  peekHeight?: number
  /** Visible sliver in the hidden detent, px. */
  hiddenHeight?: number
}>(), { peekHeight: 224, hiddenHeight: 48 })

const detent = defineModel<DetentName>('detent', { default: 'peek' })

// Sheet geometry. Height leaves ~11rem of map visible when expanded, and the
// whole sheet sits above the tab bar (h-14 + safe area).
const TABBAR_OFFSET = 'calc(3.5rem + env(safe-area-inset-bottom))'
const sheetEl = ref<HTMLElement | null>(null)
const sheetHeight = ref(0)

function measure() {
  sheetHeight.value = sheetEl.value?.offsetHeight ?? 0
}
onMounted(() => {
  measure()
  window.addEventListener('resize', measure)
})
onUnmounted(() => window.removeEventListener('resize', measure))

const detents = computed((): Detents => ({
  expanded: 0,
  peek: Math.max(0, sheetHeight.value - props.peekHeight),
  hidden: Math.max(0, sheetHeight.value - props.hiddenHeight),
}))

// Current translateY offset; live-follows the finger during a drag, snaps
// (with transition) otherwise.
const offset = ref(0)
const dragging = ref(false)

watchEffect(() => {
  if (!dragging.value) offset.value = detents.value[detent.value ?? 'peek']
})

const sheetStyle = computed(() => ({
  bottom: TABBAR_OFFSET,
  height: 'min(75dvh, calc(100dvh - 11rem))',
  transform: `translateY(${offset.value}px)`,
  transition: dragging.value ? 'none' : 'transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)',
}))

let startY = 0
let startOffset = 0
let lastY = 0
let lastT = 0
let velocity = 0

function onPointerDown(e: PointerEvent) {
  dragging.value = true
  startY = lastY = e.clientY
  startOffset = offset.value
  lastT = e.timeStamp
  velocity = 0
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value) return
  const dt = e.timeStamp - lastT
  if (dt > 0) velocity = (e.clientY - lastY) / dt
  lastY = e.clientY
  lastT = e.timeStamp
  offset.value = clampOffset(startOffset + (e.clientY - startY), detents.value)
}

function onPointerUp() {
  if (!dragging.value) return
  dragging.value = false
  detent.value = snapTarget(offset.value, velocity, detents.value)
  offset.value = detents.value[detent.value]
}

defineExpose({
  snapTo(name: DetentName) { detent.value = name },
})
</script>
