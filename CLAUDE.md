# h2oflows-app/web — Claude Code Guide

## Repo layout

```
app/
  pages/
    index.vue             Landing page + global AI ask
    dashboard.vue         Gauge watchlist dashboard
    explore.vue           Reach browse + map
    reaches/[slug].vue    Reach detail page
    reports/              Trip reports
    basin/                Basin-grouped reach lists
    rivers.vue            River index
    admin.vue             Admin reach authoring (NHD Explorer)
    login.vue             Auth flow
  components/
    map/                  DashboardMap, ReachesMap, ReachMap, NHDExplorerMap (MapLibre)
    gauge/                GaugeCard, GaugeGraph, GaugeSparkline
    reach/                ReachCard, ReachDetailPanel, RapidsList
    trip/                 TripReportCard, TripForm
    ui/                   Shared UI components
    AppHeader.vue         h-[50px]; sticky bars below use top-12.75 (TW v4)
    MobileTabBar.vue      Bottom nav (mobile)
  composables/
    useAuth.ts
    useWatchlistSync.ts
    useWatchlistRefresh.ts
    useGaugeGraph.ts
  stores/
    watchlist.ts          Pinia — localStorage persistence (not cookies)
assets/
public/
app.config.ts
nuxt.config.ts

.claude/memory/           persistent AI memory (gitignored, local only)
```

## Dev

```sh
npm install
npm run dev   # runs on :3000
```

Requires API on `:8080`. Set `NUXT_PUBLIC_API_URL=http://localhost:8080` in `.env.local`.

## Stack notes

- **MapLibre markers**: use `transition:scale` not `transition:transform` — MapLibre repositions via `transform`, transitioning it causes pins to float/lag during pan/zoom
- **MapLibre layer props**: `line-cap` and `line-join` are layout props, NOT paint — silent failure if misplaced
- **Pinia persistence**: configured as localStorage in `nuxt.config.ts`; cookies have 4KB limit and will silently truncate state
- **Empty states**: gate on `fetchDone` prop, not data length — avoids flash during async fetch window
- **AppHeader height**: `h-[50px]`; sticky bars below must use `top-12.75` (Tailwind v4 syntax)

## Conventions

- API base URL injected via `NUXT_PUBLIC_API_URL` (Netlify env var in prod, `.env.local` locally)
- Reach slugs are the canonical reach identifier — match the API
- Flow difficulty stored as floats (`3.5`), rendered as Roman numerals (`III+`)
- Flow band labels: Too Low / Low / Running / High / Very High — colors in `utils/flowBand.ts`
