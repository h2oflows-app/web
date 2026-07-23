/**
 * useCreateMenu — shared state for the CreateChooserSheet (the tab-bar "+" FAB menu).
 *
 * MobileTabBar.vue is mounted globally in app.vue (outside the page tree) and
 * needs to trigger the sheet; the sheet itself lives in AppCreateOverlay.vue,
 * also mounted globally. Uses useState (mirrors useGaugeSearch) so the ref is
 * shared across every caller (same key per SSR context).
 */
export function useCreateMenu() {
  const isOpen = useState('create-menu:open', () => false)

  function open() { isOpen.value = true }
  function close() { isOpen.value = false }

  return { isOpen, open, close }
}
