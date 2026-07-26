/**
 * useRunWizard — shared open-state for the run-creation entry flow
 * (dashboard.vue's GaugeSearchModal @create-run wiring; the old
 * WizardEntryModal consumer was retired in the #246 W7 cutover).
 *
 * The modal is mounted once in AppHeader. Any page can call open() to trigger it.
 * Uses useState so the ref is shared across all callers (same key per SSR context).
 */
export function useRunWizard() {
  const isOpen = useState('run-wizard:open', () => false)

  function open() { isOpen.value = true }
  function close() { isOpen.value = false }

  return { isOpen, open, close }
}
