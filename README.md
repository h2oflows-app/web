# h2oflows-app/web

Nuxt 4 frontend for the H2OFlows streamflow platform. Gauge dashboard, reach pages, explore map, trip reports, and the AI river assistant.

Deployed on **Netlify**. API backend: [h2oflows-app/api](https://github.com/h2oflows-app/api).

## Environments

| Context | API | Supabase (auth) |
|---|---|---|
| Production | `api.h2oflows.app` | prod project |
| Deploy preview / branch deploy | `api-staging.h2oflows.app` | staging project |

Deploy previews run against the **staging** API + a separate staging Supabase
project, so PR previews never touch production data or auth. Wiring lives in
`netlify.toml` (per-context `NUXT_PUBLIC_API_BASE` / `SUPABASE_URL` / `SUPABASE_KEY`).

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Nuxt 4 |
| UI library | Nuxt UI Pro |
| Styling | Tailwind CSS (via Nuxt UI) |
| Maps | MapLibre GL + vue-maplibre-gl |
| Charts | uPlot (time-series gauge graphs) |
| State | Pinia (localStorage persistence) |
| Auth | Supabase Auth (email, OAuth) |

---

## Running locally

### Prerequisites

- Node 20+ + npm
- A running [h2oflows-app/api](https://github.com/h2oflows-app/api) instance on `:8080`

### Setup

```sh
npm install
cp .env.example .env.local
# Set NUXT_PUBLIC_API_URL=http://localhost:8080
npm run dev
```

Web runs on `:3000`.

---

## Environment variables

| Var | Required | Description |
|---|---|---|
| `NUXT_PUBLIC_API_URL` | yes | API base URL (`http://localhost:8080` locally, Netlify env var in prod) |
| `SUPABASE_URL` | yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | yes | Supabase anon key |

---

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
    AppHeader.vue         Global header
    MobileTabBar.vue      Bottom nav (mobile)
  composables/
    useAuth.ts            Supabase auth state
    useWatchlistSync.ts   Watchlist server sync
    useWatchlistRefresh.ts  Live CFS polling
    useGaugeGraph.ts      uPlot gauge graph setup
  stores/
    watchlist.ts          Pinia — saved gauges (localStorage + server sync)
assets/
public/
app.config.ts             Theme + app config
nuxt.config.ts            Nuxt + Tailwind + Pinia config
```

---

## Key notes

- **MapLibre markers**: use `transition:scale` not `transition:transform` — MapLibre repositions via `transform`, transitioning it causes pins to float during pan/zoom
- **Pinia persistence**: uses localStorage (not cookies) — configured in `nuxt.config.ts`; cookies have a 4KB limit
- **`line-cap` / `line-join`** are MapLibre layout props, not paint props — silent failure if misplaced
- **Empty states**: gate empty-state messages on a `fetchDone` prop, not just data length — avoids flash during async fetch
