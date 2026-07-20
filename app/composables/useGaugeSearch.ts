/**
 * useGaugeSearch — shared state for the GaugeSearchModal.
 *
 * The modal lives in dashboard.vue, but MobileTabBar.vue is mounted globally
 * in app.vue (outside the page tree) and needs to trigger it too. Uses
 * useState so the ref is shared across all callers (same key per SSR context).
 */
export function useGaugeSearch() {
  const isOpen = useState('gauge-search:open', () => false)
  const initialTab = useState<'mine' | 'discover'>('gauge-search:tab', () => 'mine')

  function open(tab: 'mine' | 'discover' = 'discover') {
    initialTab.value = tab
    isOpen.value = true
  }
  function close() { isOpen.value = false }

  return { isOpen, initialTab, open, close }
}
