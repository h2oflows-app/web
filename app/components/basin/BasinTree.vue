<template>
  <div ref="container" class="relative w-full overflow-hidden select-none">
    <!-- Zoom buttons -->
    <div class="absolute top-2 right-2 z-10 flex flex-col gap-1">
      <button
        class="w-7 h-7 flex items-center justify-center rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors shadow-sm text-base leading-none"
        title="Zoom in"
        @click="zoomBy(1.35)"
      >+</button>
      <button
        class="w-7 h-7 flex items-center justify-center rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors shadow-sm text-base leading-none"
        title="Zoom out"
        @click="zoomBy(1 / 1.35)"
      >−</button>
      <button
        class="w-7 h-7 flex items-center justify-center rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors shadow-sm text-xs leading-none"
        title="Reset zoom"
        @click="zoomReset"
      >⊡</button>
    </div>

    <svg
      ref="svgEl"
      :width="layout.width"
      :height="layout.height"
      class="block"
      :style="{ minHeight: '120px', cursor: isPanning ? 'grabbing' : 'grab' }"
      @wheel.prevent
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <g :transform="`translate(${tx},${ty}) scale(${scale})`">
        <!-- Links -->
        <path
          v-for="(link, i) in layout.links"
          :key="`l${i}`"
          :d="link"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          class="text-neutral-300 dark:text-neutral-600"
        />

        <!-- Nodes -->
        <g
          v-for="node in layout.nodes"
          :key="node.id"
          :transform="`translate(${node.sx},${node.sy})`"
          :style="node.isLeaf ? 'cursor:pointer' : undefined"
          @click="node.isLeaf ? emit('select', node.slug!) : undefined"
        >
          <!-- Leaf -->
          <template v-if="node.isLeaf">
            <circle
              :r="5"
              :fill="node.slug === selectedSlug ? '#3b82f6' : isDark ? '#d1d5db' : '#374151'"
              stroke="none"
            />
            <text
              x="10" dy="0.35em"
              :font-size="11" :font-family="'ui-monospace, monospace'"
              :font-weight="node.slug === selectedSlug ? 700 : 400"
              :fill="node.slug === selectedSlug ? '#3b82f6' : isDark ? '#d1d5db' : '#374151'"
            >{{ node.label }}</text>
            <text
              x="10" dy="1.5em"
              :font-size="10" font-family="ui-sans-serif, sans-serif"
              :fill="isDark ? '#9ca3af' : '#6b7280'"
            >{{ node.name }}</text>
          </template>
          <!-- Internal river group -->
          <template v-else-if="node.depth > 0">
            <circle :r="3" :fill="isDark ? '#4b5563' : '#d1d5db'" stroke="none" />
            <text
              x="-8" dy="0.35em" text-anchor="end"
              :font-size="11" font-family="ui-sans-serif, sans-serif"
              :fill="isDark ? '#9ca3af' : '#6b7280'"
            >{{ node.name }}</text>
          </template>
          <!-- Root (basin) -->
          <template v-else>
            <circle :r="4" :fill="isDark ? '#6b7280' : '#9ca3af'" stroke="none" />
            <text
              x="-10" dy="0.35em" text-anchor="end"
              :font-size="12" font-weight="600" font-family="ui-sans-serif, sans-serif"
              :fill="isDark ? '#e5e7eb' : '#374151'"
            >{{ node.name }}</text>
          </template>
        </g>
      </g>
    </svg>

    <p v-if="layout.nodes.length === 0 && reaches.length > 0" class="text-sm text-neutral-400 italic py-2">
      Building tree…
    </p>
    <p v-else-if="layout.nodes.length === 0" class="text-sm text-neutral-400 italic py-2">
      No reaches loaded yet.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { hierarchy, tree } from 'd3-hierarchy'
import { linkHorizontal } from 'd3-shape'
import type { BasinReach } from './BasinMap.vue'

const props = defineProps<{
  reaches:      BasinReach[]
  basinName?:   string | null
  selectedSlug?: string | null
}>()

const emit = defineEmits<{ (e: 'select', slug: string): void }>()

const isDark = typeof window !== 'undefined'
  && window.matchMedia('(prefers-color-scheme: dark)').matches

// ── Zoom / pan state ──────────────────────────────────────────────────────────

const scale = ref(1)
const tx    = ref(0)
const ty    = ref(0)
const MIN_SCALE = 0.25
const MAX_SCALE = 4

const svgEl    = ref<SVGSVGElement | null>(null)
const container = ref<HTMLElement | null>(null)
const isPanning = ref(false)

function clampScale(s: number) { return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s)) }

function zoomBy(factor: number, cx?: number, cy?: number) {
  const newScale = clampScale(scale.value * factor)
  const ratio = newScale / scale.value
  // zoom toward cursor or SVG center
  const ox = cx ?? layout.value.width  / 2
  const oy = cy ?? layout.value.height / 2
  tx.value = ox - ratio * (ox - tx.value)
  ty.value = oy - ratio * (oy - ty.value)
  scale.value = newScale
}

function zoomReset() {
  scale.value = 1
  tx.value = 0
  ty.value = 0
}

// ── Pointer drag / pinch ─────────────────────────────────────────────────────

