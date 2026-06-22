// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',

  modules: [
    '@nuxt/ui',
    '@nuxt/fonts',
    '@pinia/nuxt',
    '@pinia-plugin-persistedstate/nuxt',
    '@nuxtjs/supabase',
    '@vite-pwa/nuxt',
  ],

  fonts: {
    families: [
      // Eddy
      { name: 'Comfortaa',          weights: [400, 500, 600, 700] },
      { name: 'Nunito',             weights: [400, 500, 600, 700] },
      { name: 'JetBrains Mono',     weights: [400, 500] },
      // Hydraulic
      { name: 'Chakra Petch',       weights: [400, 500, 600, 700] },
      { name: 'Exo 2',              weights: [400, 500, 600, 700] },
      { name: 'IBM Plex Mono',      weights: [400, 500] },
      // Confluence
      { name: 'Cormorant Garamond', weights: [400, 500, 600, 700] },
      { name: 'Lora',               weights: [400, 500, 600, 700] },
      { name: 'Fira Code',          weights: [400, 500] },
      // Creekin (all italic)
      { name: 'Barlow Condensed',   weights: [400, 500, 600, 700], styles: ['normal', 'italic'] },
      { name: 'Barlow',             weights: [400, 500, 600, 700], styles: ['normal', 'italic'] },
      { name: 'Roboto Mono',        weights: [400, 500] },
      // Ripple (all italic)
      { name: 'Josefin Sans',       weights: [400, 500, 600, 700], styles: ['normal', 'italic'] },
      { name: 'Raleway',            weights: [400, 500, 600, 700], styles: ['normal', 'italic'] },
      // Gauge Line
      { name: 'Source Code Pro',    weights: [400, 500] },
    ],
  },

  // Default to localStorage so the watchlist (large array) survives hard refresh.
  // Cookie storage (the plugin default) has a 4KB limit — truncated cookies
  // produce an empty store on refresh. localStorage has no practical limit.
  piniaPersistedstate: {
    storage: 'localStorage',
  },

  supabase: {
    redirect: false,
    redirectOptions: {
      login:    '/login',
      callback: '/confirm',
      exclude:  ['/', '/map', '/runs/*', '/dashboard'],
    },
    // Use implicit flow — tokens come back in the URL hash, no PKCE code
    // verifier needed. Required for static hosting (Netlify) where sessionStorage
    // doesn't survive the OAuth redirect.
    clientOptions: {
      auth: {
        flowType: 'implicit',
      },
    },
  },

  // Exclude client-only / dynamic routes from static prerender
  routeRules: {
    '/confirm':    { prerender: false },
    '/dashboard':  { prerender: false },
    '/trips':      { prerender: false },
    '/basin/**':   { prerender: false, ssr: false },
  },

  // Register components by filename only, not directory/filename prefix.
  // This keeps templates readable: <GaugeCard> not <GaugeGaugeCard>.
  components: [
    { path: '~/components', pathPrefix: false },
  ],

  // Runtime config — API base URL comes from env in production
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? 'http://localhost:8080',
    },
  },

  // SSR on for reach pages (SEO — "arkansas river conditions" should be indexable)
  // but the dashboard itself is client-side only
  ssr: true,

  // Phase 2c.0 — SEO blocking until 1.0 launch. Pilot is private validation,
  // not a public launch — don't let half-finished pages get cached in Google.
  // Pulled at 1.0 launch (remove this app.head block + flip robots.txt).
  app: {
    head: {
      meta: [
        { name: 'robots',                           content: 'noindex, nofollow' },
        { name: 'theme-color',                      content: '#3b82f6' },
        { name: 'mobile-web-app-capable',           content: 'yes' },
        { name: 'apple-mobile-web-app-capable',     content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title',       content: 'H2OFlows' },
      ],
      link: [
        { rel: 'apple-touch-icon', href: '/apple-touch-icon-180x180.png' },
      ],
    },
  },

  // PWA (fixes #265 — Android Chrome / desktop install prompt)
  // navigateFallback intentionally omitted to avoid intercepting /confirm OAuth
  // hash-token callback and /login redirects.
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name:             'H2OFlows',
      short_name:       'H2OFlows',
      description:      'Live whitewater flow conditions and run guides',
      theme_color:      '#3b82f6',
      background_color: '#ffffff',
      display:          'standalone',
      start_url:        '/',
      icons: [
        { src: 'pwa-64x64.png',             sizes: '64x64',   type: 'image/png' },
        { src: 'pwa-192x192.png',           sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512x512.png',           sizes: '512x512', type: 'image/png' },
        { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      // Precache static assets only — no navigateFallback (see comment above)
      globPatterns:          ['**/*.{js,css,html,svg,png,ico,woff2}'],
      cleanupOutdatedCaches: true,
    },
    client: {
      installPrompt: true,
    },
    devOptions: {
      enabled: false,
    },
  },

  // Color mode — Nuxt UI handles dark/light switching via the class strategy
  colorMode: {
    classSuffix: '',
  },

  css: ['~/assets/css/main.css'],

  vite: {
    optimizeDeps: {
      include: [
        '@nuxt/ui > prosemirror-state',
        '@nuxt/ui > prosemirror-transform',
        '@nuxt/ui > prosemirror-model',
        '@nuxt/ui > prosemirror-view',
        '@nuxt/ui > prosemirror-gapcursor',
      ],
    },
  },

  // TypeScript strict mode
  typescript: {
    strict: true,
  },

})
