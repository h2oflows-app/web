<template>
  <div class="h-dvh flex flex-col overflow-hidden bg-white dark:bg-neutral-950">

    <!-- Backdrop: consumes the click that closes the dashboard dropdown so it doesn't hit reach rows -->
    <div v-if="dropdownSlug !== null" class="fixed inset-0 z-30" @click.stop="dropdownSlug = null" />

    <!-- Demo banner -->
    <div v-if="showDemoBanner" class="shrink-0 bg-amber-50 dark:bg-amber-950 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center justify-between gap-4 text-sm">
      <p class="text-amber-800 dark:text-amber-200 text-center flex-1">
        <span class="font-semibold">Demo only.</span>
        River data is AI-seeded and unverified — do not use for trip planning or safety decisions.
      </p>
      <button class="shrink-0 text-amber-600 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-100 font-medium transition-colors" @click="dismissBanner">Dismiss</button>
    </div>

    <AppHeader class="shrink-0" />

    <!-- Split-pane body -->
    <div class="flex-1 overflow-hidden flex relative">

      <!-- ── Left panel: basin → river → reach tree ────────────────────────── -->
      <aside
        class="shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex flex-col overflow-hidden transition-all"
        :class="listVisible
          ? 'absolute sm:relative inset-0 sm:inset-auto z-30 sm:z-auto w-full sm:w-80'
          : 'hidden sm:flex sm:w-80'"
      >
        <!-- Search + mobile map toggle -->
        <div class="px-3 py-2.5 sm:border-b border-neutral-100 dark:border-neutral-800 shrink-0 flex items-center gap-2">
          <input
            v-model="query"
            type="search"
            placeholder="Search runs, rivers, basins…"
            class="flex-1 text-sm bg-neutral-100 dark:bg-neutral-900 rounded-md px-3 py-1.5 text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <!-- Back to map (mobile only, shown when list is visible) -->
          <button
            class="sm:hidden shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-950/50 transition-colors"
            aria-label="Show map"
            @click="listVisible = false"
          >
            <svg class="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 5l-5 5 5 5"/>
            </svg>
            Map
          </button>
        </div>

        <!-- New reach button — curated mode: admin only, opens admin author directly.
             User mode: any authed user, opens picker with create/import options. -->
        <div
          v-if="isAuthenticated && (mode === 'user' || (mode === 'curated' && isDataAdmin))"
          class="reach-picker-anchor px-3 pb-2 shrink-0 relative"
        >
          <button
            class="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white transition-colors shadow-sm"
            @click="onNewReachClick"
          >
            <svg class="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="10" y1="3" x2="10" y2="17"/><line x1="3" y1="10" x2="17" y2="10"/>
            </svg>
            New Run
          </button>
          <!-- Picker popover (user mode only) -->
          <div
            v-if="reachPickerOpen && mode === 'user'"
            class="absolute left-3 right-3 top-full mt-1 z-40 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg overflow-hidden"
          >
            <button
              class="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              @click="reachPickerOpen = false; navigateTo('/my/runs/new')"
            >
              <svg class="w-4 h-4 text-primary-500 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 3H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-5M13 3h4m0 0v4m0-4L9 11"/>
              </svg>
              <div>
                <p class="font-medium text-neutral-800 dark:text-neutral-100">Create new</p>
                <p class="text-xs text-neutral-400">Build your own run</p>
              </div>
            </button>
            <div class="border-t border-neutral-100 dark:border-neutral-800" />
            <button
              class="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              @click="reachPickerOpen = false; importModalOpen = true"
            >
              <svg class="w-4 h-4 text-neutral-500 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 16v1a1 1 0 001 1h10a1 1 0 001-1v-1M7 10l3 3 3-3M10 3v10"/>
              </svg>
              <div>
                <p class="font-medium text-neutral-800 dark:text-neutral-100">Import shared…</p>
                <p class="text-xs text-neutral-400">Paste a share code from another user</p>
              </div>
            </button>
          </div>
        </div>

        <!-- ── Curated reaches states ──────────────────────────────────────── -->
        <template v-if="mode === 'curated'">
          <div v-if="loading" class="flex-1 flex items-center justify-center text-sm text-neutral-400">Loading…</div>
          <div v-else-if="loadError" class="flex-1 flex items-center justify-center text-sm text-red-400">{{ loadError }}</div>
          <div v-else-if="query.length >= 2 && filteredStates.length === 0" class="flex-1 flex items-center justify-center text-sm text-neutral-400">
            No results for "{{ query }}"
          </div>
        </template>

        <!-- ── My Reaches states ───────────────────────────────────────────── -->
        <template v-else>
          <div v-if="userReachesLoading" class="flex-1 flex items-center justify-center text-sm text-neutral-400">Loading…</div>
          <div v-else-if="userReachesError" class="flex-1 flex items-center justify-center text-sm text-red-400">{{ userReachesError }}</div>
          <div v-else-if="userReaches.length === 0" class="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center text-sm text-neutral-400">
            <span>No saved runs yet.</span>
            <NuxtLink to="/my/runs/new" class="text-primary-500 hover:underline">Create your first run →</NuxtLink>
          </div>
          <div v-else-if="query.length >= 2 && userRiverGroups.length === 0" class="flex-1 flex items-center justify-center text-sm text-neutral-400">
            No results for "{{ query }}"
          </div>
        </template>

        <!-- Tree (curated mode) -->
        <div v-if="mode === 'curated' && !loading && !loadError && !(query.length >= 2 && filteredStates.length === 0)" class="flex-1 overflow-y-auto">
          <div v-for="stateGroup in filteredStates" :key="stateGroup.name">
            <!-- State header -->
            <button
              class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors bg-neutral-50 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-neutral-700"
              @click="toggleState(stateGroup.name)"
            >
              <svg
                class="w-3 h-3 text-neutral-500 shrink-0 transition-transform duration-150"
                :class="{ 'rotate-90': !collapsed.states.has(stateGroup.name) }"
                viewBox="0 0 20 20" fill="currentColor"
              >
                <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
              </svg>
              <span class="text-xs font-bold text-neutral-700 dark:text-neutral-200 uppercase tracking-widest flex-1 text-left">{{ stateGroup.name === '—' ? 'No State' : stateGroup.name }}</span>
              <span class="text-xs text-neutral-400">{{ stateGroup.totalCount }}</span>
            </button>

            <template v-if="!collapsed.states.has(stateGroup.name)">
              <div v-for="basin in stateGroup.basins" :key="basin.name">
                <!-- Basin header -->
                <button
                  class="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors border-b border-neutral-100 dark:border-neutral-800/50"
                  @click="toggleBasin(`${stateGroup.name}::${basin.name}`)"
                >
                  <svg
                    class="w-3 h-3 text-neutral-400 shrink-0 transition-transform duration-150"
                    :class="{ 'rotate-90': !collapsed.basins.has(`${stateGroup.name}::${basin.name}`) }"
                    viewBox="0 0 20 20" fill="currentColor"
                  >
                    <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
                  </svg>
                  <span class="text-xs font-semibold text-neutral-600 dark:text-neutral-300 flex-1 text-left">{{ basin.name }} Basin</span>
                  <span class="text-xs text-neutral-400">{{ basin.reachCount }}</span>
                </button>

                <template v-if="!collapsed.basins.has(`${stateGroup.name}::${basin.name}`)">
                  <div v-for="river in basin.rivers" :key="river.name">
                    <!-- River header -->
                    <div class="flex items-center group/river">
                      <button
                        class="flex items-center gap-2 pl-6 pr-2 py-1.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors flex-1 min-w-0"
                        @click="toggleRiver(stateGroup.name, basin.name, river.name)"
                      >
                        <svg
                          class="w-2.5 h-2.5 text-neutral-400 shrink-0 transition-transform duration-150"
                          :class="{ 'rotate-90': !collapsed.rivers.has(`${stateGroup.name}::${basin.name}::${river.name}`) }"
                          viewBox="0 0 20 20" fill="currentColor"
                        >
                          <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
                        </svg>
                        <span class="text-xs font-semibold text-neutral-600 dark:text-neutral-400 flex-1 text-left truncate">{{ river.name }}</span>
                        <span class="text-xs text-neutral-400 shrink-0">{{ river.reaches.length }}</span>
                      </button>
                      <!-- Bulk add all reaches in this river -->
                      <button
                        class="shrink-0 px-2 py-1.5 opacity-60 sm:opacity-0 sm:group-hover/river:opacity-100 hover:opacity-100 transition-opacity text-neutral-400 hover:text-primary-500 dark:hover:text-primary-400"
                        :aria-label="`Add all ${river.name} runs to dashboard`"
                        @click.stop="addAllRiverReaches(river.reaches)"
                      >
                        <svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                          <circle cx="10" cy="10" r="8"/><line x1="10" y1="6" x2="10" y2="14"/><line x1="6" y1="10" x2="14" y2="10"/>
                        </svg>
                      </button>
                    </div>

                    <!-- Reach rows -->
                    <template v-if="!collapsed.rivers.has(`${stateGroup.name}::${basin.name}::${river.name}`)">
                      <div
                        v-for="reach in river.reaches"
                        :key="reach.slug"
                        :ref="(el) => setReachRef(reach.slug, el as HTMLElement | null)"
                        class="flex items-center gap-2 pl-10 pr-2 py-1.5 cursor-pointer transition-colors group"
                        :class="hoveredSlug === reach.slug
                          ? 'bg-primary-50 dark:bg-primary-950/40'
                          : 'hover:bg-neutral-50 dark:hover:bg-neutral-900/60'"
                        @mouseenter="hoveredSlug = reach.slug"
                        @mouseleave="hoveredSlug = null"
                        @click="onReachRowClick(reach)"
                      >
                        <!-- Flow dot -->
                        <span
                          class="w-2 h-2 rounded-full shrink-0"
                          :style="{ background: bandSolid(null, reach.flow_status) }"
                        />
                        <!-- Name -->
                        <span class="flex-1 min-w-0 text-sm text-neutral-800 dark:text-neutral-200 truncate">
                          {{ reach.common_name ?? reach.name ?? reach.put_in_name ?? reach.slug }}
                        </span>
                        <!-- CFS -->
                        <span
                          v-if="reach.current_cfs != null"
                          class="text-xs font-medium tabular-nums shrink-0"
                          :style="{ color: bandSolid(null, reach.flow_status) }"
                        >{{ Math.round(reach.current_cfs).toLocaleString() }}</span>
                        <span v-else class="text-xs text-neutral-300 dark:text-neutral-600 shrink-0">—</span>
                        <!-- Add to dashboard dropdown -->
                        <div
                          v-if="reach.gauge_id && isAuthenticated"
                          class="dashboard-dropdown-anchor shrink-0 relative"
                          @click.stop
                        >
                          <button
                            class="p-1 rounded transition-colors"
                            :class="isOnDashboard(reach)
                              ? 'text-primary-500 dark:text-primary-400'
                              : 'text-neutral-400 dark:text-neutral-500 hover:text-primary-500 dark:hover:text-primary-400'"
                            :aria-label="isOnDashboard(reach) ? 'On dashboard' : 'Add to dashboard'"
                            @click="openDropdown(reach)"
                          >
                            <svg v-if="isOnDashboard(reach)" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                            </svg>
                            <svg v-else class="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                              <circle cx="10" cy="10" r="8"/><line x1="10" y1="6" x2="10" y2="14"/><line x1="6" y1="10" x2="14" y2="10"/>
                            </svg>
                          </button>
                          <!-- Dashboard picker dropdown -->
                          <div
                            v-if="dropdownSlug === reach.slug"
                            class="absolute right-0 top-full mt-1 z-40 min-w-40 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg overflow-hidden"
                          >
                            <div v-if="membershipLoading" class="px-3 py-2 text-xs text-neutral-400">Loading…</div>
                            <button
                              v-else
                              v-for="dashboard in db.dashboards.value"
                              :key="dashboard.id"
                              class="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                              @click="toggleDashboardForId(reach, dashboard.id)"
                            >
                              <svg
                                class="w-3.5 h-3.5 shrink-0"
                                :class="membershipDashboardIds.has(dashboard.id) ? 'text-primary-500' : 'text-neutral-300 dark:text-neutral-600'"
                                viewBox="0 0 20 20" fill="currentColor"
                              >
                                <path v-if="membershipDashboardIds.has(dashboard.id)" fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                                <circle v-else cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
                              </svg>
                              <span class="truncate text-neutral-700 dark:text-neutral-300">{{ dashboard.name }}</span>
                            </button>
                          </div>
                        </div>
                        <!-- Reach detail link -->
                        <NuxtLink
                          :to="`/runs/${reach.slug}`"
                          class="shrink-0 p-1 rounded text-neutral-400 dark:text-neutral-500 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
                          aria-label="View run"
                          @click.stop
                        >
                          <svg class="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 3H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-5M13 3h4m0 0v4m0-4L9 11" stroke-linecap="round" stroke-linejoin="round"/>
                          </svg>
                        </NuxtLink>
                      </div>
                    </template>
                  </div>
                </template>
              </div>
            </template>
          </div>
        </div>

        <!-- My Reaches list (user mode) -->
        <div
          v-if="mode === 'user' && !userReachesLoading && !userReachesError && userReaches.length > 0 && !(query.length >= 2 && userRiverGroups.length === 0)"
          class="flex-1 overflow-y-auto"
        >
          <div v-for="group in userRiverGroups" :key="group.name">
            <!-- River header -->
            <div class="flex items-center gap-2 px-3 py-1.5 border-b border-neutral-100 dark:border-neutral-800/50 bg-neutral-50 dark:bg-neutral-900/50">
              <span class="text-xs font-semibold text-neutral-600 dark:text-neutral-300 flex-1 truncate">{{ group.name }}</span>
              <span class="text-xs text-neutral-400 shrink-0">{{ group.reaches.length }}</span>
            </div>
            <!-- Reach rows -->
            <div
              v-for="reach in group.reaches"
              :key="reach.slug"
              :ref="(el) => setReachRef(reach.slug, el as HTMLElement | null)"
              class="flex items-center gap-2 pl-6 pr-2 py-1.5 cursor-pointer transition-colors group"
              :class="hoveredSlug === reach.slug
                ? 'bg-primary-50 dark:bg-primary-950/40'
                : 'hover:bg-neutral-50 dark:hover:bg-neutral-900/60'"
              @mouseenter="hoveredSlug = reach.slug"
              @mouseleave="hoveredSlug = null"
              @click="mapRef?.flyToSlug(reach.slug); listVisible = false"
            >
              <span
                class="w-2 h-2 rounded-full shrink-0"
                :style="{ background: bandSolid(null, reach.flow_status) }"
              />
              <span class="flex-1 min-w-0 text-sm text-neutral-800 dark:text-neutral-200 truncate">{{ reach.name }}</span>
              <span
                v-if="reach.current_cfs != null"
                class="text-xs font-medium tabular-nums shrink-0"
                :style="{ color: bandSolid(null, reach.flow_status) }"
              >{{ Math.round(reach.current_cfs).toLocaleString() }}</span>
              <span v-else class="text-xs text-neutral-300 dark:text-neutral-600 shrink-0">—</span>
              <!-- Add to dashboard dropdown -->
              <div
                v-if="isAuthenticated"
                class="dashboard-dropdown-anchor shrink-0 relative"
                @click.stop
              >
                <button
                  class="p-1 rounded transition-colors text-neutral-400 dark:text-neutral-500 hover:text-primary-500 dark:hover:text-primary-400"
                  aria-label="Add to dashboard"
                  @click="openUserReachDropdown(reach)"
                >
                  <svg class="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <circle cx="10" cy="10" r="8"/><line x1="10" y1="6" x2="10" y2="14"/><line x1="6" y1="10" x2="14" y2="10"/>
                  </svg>
                </button>
                <div
                  v-if="dropdownSlug === reach.slug"
                  class="absolute right-0 top-full mt-1 z-40 min-w-40 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg overflow-hidden"
                >
                  <div v-if="membershipLoading" class="px-3 py-2 text-xs text-neutral-400">Loading…</div>
                  <button
                    v-else
                    v-for="dashboard in db.dashboards.value"
                    :key="dashboard.id"
                    class="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                    @click="toggleDashboardForUserReach(reach, dashboard.id)"
                  >
                    <svg
                      class="w-3.5 h-3.5 shrink-0"
                      :class="membershipDashboardIds.has(dashboard.id) ? 'text-primary-500' : 'text-neutral-300 dark:text-neutral-600'"
                      viewBox="0 0 20 20" fill="currentColor"
                    >
                      <path v-if="membershipDashboardIds.has(dashboard.id)" fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                      <circle v-else cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
                    </svg>
                    <span class="truncate text-neutral-700 dark:text-neutral-300">{{ dashboard.name }}</span>
                  </button>
                </div>
              </div>
              <NuxtLink
                :to="`/my/runs/${reach.slug}`"
                class="shrink-0 p-0.5 rounded text-neutral-300 dark:text-neutral-600 hover:text-primary-500 dark:hover:text-primary-400 transition-opacity opacity-60 sm:opacity-0 sm:group-hover:opacity-100 hover:opacity-100"
                aria-label="View run"
                @click.stop
              >
                <svg class="w-3 h-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 3H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-5M13 3h4m0 0v4m0-4L9 11" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </NuxtLink>
            </div>
          </div>
        </div>
      </aside>

      <!-- ── Right panel: map ──────────────────────────────────────────────── -->
      <div class="flex-1 min-w-0 relative">

        <!-- Floating mode toggle pill (authenticated, map visible) -->
        <div
          v-if="isAuthenticated && !listVisible"
          class="absolute top-2 right-2 z-20 flex rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 shadow-md bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm text-xs font-medium"
        >
          <button
            class="px-3 py-1.5 transition-colors"
            :class="mode === 'curated' ? 'bg-primary-500 text-white' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'"
            @click="mode = 'curated'"
          >H2OFlows</button>
          <button
            class="px-3 py-1.5 transition-colors"
            :class="mode === 'user' ? 'bg-primary-500 text-white' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'"
            @click="mode = 'user'"
          >My Runs</button>
        </div>

        <ClientOnly>
          <RunsMap
            ref="mapRef"
            :hovered-slug="hoveredSlug"
            :source-url="mapSourceUrl"
            :source-headers="mapSourceHeaders"
            @reaches-updated="onReachesUpdated"
            @zoom-updated="(z) => mapZoom = z"
            @hover-changed="onMapHover"
            @reach-click="onReachClick"
          />
        </ClientOnly>

        <!-- Mobile: open list (only shown when map is visible) -->
        <button
          v-if="!listVisible"
          class="sm:hidden absolute top-2 left-2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shadow-md bg-white/95 dark:bg-neutral-900/95 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200"
          @click="listVisible = true"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/>
          </svg>
          {{ mapReaches.length }} reaches
        </button>
      </div>
    </div>
  </div>

  <!-- Gauge detail modal -->
  <GaugeDetailModal
    v-if="detailGauge"
    v-model:open="detailOpen"
    :gauge="detailGauge"
    mode="reach"
  />

  <!-- Import run modal -->
  <RunImportModal v-model:open="importModalOpen" @imported="onReachImported" />

  <!-- New reach modal (admin only) -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="authorModalOpen"
        class="fixed inset-0 z-50 flex flex-col bg-neutral-50 dark:bg-neutral-950 overflow-y-auto"
      >
        <!-- Modal header -->
        <div class="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-sm border-b border-neutral-200 dark:border-neutral-800">
          <h2 class="text-sm font-semibold text-neutral-800 dark:text-neutral-100">New Run</h2>
          <button
            class="p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            @click="authorModalOpen = false"
          >
            <svg class="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M6 6l8 8M14 6l-8 8"/>
            </svg>
          </button>
        </div>
        <!-- Author component -->
        <div class="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
          <RunAuthor @created="onAuthorCreated" @cancel="authorModalOpen = false" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import type { ReachListItem as MapReachItem } from '~/components/map/RunsMap.vue'