interface ActivePointer { id: number; x: number; y: number }
const pointers = ref<ActivePointer[]>([])
let lastPinchDist = 0

function onPointerDown(e: PointerEvent) {
  ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  pointers.value = [...pointers.value, { id: e.pointerId, x: e.clientX, y: e.clientY }]
  if (pointers.value.length === 1) isPanning.value = true
  if (pointers.value.length === 2) {
    lastPinchDist = pinchDist()
  }
}

function onPointerMove(e: PointerEvent) {
  const idx = pointers.value.findIndex(p => p.id === e.pointerId)
  if (idx === -1) return
  const prev = pointers.value[idx]!

  if (pointers.value.length === 1 && isPanning.value) {
    tx.value += e.clientX - prev.x
    ty.value += e.clientY - prev.y
  } else if (pointers.value.length === 2) {
    const other = pointers.value[idx === 0 ? 1 : 0]!
    const updated = [...pointers.value]
    updated[idx] = { id: e.pointerId, x: e.clientX, y: e.clientY }
    const newDist = Math.hypot(
      updated[0]!.x - updated[1]!.x,
      updated[0]!.y - updated[1]!.y,
    )
    if (lastPinchDist > 0) {
      const mid = midpoint(updated[0]!, updated[1]!)
      const rect = svgEl.value!.getBoundingClientRect()
      zoomBy(newDist / lastPinchDist, mid.x - rect.left, mid.y - rect.top)
    }
    lastPinchDist = newDist
  }

  pointers.value = pointers.value.map(p =>
    p.id === e.pointerId ? { ...p, x: e.clientX, y: e.clientY } : p,
  )
}

function onPointerUp(e: PointerEvent) {
  pointers.value = pointers.value.filter(p => p.id !== e.pointerId)
  if (pointers.value.length < 2) lastPinchDist = 0
  if (pointers.value.length === 0) isPanning.value = false
}

function pinchDist() {
  if (pointers.value.length < 2) return 0
  return Math.hypot(
    pointers.value[0]!.x - pointers.value[1]!.x,
    pointers.value[0]!.y - pointers.value[1]!.y,
  )
}
function midpoint(a: ActivePointer, b: ActivePointer) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

// ── Tree data ─────────────────────────────────────────────────────────────────

interface TreeNode {
  name:     string
  slug?:    string
  label?:   string
  children?: TreeNode[]
}

const treeData = computed<TreeNode>(() => {
  const riverMap = new Map<string, BasinReach[]>()
  for (const r of props.reaches) {
    const river = r.river_name ?? 'Unknown River'
    if (!riverMap.has(river)) riverMap.set(river, [])
    riverMap.get(river)!.push(r)
  }

  for (const reaches of riverMap.values()) {
    reaches.sort((a, b) => {
      if (a.river_order != null && b.river_order != null) return a.river_order - b.river_order
      if (a.river_order != null) return -1
      if (b.river_order != null) return 1
      return a.slug.localeCompare(b.slug)
    })
  }

  const rivers = [...riverMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([river, reaches]) => ({
      name: river,
      children: reaches.map(r => ({
        name:  r.common_name ?? r.name,
        slug:  r.slug,
        label: r.anchor_comid ?? r.start_comid ?? r.slug,
      })),
    }))

  const rootName = props.basinName ? `${props.basinName} Basin` : 'Basin'
  return { name: rootName, children: rivers }
})

// ── Layout constants ──────────────────────────────────────────────────────────

const H_LEVEL_W   = 180
const H_NODE_H    = 36
const H_LABEL_W   = 220
const PAD         = 24
const H_ROOT_PAD  = 110

interface LayoutNode {
  id:     string
  depth:  number
  isLeaf: boolean
  slug?:  string
  name:   string
  label?: string
  sx:     number
  sy:     number
}

// ── Computed layout ───────────────────────────────────────────────────────────

const layout = computed(() => {
  const root = hierarchy<TreeNode>(treeData.value)
  if (root.leaves().length === 0) return { nodes: [], links: [], width: 400, height: 200 }

  const treeLayout = tree<TreeNode>().nodeSize([H_NODE_H, H_LEVEL_W])
  treeLayout(root)

  let minX = Infinity, maxX = -Infinity
  root.each(n => {
    minX = Math.min(minX, (n as any).x)
    maxX = Math.max(maxX, (n as any).x)
  })

  const svgH   = maxX - minX + H_NODE_H + PAD * 2
  const svgW   = H_ROOT_PAD + (root.height + 1) * H_LEVEL_W + H_LABEL_W + PAD * 2
  const shiftY = -minX + PAD
  const offX   = PAD + H_ROOT_PAD

  const linkGen = linkHorizontal<any, any>()
    .x((d: any) => d.y + offX)
    .y((d: any) => d.x + shiftY)

  const links = root.links().map(l => linkGen(l) ?? '')

  const nodes: LayoutNode[] = root.descendants().map(n => {
    const d = n as any
    return {
      id: n.data.slug ?? n.data.name, depth: n.depth,
      isLeaf: !n.children, slug: n.data.slug,
      name: n.data.name, label: n.data.label,
      sx: d.y + offX, sy: d.x + shiftY,
    }
  })

  return { nodes, links, width: svgW, height: svgH }
})
</script>
