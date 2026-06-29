/**
 * v-swipe-remove directive
 *
 * Attaches touchstart/touchmove/touchend listeners to an element WITHOUT
 * restructuring its markup. Fires the provided callback on a deliberate
 * left-swipe past a threshold (~64px), but only when the gesture is
 * horizontally dominant (so vertical scrolling is not hijacked).
 *
 * Usage:
 *   v-swipe-remove="() => removeUserReach(r)"
 *
 * The callback receives no arguments; the caller is responsible for
 * identifying which item to remove.
 */

import type { Directive } from 'vue'

interface SwipeState {
  startX: number
  startY: number
  /** Whether we've committed to a horizontal swipe (vs vertical scroll) */
  horizontal: boolean | null
  onRemove: () => void
}

const THRESHOLD = 64         // px left-swipe to trigger removal
const LOCK_ANGLE = 30        // degrees — gesture must be within this of horizontal

const stateMap = new WeakMap<HTMLElement, SwipeState>()

function onTouchStart(this: HTMLElement, e: TouchEvent) {
  const t = e.touches[0]
  if (!t) return
  const state = stateMap.get(this)
  if (!state) return
  state.startX = t.clientX
  state.startY = t.clientY
  state.horizontal = null
}

function onTouchMove(this: HTMLElement, e: TouchEvent) {
  const t = e.touches[0]
  if (!t) return
  const state = stateMap.get(this)
  if (!state) return

  const dx = state.startX - t.clientX   // positive = leftward
  const dy = Math.abs(t.clientY - state.startY)

  // Determine gesture direction on first significant movement
  if (state.horizontal === null && (Math.abs(dx) > 4 || dy > 4)) {
    const angle = Math.atan2(dy, Math.abs(dx)) * (180 / Math.PI)
    state.horizontal = angle < LOCK_ANGLE
  }

  // If horizontal swipe confirmed: suppress scroll so the swipe feels natural
  if (state.horizontal) {
    e.preventDefault()
  }
}

function onTouchEnd(this: HTMLElement, e: TouchEvent) {
  const t = e.changedTouches[0]
  if (!t) return
  const state = stateMap.get(this)
  if (!state || !state.horizontal) return

  const dx = state.startX - t.clientX  // positive = leftward
  if (dx >= THRESHOLD) {
    // Stop the click from firing on the row (the click handler opens the modal)
    e.preventDefault()
    state.onRemove()
  }
  state.horizontal = null
}

export const vSwipeRemove: Directive<HTMLElement, () => void> = {
  mounted(el, binding) {
    const state: SwipeState = {
      startX: 0,
      startY: 0,
      horizontal: null,
      onRemove: binding.value,
    }
    stateMap.set(el, state)
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: false })
  },

  updated(el, binding) {
    const state = stateMap.get(el)
    if (state) state.onRemove = binding.value
  },

  unmounted(el) {
    el.removeEventListener('touchstart', onTouchStart)
    el.removeEventListener('touchmove', onTouchMove)
    el.removeEventListener('touchend', onTouchEnd)
    stateMap.delete(el)
  },
}