import type { ReachListItem } from '~/components/reach/RunBrowseRow.vue'
import type { WatchedGauge } from '~/stores/watchlist'
import { useWatchlistStore } from '~/stores/watchlist'

definePageMeta({ ssr: false })

const { bandSolid } = useFlowBandPalette()
const { apiBase } = useRuntimeConfig().public
const router = useRouter()
const route = useRoute()
let pendingFocusSlug: string | null = (route.query.focus as string) || null
const watchlistStore = useWatchlistStore()
const { addAndSync, removeAndSync, addReachToWatchlist } = useWatchlistSync()
const { isDataAdmin, isAuthenticated, getToken } = useAuth()
const db = useDashboards()

// ── Mode toggle ───────────────────────────────────────────────────────────────
const mode = ref<'curated' | 'user'>('curated')
const mapToken = ref<string | null>(null)

const mapSourceUrl = ref<string | null>(null)
const mapSourceHeaders = computed((): Record<string, string> =>
  mapToken.value ? { Authorization: `Bearer ${mapToken.value}` } : {}
)

// ── New reach / import modals ─────────────────────────────────────────────────
const authorModalOpen  = ref(false)
const reachPickerOpen  = ref(false)
const importModalOpen  = ref(false)

function onAuthorCreated(slug: string) {
  authorModalOpen.value = false
  router.push(`/runs/${slug}/edit`)
}

