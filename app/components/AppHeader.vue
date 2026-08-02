<template>
  <!--
    z-index scale (app-wide convention, see feedback_sticky_zindex_stacking) —
    keep any new overlay in this file on one of these levels, don't invent a new one:
      z-10  in-content overlays (e.g. a backdrop-blur row trapping its own dropdown)
      z-20  page-level sticky toolbars (e.g. dashboard.vue's controls bar)
      z-30  app chrome — AppHeader (sticky, here) + MobileTabBar (fixed)
      z-40  dropdowns anchored inside the header (avatar menu below; any future one)
      z-50+ modals/overlays teleported to <body> (Ask modal, CreateChooserSheet)
  -->
  <header class="sticky top-0 z-30 shrink-0 border-b border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-sm">
    <div class="max-w-5xl mx-auto px-4 h-[50px] flex items-center gap-2">

      <!-- Logo -->
      <NuxtLink to="/" class="flex items-center gap-1.5 shrink-0">
        <svg class="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M2 12c2-4 4-6 6-6s4 6 6 6 4-6 6-6" stroke-linecap="round"/>
        </svg>
        <span class="text-sm font-semibold tracking-tight hidden sm:inline font-display">H2OFlows</span>
      </NuxtLink>

      <!-- Dashboard shortcut -->
      <NuxtLink
        to="/dashboard"
        class="shrink-0 hidden sm:flex items-center gap-1 p-1.5 rounded-md transition-colors"
        :class="route.path === '/dashboard'
          ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/50'
          : 'text-neutral-500 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-neutral-50 dark:hover:bg-neutral-900'"
        title="Flow Dashboard"
      >
        <svg class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="4" rx="1"/><rect x="14" y="10" width="7" height="11" rx="1"/><rect x="3" y="13" width="7" height="8" rx="1"/>
        </svg>
        <span class="hidden lg:inline text-xs font-medium">Dashboard</span>
      </NuxtLink>

      <!-- Explore shortcut (replaces Map + Rivers) -->
      <NuxtLink
        to="/explore"
        class="shrink-0 hidden sm:flex items-center gap-1 p-1.5 rounded-md transition-colors"
        :class="route.path.startsWith('/explore')
          ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/50'
          : 'text-neutral-500 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-neutral-50 dark:hover:bg-neutral-900'"
        title="Explore Rivers"
      >
        <svg class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 14c3-6 6-9 8-9s5 9 8 9 5-9 8-9"/>
        </svg>
        <span class="hidden lg:inline text-xs font-medium">Explore</span>
      </NuxtLink>

      <!-- Discover shortcut (#367) — Discover shipped to MobileTabBar only
           (#336), leaving desktop with NO entry point to it at all. Same
           magnifying-glass icon as the mobile bar for continuity, and
           deliberately ungated like Dashboard/Explore above: the auth
           boundary lives inside pages/discover/index.vue, which renders its
           own "Sign in to browse Discover" prompt. -->
      <NuxtLink
        to="/discover"
        class="shrink-0 hidden sm:flex items-center gap-1 p-1.5 rounded-md transition-colors"
        :class="route.path.startsWith('/discover')
          ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/50'
          : 'text-neutral-500 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-neutral-50 dark:hover:bg-neutral-900'"
        title="Discover crew"
      >
        <svg class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <span class="hidden lg:inline text-xs font-medium">Discover</span>
      </NuxtLink>

      <!-- Calendar shortcut (#347) — desktop nav parity with MobileTabBar's
           Calendar tab; same calendar glyph as MobileTabBar and the (removed)
           avatar-dropdown "My Calendar" item this replaces. -->
      <NuxtLink
        to="/calendar"
        class="shrink-0 hidden sm:flex items-center gap-1 p-1.5 rounded-md transition-colors"
        :class="route.path.startsWith('/calendar')
          ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/50'
          : 'text-neutral-500 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-neutral-50 dark:hover:bg-neutral-900'"
        title="Calendar"
      >
        <svg class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span class="hidden lg:inline text-xs font-medium">Calendar</span>
      </NuxtLink>

      <!-- + New — primary create CTA, desktop only (mobile already has the FAB
           in MobileTabBar). Reuses MobileTabBar's exact create flow verbatim
           (useCreateMenu().open() -> AppCreateOverlay's CreateChooserSheet) —
           no second create path. Filled/primary so it reads as the CTA,
           distinct from the plain nav links beside it. -->
      <button
        class="shrink-0 hidden sm:flex items-center gap-1 pl-2 pr-2.5 py-1.5 rounded-md bg-primary-600 hover:bg-primary-700 text-white transition-colors"
        title="Create"
        @click="openCreateMenu()"
      >
        <svg class="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/>
        </svg>
        <span class="text-xs font-semibold">New</span>
      </button>

      <!-- Spacer — pushes actions/Ask/Notifications/Avatar to the right edge.
           #347: breadcrumbs (the old default slot here) are removed entirely,
           not relocated — see AppHeader's removed `<slot />`; the ~9 pages
           that used to inject them now render a plain `<AppHeader />`. -->
      <div class="flex-1 min-w-0" />

      <!-- Page-level action buttons -->
      <slot name="actions" />

      <!-- AI Ask button — right side, immediately before NotificationBell
           (#347: moved off the left cluster). Icon always visible, text
           label desktop-only; unchanged askOpen/modal wiring. -->
      <button
        class="shrink-0 flex items-center gap-1 p-1.5 rounded-md text-neutral-500 dark:text-neutral-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
        title="Ask AI anything"
        @click="askOpen = true"
      >
        <svg class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
        </svg>
        <span class="hidden sm:inline text-xs font-medium">Ask</span>
      </button>

      <!-- Notifications — always visible (desktop + mobile) -->
      <NotificationBell />

      <!-- User avatar — far right -->
      <!-- No ClientOnly needed: server always renders unauthenticated (gray), client
           reactively updates to blue after Supabase restores session — no mismatch. -->
      <div class="relative shrink-0" data-user-menu>
          <button
            class="flex items-center justify-center w-7 h-7 rounded-full transition-colors"
            :class="isAuthenticated
              ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 hover:bg-primary-200 dark:hover:bg-primary-900'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700'"
            :title="isAuthenticated ? `Signed in as ${user?.email ?? user?.user_metadata?.user_name ?? 'you'}` : 'Sign in'"
            @click="userMenuOpen = !userMenuOpen"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 0 0-16 0"/>
            </svg>
          </button>
          <div
            v-if="userMenuOpen"
            class="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg py-1 z-40"
          >
            <!-- "My Calendar" dropdown item removed (#347) — Calendar is now
                 top-level in the desktop nav above and in MobileTabBar, so a
                 third entry point here was redundant. CalendarMenuHeader
                 (below) is kept: it's a profile/season-stats summary, not a
                 calendar link (see AppHeader.vue history / #347 report). -->
            <CalendarMenuHeader v-if="isAuthenticated" :open="userMenuOpen" />
            <NuxtLink
              v-if="isAuthenticated"
              to="/my/runs"
              class="w-full text-left px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center gap-2"
              @click="userMenuOpen = false"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0"/><path d="M8 12h8"/><path d="M12 8l4 4-4 4"/>
              </svg>
              My Runs
            </NuxtLink>
            <NuxtLink
              v-if="isAuthenticated"
              to="/my/gauges"
              class="w-full text-left px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center gap-2"
              @click="userMenuOpen = false"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a10 10 0 0 1 10 10"/>
                <path d="M12 2a10 10 0 0 0-10 10"/>
                <path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0"/>
                <path d="M12 2v2"/>
                <path d="M2 12h2"/>
                <path d="M20 12h2"/>
                <path d="M18.364 5.636-1.414 1.414"/>
                <path d="M5.636 5.636l1.414 1.414"/>
                <path d="M15.5 8.5 12 12"/>
              </svg>
              My Gauges
            </NuxtLink>
            <NuxtLink
              v-if="isDataAdmin"
              to="/admin"
              class="w-full text-left px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center gap-2"
              @click="userMenuOpen = false"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Admin
            </NuxtLink>
            <NuxtLink
              v-if="isAuthenticated"
              to="/settings"
              class="w-full text-left px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center gap-2"
              @click="userMenuOpen = false"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              Settings
            </NuxtLink>
            <div class="border-t border-neutral-100 dark:border-neutral-800" />
            <template v-if="isAuthenticated">
              <button
                class="w-full text-left px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center gap-2"
                @click="userMenuOpen = false; handleSignOut()"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Sign out
              </button>
            </template>
            <template v-else>
              <NuxtLink
                to="/login"
                class="block px-3 py-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                @click="userMenuOpen = false"
              >Sign in</NuxtLink>
            </template>
          </div>
        </div>
    </div>

  </header>

  <!-- Global Ask modal (Teleport so it's above everything) -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="askOpen"
        class="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 bg-black/20 backdrop-blur-sm"
        @pointerdown="backdropDown" @pointerup="backdropUp($event) && closeAsk()"
      >
        <div class="w-full max-w-xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <form class="flex items-center gap-2 px-4 py-3 border-b border-neutral-100 dark:border-neutral-800" @submit.prevent="askQuestion">
            <svg class="w-4 h-4 text-purple-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
            </svg>
            <input
              ref="askInputRef"
              v-model="askQuery"
              type="text"
              placeholder='Ask anything — e.g. "Browns Canyon at 800 cfs?"'
              class="flex-1 bg-transparent text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none"
              :disabled="asking"
            />
            <button
              v-if="askQuery"
              type="button"
              class="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              @click="askQuery = ''; askResult = null"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
            <button
              type="submit"
              :disabled="asking || !askQuery.trim()"
              class="shrink-0 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white text-xs font-semibold transition-colors"
            >
              <span v-if="asking" class="flex items-center gap-1">
                <span class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
              </span>
              <span v-else>Ask</span>
            </button>
          </form>

          <div v-if="askResult" class="px-4 py-4 space-y-3 max-h-96 overflow-y-auto">
            <div
              v-for="result in (askResult.results ?? [])"
              :key="result.reach_slug"
              class="rounded-lg border border-neutral-100 dark:border-neutral-800 p-3 space-y-1"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-semibold uppercase tracking-wide text-primary-500">{{ result.reach_name }}</span>
                <button
                  type="button"
                  class="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium shrink-0"
                  @click="goToReachOnMap(result.reach_slug)"
                >Show on map →</button>
              </div>
              <div class="ask-answer text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed" v-html="md.render(result.answer)" />
            </div>
            <div v-if="!askResult.results?.length && askResult.answer" class="ask-answer text-sm text-neutral-500 leading-relaxed" v-html="md.render(askResult.answer)" />
          </div>
          <p v-else-if="!asking && !askResult" class="px-4 py-3 text-xs text-neutral-400">
            Try: "What's Foxton like at 300 cfs?" or "Best beginner runs near Denver"
          </p>
          <p v-if="askError" class="px-4 py-3 text-sm text-red-400">{{ askError }}</p>

          <div class="px-4 py-2.5 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
            <button class="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300" @click="closeAsk">Close</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, nextTick, watch, onMounted, onUnmounted } from 'vue'
import MarkdownIt from 'markdown-it'
const { user, isAuthenticated, isDataAdmin, loadAdminRoles, signOut } = useAuth()
// Load user_roles-based admin state once, app-wide — gates the admin menu link.
// Shared via useState in useAuth, so this lights the menu on every page.
onMounted(() => { if (isAuthenticated.value) loadAdminRoles() })
watch(isAuthenticated, (v) => { if (v) loadAdminRoles() })
const router = useRouter()
const route = useRoute()
const userMenuOpen = ref(false)
const { apiBase } = useRuntimeConfig().public
// "+ New" (#347) — identical create flow to MobileTabBar's FAB (onAdd calls
// the same open()); AppCreateOverlay.vue (mounted globally in app.vue) owns
// the resulting CreateChooserSheet. Do not add a second create path.
const { open: openCreateMenu } = useCreateMenu()

// Close menus on route change
watch(() => route.path, () => { userMenuOpen.value = false })

function onDocClick(e: MouseEvent) {
  if (userMenuOpen.value && !(e.target as HTMLElement).closest('[data-user-menu]')) {
    userMenuOpen.value = false
  }
}
onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))

async function handleSignOut() {
  await signOut()
  router.push('/')
}

// ── Global Ask ────────────────────────────────────────────────────────────────
const md          = new MarkdownIt({ html: false, linkify: false, breaks: true })
const askOpen     = ref(false)
const askInputRef = ref<HTMLInputElement>()
const askQuery    = ref('')
const asking      = ref(false)
const askError    = ref('')
const askResult   = ref<{ results?: { answer: string; reach_slug: string; reach_name: string }[]; answer?: string } | null>(null)

watch(askOpen, async (open) => {
  if (open) {
    askQuery.value  = ''
    askResult.value = null
    askError.value  = ''
    await nextTick()
    askInputRef.value?.focus()
  }
})

function closeAsk() { askOpen.value = false }

function goToReachOnMap(slug: string) {
  closeAsk()
  router.push({ path: '/explore', query: { focus: slug } })
}

async function askQuestion() {
  const q = askQuery.value.trim()
  if (!q) return
  asking.value    = true
  askError.value  = ''
  askResult.value = null
  try {
    const res = await fetch(`${apiBase}/api/v1/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q }),
    })
    if (!res.ok) throw new Error(`${res.status}`)
    askResult.value = await res.json()
  } catch {
    askError.value = 'Something went wrong. Try again.'
  } finally {
    asking.value = false
  }
}
</script>

