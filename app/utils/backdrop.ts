/**
 * Backdrop-dismiss helpers for hand-rolled modals/sheets.
 *
 * The old pattern — `@click.self="close"` on the backdrop — closes on the
 * CLICK event, which the browser dispatches on the common ancestor of
 * mousedown/mouseup targets. Start a drag inside the form (text selection in
 * an input is enough), release over the backdrop, and the sheet closes,
 * eating unsaved changes. These helpers close only when BOTH the press and
 * the release land on the backdrop itself.
 *
 * Usage (replaces `@click.self="close"`):
 *   @pointerdown="backdropDown"
 *   @pointerup="backdropUp($event) && close()"
 *
 * State rides on the element (dataset) so no per-component ref is needed.
 */
export function backdropDown(e: PointerEvent) {
  const el = e.currentTarget as HTMLElement
  el.dataset.backdropArmed = e.target === el ? '1' : ''
}

export function backdropUp(e: PointerEvent): boolean {
  const el = e.currentTarget as HTMLElement
  const armed = el.dataset.backdropArmed === '1'
  el.dataset.backdropArmed = ''
  return armed && e.target === el
}