function onNewReachClick() {
  // Curated mode (admin-only): skip picker, open admin author directly.
  if (mode.value === 'curated') {
    authorModalOpen.value = true
    return
  }
  // User mode: toggle picker (Create new / Import shared).
  reachPickerOpen.value = !reachPickerOpen.value
}

function onReachImported() {
  if (mode.value === 'user') loadUserReaches()
}

// ── Demo banner ───────────────────────────────────────────────────────────────
const showDemoBanner = ref(false)

// ── Dashboard dropdown per reach ──────────────────────────────────────────────
const dropdownSlug         = ref<string | null>(null)
const membershipDashboardIds = ref<Set<string>>(new Set())
const membershipLoading    = ref(false)

async function openDropdown(reach: ReachListItem) {
  if (dropdownSlug.value === reach.slug) { dropdownSlug.value = null; return }
  dropdownSlug.value = reach.slug
  if (!reach.gauge_id) return
  membershipLoading.value = true
  membershipDashboardIds.value = new Set()
  const token = await getToken()
  if (!token) { membershipLoading.value = false; return }
  try {
    const res = await fetch(`${apiBase}/api/v1/watchlist`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return
    const data = await res.json()
    const ids = new Set<string>()
    for (const item of (data.items ?? [])) {
      if (item.gauge_id === reach.gauge_id && item.reach_slug === reach.slug && item.dashboard_id) {
        ids.add(item.dashboard_id)
      }
    }
    membershipDashboardIds.value = ids
  } finally {
    membershipLoading.value = false
  }
}

function onDocClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (reachPickerOpen.value && !target.closest('.reach-picker-anchor')) reachPickerOpen.value = false
  if (dropdownSlug.value && !target.closest('.dashboard-dropdown-anchor')) dropdownSlug.value = null
}

