<template>
  <!-- Trigger: circular swatch showing current color (theme-tinted) -->
  <button
    ref="triggerRef"
    type="button"
    class="w-6 h-6 rounded-full border-2 border-white dark:border-neutral-700 ring-1 ring-neutral-300 dark:ring-neutral-600 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-neutral-400"
    :style="{ backgroundColor: currentHex }"
    :aria-label="`Color: ${modelValue}. Click to change.`"
    :title="modelValue"
    @click.stop="toggle"
  />

  <!-- Popover — teleported to body so it escapes overflow containers (V3) -->
  <Teleport to="body">
    <div
      v-if="open && pos"
      :style="{ position: 'fixed', top: `${pos.top}px`, left: `${pos.left}px` }"
      class="z-50 p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-xl"
      role="dialog"
      aria-label="Flow band color picker"
      @click.stop
    >
      <div class="flex flex-col gap-1">
        <div
          v-for="(family, fi) in FAMILIES"
          :key="family"
          class="flex gap-1"
        >
          <button
            v-for="li in [0,1,2,3,4]"
            :key="li"
            type="button"
            class="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none"
            :class="selectedIndex === fi * 5 + li
              ? 'border-neutral-800 dark:border-white scale-110'
              : 'border-white dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-500'"
            :style="{ backgroundColor: palette[fi * 5 + li] }"
            :aria-label="`${family} level ${li + 1}`"
            :aria-pressed="selectedIndex === fi * 5 + li"
            @click="select(fi * 5 + li)"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { FAMILIES, themePalette, valueToIndex, indexToValue, activePrimaryRef } from '~/utils/flowPalette'
import { colorKeyToHex } from '~/utils/flowBand'
import { useThemeStore } from '~/stores/theme'

// 5 columns × 24px + 4px gap = 28px each; padding 8px each side
const POP_W = 5 * 28 + 16
const POP_H = 5 * 28 + 16

const props = defineProps<{
  modelValue: string
}>()
const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const themeStore = useThemeStore()

// Recompute palette whenever theme changes (activePrimaryRef drives this).
// We also depend on themeStore.themeId to force reactivity through the store.
const palette = computed(() => {
  // Reference themeStore.themeId so computed re-runs on theme switch.
  void themeStore.themeId
  // activePrimaryRef.value is set by the theme plugin watcher.
  return themePalette(activePrimaryRef.value)
})

const selectedIndex = computed(() => valueToIndex(props.modelValue))

// Trigger swatch: use colorKeyToHex which now routes through flowColorHex.
const currentHex = computed(() => colorKeyToHex(props.modelValue))

const open = ref(false)
const pos = ref<{ top: number; left: number } | null>(null)
const triggerRef = ref<HTMLElement | null>(null)

function toggle() {
  if (open.value) {
    open.value = false
    return
  }
  const btn = triggerRef.value
  if (!btn) return
  const rect = btn.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  const top = spaceBelow < POP_H + 8 ? rect.top - POP_H - 4 : rect.bottom + 4
  const left = Math.min(rect.left, window.innerWidth - POP_W - 8)
  pos.value = { top: Math.max(8, top), left: Math.max(8, left) }
  open.value = true
}

function select(index: number) {
  emit('update:modelValue', indexToValue(index))
  open.value = false
}

function onDocClick() {
  open.value = false
}

onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))
</script>
