import type { FlowBands } from '~/utils/flowBand'
import { bandForCfs as computeBandForCfs, flowStatusForColorKey } from '~/utils/flowBand'

export function useRunFlowBand() {
  const { apiBase } = useRuntimeConfig().public
  const cache = reactive<Record<string, FlowBands>>({})

  async function prefetch(slug: string) {
    if (slug in cache) return
    try {
      const res = await fetch(`${apiBase}/api/v1/reaches/${slug}/flow-ranges`)
      if (res.ok) cache[slug] = await res.json()
    } catch {}
  }

  // V9: highest threshold where cfs >= value; else base. Returns null when no data.
  function bandForCfs(
    slug: string | null | undefined,
    cfs: number | null | undefined,
  ): { label: string; color: string } | null {
    if (!slug || cfs == null) return null
    const bands = cache[slug]
    if (!bands) return null
    return computeBandForCfs(cfs, bands)
  }

  function statusForColor(colorKey: string | null | undefined): string {
    return flowStatusForColorKey(colorKey)
  }

  return { prefetch, bandForCfs, statusForColor }
}