onMounted(() => {
  showDemoBanner.value = localStorage.getItem('demo-banner-dismissed') !== 'true'
  document.addEventListener('click', onDocClick)
  if (isAuthenticated.value) db.load()
})
onUnmounted(() => document.removeEventListener('click', onDocClick))
function dismissBanner() {
  showDemoBanner.value = false
  localStorage.setItem('demo-banner-dismissed', 'true')
}

// ── Data loading ──────────────────────────────────────────────────────────────
const loading   = ref(true)
const loadError = ref('')
const reaches   = ref<ReachListItem[]>([])

onMounted(async () => {
  try {
    const res = await fetch(`${apiBase}/api/v1/reaches`)
    if (!res.ok) throw new Error(`${res.status}`)
    reaches.value = await res.json()
  } catch {
    loadError.value = 'Failed to load runs.'
  } finally {
    loading.value = false
  }
})

// ── User reaches ─────────────────────────────────────────────────────────────
interface UserReachSummary {
  id: string; slug: string; name: string
  river_name: string | null
  current_cfs: number | null
  flow_status: string
  gauge_id?: string | null
}
interface UserRiverGroup { name: string; reaches: UserReachSummary[] }

const userReachesLoading = ref(false)
const userReachesError  = ref('')
const userReaches       = ref<UserReachSummary[]>([])

