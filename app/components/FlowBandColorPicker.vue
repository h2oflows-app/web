<template>
  <!-- Trigger: circular swatch showing current color -->
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
          v-for="hue in HUES"
          :key="hue"
          class="flex gap-1"
        >
          <button
            v-for="level in LEVELS"
            :key="level"
            type="button"
            class="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none"
            :class="modelValue === `${hue}-${level}`
              ? 'border-neutral-800 dark:border-white scale-110'
              : 'border-white dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-500'"
            :style="{ backgroundColor: COLOR_KEY_HEX[`${hue}-${level}`] }"
            :aria-label="`${hue}-${level}`"
            :aria-pressed="modelValue === `${hue}-${level}`"
            @click="select(`${hue}-${level}`)"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { COLOR_KEY_HEX, colorKeyToHex } from '~/utils/flowBand'

const HUES = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'neutral'] as const
const LEVELS = [1, 2, 3, 4, 5] as const

// swatch size 24px + gap 4px = 28px per cell; padding 8px each side
const POP_W = LEVELS.length * 28 + 16
const POP_H = HUES.length * 28 + 16

const props = defineProps<{
  modelValue: string
}>()
const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const open = ref(false)
const pos = ref<{ top: number; left: number } | null>(null)
const triggerRef = ref<HTMLElement | null>(null)

const currentHex = computed(() => colorKeyToHex(props.modelValue))

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

function select(key: string) {
  emit('update:modelValue', key)
  open.value = false
}

function onDocClick() {
  open.value = false
}

onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))
</script>
