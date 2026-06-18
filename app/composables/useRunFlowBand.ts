import type { FlowBands } from '~/utils/flowBand'
import { bandForCfs as computeBandForCfs, flowStatusForColorKey } from '~/utils/flowBand'

export function useRunFlowBand() {
  const { apiBase } = useRuntimeConfig().public
  const { getToken } = useAuth()
  const cache = reactive<Record<string, FlowBands>>({})

  async function prefetch(slug: string, handle?: string | null) {
    if (slug in cache) return
    try {
      const token = await getToken()
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
      const meRes = await fetch(`${apiBase}/api/v1/me/runs/${slug}/flow-ranges`, { headers })
      if (meRes.ok) { cache[slug] = await meRes.json(); return }
      // Not the caller's own run — fall back to public handle-scoped endpoint.
      if (handle) {
        const pubRes = await fetch(`${apiBase}/api/v1/users/${handle}/runs/${slug}/flow-ranges`)
        if (pubRes.ok) cache[slug] = await pubRes.json()
      }
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