async function loadUserReaches() {
  userReachesLoading.value = true
  userReachesError.value = ''
  try {
    const token = await getToken()
    mapToken.value = token
    if (!token) { userReachesError.value = 'Sign in to view your runes.'; return }
    mapSourceUrl.value = `${apiBase}/api/v1/me/runs/map/all`
    const res = await fetch(`${apiBase}/api/v1/me/reaches`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`${res.status}`)
    userReaches.value = await res.json()
  } catch {
    userReachesError.value = 'Failed to load your runs.'
  } finally {
    userReachesLoading.value = false
  }
}

watch(mode, m => {
  if (m === 'user') loadUserReaches()
  else { mapSourceUrl.value = null; mapToken.value = null }
})

// ── Search ────────────────────────────────────────────────────────────────────
const query = ref('')

// ── Tree grouping ─────────────────────────────────────────────────────────────
interface RiverGroup { name: string; reaches: ReachListItem[] }
interface BasinGroup  { name: string; reachCount: number; rivers: RiverGroup[] }
interface StateGroup  { name: string; totalCount: number; basins: BasinGroup[] }

function cleanBasinName(name: string | null | undefined): string | null {
  if (!name) return null
  const cleaned = name
    .replace(/^(Upper|Middle|Lower)\s+/i, '')
    .replace(/\s+(River|Rivers|Basin)s?$/i, '')
    .trim()
  return cleaned || null
}

