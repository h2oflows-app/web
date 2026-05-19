<template>
  <div ref="container" class="relative w-full overflow-hidden select-none">
    <!-- Zoom buttons -->
    <div v-if="layout.nodes.length > 0" class="absolute top-2 right-2 z-10 flex flex-col gap-1">
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
      v-if="layout.nodes.length > 0"
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
          @click="node.isLeaf && node.leaf ? emit('select', node.leaf) : undefined"
        >
          <!-- Leaf -->
          <template v-if="node.isLeaf && node.leaf">
            <circle
              :r="5"
              :fill="node.leaf.type === 'user_reach'
                ? (isDark ? '#a3e635' : '#65a30d')
                : node.leaf.type === 'custom_gauge'
                  ? (isDark ? '#f472b6' : '#db2777')
                  : (isDark ? '#d1d5db' : '#374151')"
              stroke="none"
            />
            <text
              x="10" dy="0.35em"
              :font-size="11" font-family="ui-monospace, monospace"
              font-weight="400"
              :fill="isDark ? '#d1d5db' : '#374151'"
            >{{ node.label }}</text>
            <text
              x="10" dy="1.5em"
              :font-size="10" font-family="ui-sans-serif, sans-serif"
              :fill="isDark ? '#9ca3af' : '#6b7280'"
            >{{ node.name }}</text>
          </template>
          <!-- River node (depth === 2) -->
          <template v-else-if="node.depth === 2">
            <circle :r="3" :fill="isDark ? '#4b5563' : '#d1d5db'" stroke="none" />
            <text
              x="-8" dy="0.35em" text-anchor="end"
              :font-size="11" font-family="ui-sans-serif, sans-serif"
              :fill="isDark ? '#9ca3af' : '#6b7280'"
            >{{ node.name }}</text>
          </template>
          <!-- Basin node (depth === 1) -->
          <template v-else-if="node.depth === 1">
            <circle :r="4" :fill="isDark ? '#6b7280' : '#9ca3af'" stroke="none" />
            <text
              x="-10" dy="0.35em" text-anchor="end"
              :font-size="12" font-weight="600" font-family="ui-sans-serif, sans-serif"
              :fill="isDark ? '#e5e7eb' : '#374151'"
            >{{ node.name }}</text>
          </template>
          <!-- Root (depth === 0) -->
          <template v-else>
            <circle :r="4" :fill="isDark ? '#6b7280' : '#9ca3af'" stroke="none" />
            <text
              x="-10" dy="0.35em" text-anchor="end"
              :font-size="13" font-weight="700" font-family="ui-sans-serif, sans-serif"
              :fill="isDark ? '#f3f4f6' : '#111827'"
            >{{ node.name }}</text>
          </template>
        </g>
      </g>
    </svg>

    <p v-else-if="filteredLeaves.length > 0" class="text-sm text-neutral-400 italic py-2">
      Building tree…
    </p>
    <p v-else class="text-sm text-neutral-400 italic py-4">
      Add gauges or reaches to your dashboard to see them mapped here.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { hierarchy, tree } from 'd3-hierarchy'
import { linkHorizontal } from 'd3-shape'

export interface DashboardLeaf {
  id: string
  type: 'gauge' | 'user_reach' | 'custom_gauge'
  slug: string
  label: string
  name: string
  basinGroup: string
  riverName: string
  riverOrder: number | null
  centerLng: number | null
}

const props = defineProps<{
  leaves: DashboardLeaf[]
  /** Restrict the tree to a single basin group; omit to show all. */
  scopeBasin?: string | null
}>()

const emit = defineEmits<{ (e: 'select', leaf: DashboardLeaf): void }>()

const container = ref<HTMLElement | null>(null)
const svgEl     = ref<SVGSVGElement | null>(null)

const filteredLeaves = computed(() => {
  if (!props.scopeBasin) return props.leaves
  return props.leaves.filter(l => l.basinGroup === props.scopeBasin)
})

const isDark = typeof window !== 'undefined'
  && window.matchMedia('(prefers-color-scheme: dark)').matches

// ── Tree data ─────────────────────────────────────────────────────────────────