function buildTree(items: ReachListItem[]): StateGroup[] {
  // state → basin → river → reaches
  const stateMap = new Map<string, Map<string, Map<string, ReachListItem[]>>>()
  for (const r of items) {
    const state = r.state_abbr ?? '—'
    const basin = cleanBasinName(r.basin) ?? 'Other'
    const river = r.river_name ?? 'Unknown River'
    if (!stateMap.has(state)) stateMap.set(state, new Map())
    const basinMap = stateMap.get(state)!
    if (!basinMap.has(basin)) basinMap.set(basin, new Map())
    const riverMap = basinMap.get(basin)!
    if (!riverMap.has(river)) riverMap.set(river, [])
    riverMap.get(river)!.push(r)
  }
  return [...stateMap.entries()]
    .sort(([a], [b]) => a === '—' ? 1 : b === '—' ? -1 : a.localeCompare(b))
    .map(([state, basinMap]) => {
      const basins = [...basinMap.entries()]
        .sort(([a], [b]) => a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b))
        .map(([basin, riverMap]) => {
          const rivers = [...riverMap.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([name, reaches]) => ({ name, reaches }))
          const reachCount = rivers.reduce((s, r) => s + r.reaches.length, 0)
          return { name: basin, reachCount, rivers }
        })
      const totalCount = basins.reduce((s, b) => s + b.reachCount, 0)
      return { name: state, totalCount, basins }
    })
}

const visibleReaches = computed(() => reaches.value)

const allStates = computed(() => buildTree(visibleReaches.value))

// Viewport-filtered tree: only reaches currently visible on the map
const viewportStates = computed(() => {
  if (mapReaches.value.length === 0) return allStates.value
  const visibleSlugs = new Set(mapReaches.value.map(r => r.slug))
  return buildTree(visibleReaches.value.filter(r => visibleSlugs.has(r.slug)))
})

const filteredStates = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (q.length < 2) return viewportStates.value
  // Search spans ALL reaches, not just viewport
  const filtered = visibleReaches.value.filter(r =>
    (r.common_name?.toLowerCase().includes(q)) ||
    (r.put_in_name?.toLowerCase().includes(q)) ||
    (r.take_out_name?.toLowerCase().includes(q)) ||
    (r.river_name?.toLowerCase().includes(q)) ||
    (r.basin?.toLowerCase().includes(q)) ||
    (r.state_abbr?.toLowerCase().includes(q)) ||
    (r.slug.toLowerCase().includes(q))
  )
  return buildTree(filtered)
})

const userRiverGroups = computed((): UserRiverGroup[] => {
  const q = query.value.trim().toLowerCase()
  const items = q.length >= 2
    ? userReaches.value.filter(r =>
        r.name.toLowerCase().includes(q) ||
        (r.river_name?.toLowerCase().includes(q) ?? false)
      )
    : userReaches.value
  const grouped = new Map<string, UserReachSummary[]>()
  for (const r of items) {
    const key = r.river_name ?? 'No River'
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(r)
  }
  return [...grouped.entries()]
    .sort(([a], [b]) => a === 'No River' ? 1 : b === 'No River' ? -1 : a.localeCompare(b))
    .map(([name, reaches]) => ({ name, reaches }))
})

// ── Collapse state ────────────────────────────────────────────────────────────
const collapsed = ref<{ states: Set<string>; basins: Set<string>; rivers: Set<string> }>({
  states: new Set(),
  basins: new Set(),
  rivers: new Set(),
})

function toggleState(name: string) {
  const s = new Set(collapsed.value.states)
  if (s.has(name)) s.delete(name); else s.add(name)
  collapsed.value = { ...collapsed.value, states: s }
}

function toggleBasin(key: string) {
  const s = new Set(collapsed.value.basins)
  if (s.has(key)) s.delete(key); else s.add(key)
  collapsed.value = { ...collapsed.value, basins: s }
}

function toggleRiver(state: string, basin: string, river: string) {
  const key = `${state}::${basin}::${river}`
  const s = new Set(collapsed.value.rivers)
  if (s.has(key)) s.delete(key); else s.add(key)
  collapsed.value = { ...collapsed.value, rivers: s }
}

// ── Two-way interaction: list ↔ map ───────────────────────────────────────────
const mapRef      = ref<{ flyToSlug: (slug: string) => void; reloadSource: () => Promise<void> } | null>(null)
const hoveredSlug = ref<string | null>(null)
const mapReaches  = ref<MapReachItem[]>([])
const mapZoom     = ref(4)

const reachRefs = new Map<string, HTMLElement>()
function setReachRef(slug: string, el: HTMLElement | null) {
  if (el) reachRefs.set(slug, el)
  else    reachRefs.delete(slug)
}

function onReachesUpdated(r: MapReachItem[]) {
  mapReaches.value = r
  if (pendingFocusSlug && r.some(x => x.slug === pendingFocusSlug)) {
    mapRef.value?.flyToSlug(pendingFocusSlug)
    pendingFocusSlug = null
    router.replace({ query: {} })
  }
}