interface TreeNode {
  name:    string
  id?:     string
  label?:  string
  leafRef?: DashboardLeaf
  children?: TreeNode[]
}

const treeData = computed<TreeNode>(() => {
  // basin → river → leaf[]
  const basinMap = new Map<string, Map<string, DashboardLeaf[]>>()

  for (const leaf of filteredLeaves.value) {
    if (!basinMap.has(leaf.basinGroup)) basinMap.set(leaf.basinGroup, new Map())
    const riverMap = basinMap.get(leaf.basinGroup)!
    if (!riverMap.has(leaf.riverName)) riverMap.set(leaf.riverName, [])
    riverMap.get(leaf.riverName)!.push(leaf)
  }

  // Sort leaves within each river: riverOrder → centerLng → slug
  for (const riverMap of basinMap.values()) {
    for (const leaves of riverMap.values()) {
      leaves.sort((a, b) => {
        if (a.riverOrder != null && b.riverOrder != null) return a.riverOrder - b.riverOrder
        if (a.riverOrder != null) return -1
        if (b.riverOrder != null) return 1
        if (a.centerLng != null && b.centerLng != null) return a.centerLng - b.centerLng
        if (a.centerLng != null) return -1
        if (b.centerLng != null) return 1
        return a.slug.localeCompare(b.slug)
      })
    }
  }

  const basins = [...basinMap.entries()]
    .sort(([a], [b]) => a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b))
    .map(([basin, riverMap]) => {
      const rivers = [...riverMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([river, leaves]) => ({
          name: river,
          children: leaves.map(leaf => ({
            name:    leaf.name,
            id:      leaf.id,
            label:   leaf.label,
            leafRef: leaf,
          })),
        }))
      return { name: basin, children: rivers }
    })

  return { name: 'Dashboard', children: basins }
})

// ── Layout constants ──────────────────────────────────────────────────────────

const H_LEVEL_W  = 180
const H_NODE_H   = 36
const H_LABEL_W  = 220
const PAD        = 24
const H_ROOT_PAD = 110

interface LayoutNode {
  id:     string
  depth:  number
  isLeaf: boolean
  leaf?:  DashboardLeaf
  name:   string
  label?: string
  sx:     number
  sy:     number
}

// ── Computed layout ───────────────────────────────────────────────────────────

const layout = computed(() => {
  const root = hierarchy<TreeNode>(treeData.value)
  if (root.leaves().length === 0) return { nodes: [], links: [], width: 0, height: 0 }

  const treeLayout = tree<TreeNode>().nodeSize([H_NODE_H, H_LEVEL_W])
  treeLayout(root)

  let minX = Infinity, maxX = -Infinity
  root.each(n => {
    minX = Math.min(minX, (n as any).x)
    maxX = Math.max(maxX, (n as any).x)
  })

  const svgH  = maxX - minX + H_NODE_H + PAD * 2
  const svgW  = H_ROOT_PAD + (root.height + 1) * H_LEVEL_W + H_LABEL_W + PAD * 2
  const shiftY = -minX + PAD
  const offX   = PAD + H_ROOT_PAD

  const linkGen = linkHorizontal<any, any>()
    .x((d: any) => d.y + offX)
    .y((d: any) => d.x + shiftY)

  const links = root.links().map(l => linkGen(l) ?? '')

  const nodes: LayoutNode[] = root.descendants().map(n => {
    const d = n as any
    return {
      id:     n.data.id ?? n.data.name,
      depth:  n.depth,
      isLeaf: !n.children,
      leaf:   n.data.leafRef,
      name:   n.data.name,
      label:  n.data.label,
      sx:     d.y + offX,
      sy:     d.x + shiftY,
    }
  })

  return { nodes, links, width: svgW, height: svgH }
})

// ── Zoom / pan / pinch — shared composable ────────────────────────────────────
const layoutWidth  = computed(() => layout.value.width)
const layoutHeight = computed(() => layout.value.height)
const {
  scale, tx, ty, isPanning,
  zoomBy, zoomReset,
  onPointerDown, onPointerMove, onPointerUp,
} = useDendrogramZoom({ width: layoutWidth, height: layoutHeight, svgEl })
</script>