// Map hover → highlight + scroll list
function onMapHover(slug: string | null) {
  hoveredSlug.value = slug
  if (slug) {
    nextTick(() => {
      reachRefs.get(slug)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }
}

// Map reach click → navigate to reach page
function onReachClick(slug: string) {
  navigateTo(mode.value === 'user' ? `/my/runs/${slug}` : `/runs/${slug}`)
}

// List row click → fly map to reach, hide list on mobile
function onReachRowClick(reach: ReachListItem) {
  mapRef.value?.flyToSlug(reach.slug)
  listVisible.value = false
}


// ── Mobile list/map toggle ────────────────────────────────────────────────────
const listVisible = ref(false)

// ── Dashboard watchlist integration ───────────────────────────────────────────
function buildWatchedGauge(reach: ReachListItem): WatchedGauge {
  return {
    id: reach.gauge_id!,
    externalId: reach.gauge_external_id ?? '',
    source: reach.gauge_source ?? 'usgs',
    name: reach.gauge_name ?? null,
    contextReachSlug: reach.slug,
    contextReachCommonName: reach.common_name ?? null,
    contextReachFullName: reach.put_in_name && reach.take_out_name
      ? `${reach.put_in_name} to ${reach.take_out_name}` : null,
    contextReachRiverName: reach.river_name ?? null,
    contextReachBasinGroup: reach.basin ?? null,
    contextReachCenterLng: null,
    contextReachRiverOrder: null,
    contextReachPermitRequired: false,
    contextReachMultiDayDays: 0,
    reachId: null, reachName: null, reachNames: [],
    reachSlug: reach.slug,
    reachSlugs: [reach.slug],
    reachCommonNames: reach.common_name ? [reach.common_name] : [],
    reachRelationship: 'primary',
    watershedName: null, basinName: reach.basin ?? null,
    riverName: reach.river_name ?? null, stateAbbr: reach.state_abbr ?? null,
    lat: null, lng: null,
    currentCfs: reach.current_cfs ?? null,
    flowStatus: reach.flow_status ?? 'unknown',
    flowBandLabel: reach.flow_label ?? null,
    lastReadingAt: null,
    watchState: 'saved', activeSince: null,
  }
}

function isOnDashboard(reach: ReachListItem): boolean {
  if (!reach.gauge_id) return false
  return watchlistStore.gauges.some(g => g.id === reach.gauge_id && g.contextReachSlug === reach.slug)
}

// User reaches are watchlisted by reach_slug only (no gauge_id). The user reach
// row in the dashboard renders from the /me/reaches summary, which already
// includes current_cfs from the primary_gauge. Storing the gauge in the
// watchlist as well would double-display it as a standalone gauge.
async function openUserReachDropdown(r: UserReachSummary) {
  if (dropdownSlug.value === r.slug) { dropdownSlug.value = null; return }
  dropdownSlug.value = r.slug
  membershipLoading.value = true
  membershipDashboardIds.value = new Set()
  const token = await getToken()
  if (!token) { membershipLoading.value = false; return }
  try {
    const res = await fetch(`${apiBase}/api/v1/watchlist`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return
    const data = await res.json()
    const ids = new Set<string>()
    for (const item of (data.items ?? [])) {
      if (item.reach_slug === r.slug && item.gauge_id == null && item.dashboard_id) {
        ids.add(item.dashboard_id)
      }
    }
    membershipDashboardIds.value = ids
  } finally {
    membershipLoading.value = false
  }
}

async function toggleDashboardForUserReach(r: UserReachSummary, dashboardId: string) {
  if (membershipDashboardIds.value.has(dashboardId)) {
    membershipDashboardIds.value = new Set([...membershipDashboardIds.value].filter(id => id !== dashboardId))
    const token = await getToken()
    if (token) {
      const qs = `?kind=reach&dashboard_id=${encodeURIComponent(dashboardId)}`
      fetch(`${apiBase}/api/v1/watchlist/${encodeURIComponent(r.slug)}${qs}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
  } else {
    membershipDashboardIds.value = new Set([...membershipDashboardIds.value, dashboardId])
    await addReachToWatchlist(r.slug, dashboardId)
    // Clear stale localStorage hidden flag so a previously-trashed reach becomes visible
    if (import.meta.client) {
      const key = `h2oflow_hidden_reaches_${dashboardId}`
      try {
        const set = new Set<string>(JSON.parse(localStorage.getItem(key) ?? '[]'))
        if (set.delete(r.id)) localStorage.setItem(key, JSON.stringify([...set]))
      } catch {}
    }
  }
}

async function toggleDashboardForId(reach: ReachListItem, dashboardId: string) {
  if (!reach.gauge_id) return
  if (membershipDashboardIds.value.has(dashboardId)) {
    // Optimistic remove from this dashboard only
    membershipDashboardIds.value = new Set([...membershipDashboardIds.value].filter(id => id !== dashboardId))
    const token = await getToken()
    if (token) {
      const qs = `?reach_slug=${encodeURIComponent(reach.slug)}&dashboard_id=${encodeURIComponent(dashboardId)}`
      fetch(`${apiBase}/api/v1/watchlist/${reach.gauge_id}${qs}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
      // Sync local store if this was the active dashboard
      if (dashboardId === db.activeDashboard.value?.id) {
        watchlistStore.removeGauge(reach.gauge_id, reach.slug)
      }
    }
  } else {
    // Optimistic add to this dashboard
    membershipDashboardIds.value = new Set([...membershipDashboardIds.value, dashboardId])
    addAndSync(buildWatchedGauge(reach), dashboardId)
  }
}

function addAllRiverReaches(reaches: ReachListItem[]) {
  for (const reach of reaches) {
    if (reach.gauge_id && !isOnDashboard(reach)) {
      addAndSync(buildWatchedGauge(reach))
    }
  }
}

// ── Gauge detail modal ────────────────────────────────────────────────────────
const detailOpen  = ref(false)
const detailGauge = ref<WatchedGauge | null>(null)

function openGaugeModal(reach: ReachListItem) {
  if (!reach.gauge_id) return
  detailGauge.value = buildWatchedGauge(reach)
  detailOpen.value = true
}

</script>

<style scoped>
/* Push MapLibre zoom controls below the H2OFlows/My Reaches mode toggle pill */
:deep(.maplibregl-ctrl-top-right) {
  top: 44px;
}
</style>
