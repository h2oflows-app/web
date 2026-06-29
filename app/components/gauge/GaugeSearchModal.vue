<template>
  <UModal v-model:open="open" title="Add a Run" :ui="{ content: 'sm:max-w-2xl' }">
    <template #body>
      <div class="space-y-3">

        <!-- "Adding to [dashboard ▾]" chip — always visible -->
        <div class="flex items-center gap-2">
          <span class="text-xs text-neutral-500 dark:text-neutral-400 shrink-0">Adding to</span>
          <div class="relative" ref="dashChipWrap">
            <button
              class="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-700 hover:bg-primary-200 dark:hover:bg-primary-900/80 transition-colors min-h-[28px]"
              @click="dashChipOpen = !dashChipOpen"
            >
              <svg class="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="4" rx="1"/><rect x="14" y="10" width="7" height="11" rx="1"/><rect x="3" y="13" width="7" height="8" rx="1"/>
              </svg>
              <span class="truncate max-w-[160px]">{{ selectedDashboardName }}</span>
              <svg class="w-3 h-3 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd"/>
              </svg>
            </button>
            <!-- Dropdown popover -->
            <div
              v-if="dashChipOpen"
              class="absolute top-full left-0 mt-1 z-50 min-w-[180px] rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg py-1"
            >
              <button
                v-for="d in db.dashboards.value"
                :key="d.id"
                class="w-full text-left px-3 py-1.5 text-xs transition-colors"
                :class="selectedDashboardId === d.id
                  ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 font-medium'
                  : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800'"
                @click="selectedDashboardId = d.id; dashChipOpen = false"
              >{{ d.name }}</button>
            </div>
          </div>
        </div>

        <!-- Segmented control: Mine · Community · Gauges -->
        <div class="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1 self-start w-full sm:w-auto">
          <button
            v-for="t in TABS"
            :key="t.key"
            class="flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium rounded-md transition-colors min-h-[32px]"
            :class="activeTab === t.key
              ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
              : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'"
            @click="setTab(t.key)"
          >{{ t.label }}</button>
        </div>

        <!-- ── Mine tab ── -->
        <template v-if="activeTab === 'mine'">
          <input
            v-model="myRunsQuery"
            type="search"
            placeholder="Filter your runs…"
            class="w-full text-sm bg-neutral-100 dark:bg-neutral-900 rounded-md px-3 py-2 text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <div v-if="myRunsLoading" class="space-y-2 py-2">
            <div v-for="i in 4" :key="i" class="flex items-center gap-3 px-2 py-2.5">
              <div class="flex-1 h-4 rounded bg-neutral-100 dark:bg-neutral-800 animate-pulse"/>
              <div class="h-7 w-16 rounded bg-neutral-100 dark:bg-neutral-800 animate-pulse"/>
            </div>
          </div>
          <div v-else-if="filteredMyRuns.length === 0 && myRuns.length === 0" class="text-center py-10 text-neutral-400 text-sm">
            No runs yet.
          </div>
          <div v-else-if="filteredMyRuns.length === 0" class="text-center py-10 text-neutral-400 text-sm">
            No runs matching "{{ myRunsQuery }}"
          </div>
          <ul v-else class="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-[55vh] overflow-y-auto">
            <li
              v-for="r in filteredMyRuns"
              :key="r.id"
              class="flex items-center gap-3 py-2.5 px-2 hover:bg-primary-50 dark:hover:bg-primary-950/30 rounded-lg transition-colors"
            >
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{{ r.name }}</p>
                <div class="flex items-center gap-1.5 mt-0.5">
                  <span v-if="r.river_name" class="text-xs text-neutral-400 truncate">{{ r.river_name }}</span>
                  <span v-if="r.class_max" class="text-xs text-neutral-400">· {{ classRange(r.class_min, r.class_max) }}</span>
                </div>
              </div>
              <span v-if="r.current_cfs != null" class="text-sm font-semibold tabular-nums text-neutral-700 dark:text-neutral-300 shrink-0">
                {{ Math.round(r.current_cfs).toLocaleString() }}<span class="text-xs font-normal text-neutral-400 ml-0.5">cfs</span>
              </span>
              <button
                class="shrink-0 px-2.5 py-1.5 rounded-md text-xs font-medium bg-primary-600 hover:bg-primary-700 text-white transition-colors min-h-[36px]"
                :disabled="addingMineId === r.id"
                @click="addMyRun(r)"
              >
                <span v-if="addingMineId === r.id" class="flex items-center gap-1">
                  <span class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                </span>
                <span v-else>Add</span>
              </button>
            </li>
          </ul>
        </template>

        <!-- ── Community tab ── -->
        <template v-else-if="activeTab === 'community'">
          <!-- Search input -->
          <input
            v-model="discoverQuery"
            type="search"
            placeholder="Search runs by name, river…"
            class="w-full text-sm bg-neutral-100 dark:bg-neutral-900 rounded-md px-3 py-2 text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
            @input="onDiscoverInput"
          />

          <!-- Filters toggle -->
          <div>
            <button
              class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors"
              :class="filtersVisible
                ? 'bg-primary-50 dark:bg-primary-950/40 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300'
                : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-neutral-300'"
              @click="filtersVisible = !filtersVisible"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L13 10.414V15a1 1 0 01-.553.894l-4 2A1 1 0 017 17v-6.586L3.293 6.707A1 1 0 013 6V3z" clip-rule="evenodd"/>
              </svg>
              Filters
              <span v-if="activeFilterCount > 0" class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary-600 text-white text-[10px] font-bold">{{ activeFilterCount }}</span>
            </button>

            <!-- Filter fields — collapsed by default, shown as chips on mobile -->
            <div v-if="filtersVisible" class="mt-2 flex flex-wrap items-center gap-2">
              <input
                v-model.number="discoverMinClass"
                type="number" min="1" max="6" step="0.5"
                placeholder="Min class"
                class="w-24 text-xs bg-neutral-100 dark:bg-neutral-900 rounded-md px-2 py-1.5 text-neutral-700 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
                @change="loadDiscoverRuns()"
              />
              <input
                v-model.number="discoverMaxClass"
                type="number" min="1" max="6" step="0.5"
                placeholder="Max class"
                class="w-24 text-xs bg-neutral-100 dark:bg-neutral-900 rounded-md px-2 py-1.5 text-neutral-700 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
                @change="loadDiscoverRuns()"
              />
              <button
                class="px-2.5 py-1.5 text-xs rounded-md border transition-colors"
                :class="discoverHasGauge
                  ? 'bg-primary-100 dark:bg-primary-900/50 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300'
                  : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600'"
                @click="discoverHasGauge = !discoverHasGauge; loadDiscoverRuns()"
              >Has gauge</button>
              <input
                v-model="discoverHandle"
                type="text"
                placeholder="@handle"
                class="w-28 text-xs bg-neutral-100 dark:bg-neutral-900 rounded-md px-2 py-1.5 text-neutral-700 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
                @input="onDiscoverInput"
              />
            </div>
          </div>

          <!-- Results + optional preview side panel -->
          <div class="flex gap-3 min-h-0">
            <!-- Results list -->
            <div class="flex-1 min-w-0">
              <div v-if="discoverLoading" class="space-y-2 py-2">
                <div v-for="i in 5" :key="i" class="flex items-center gap-3 px-2 py-2.5">
                  <div class="flex-1 space-y-2">
                    <div class="h-4 w-3/4 rounded bg-neutral-100 dark:bg-neutral-800 animate-pulse"/>
                    <div class="h-3 w-1/2 rounded bg-neutral-100 dark:bg-neutral-800 animate-pulse"/>
                  </div>
                  <div class="h-7 w-20 rounded bg-neutral-100 dark:bg-neutral-800 animate-pulse"/>
                </div>
              </div>
              <div v-else-if="discoverRuns.length === 0" class="text-center py-10 text-neutral-400 text-sm">
                {{ discoverQuery.length >= 2 ? `No runs matching "${discoverQuery}"` : 'No runs found. Try a different search.' }}
              </div>
              <ul v-else class="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-[50vh] overflow-y-auto">
                <li
                  v-for="run in discoverRuns"
                  :key="run.id"
                  class="py-2.5 px-2 rounded-lg transition-colors cursor-pointer"
                  :class="previewRun?.id === run.id ? 'bg-primary-50/70 dark:bg-primary-950/30' : 'hover:bg-neutral-50 dark:hover:bg-neutral-900/50'"
                  @click="previewRun = run"
                >
                  <div class="flex items-start gap-3">
                    <div class="min-w-0 flex-1">
                      <!-- Handle badge -->
                      <div class="flex items-center gap-1.5 mb-0.5">
                        <span
                          class="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                          :class="run.is_official
                            ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'"
                        >
                          <span v-if="run.is_official">⭐</span>
                          {{ run.is_official ? 'H2OFlows' : `@${run.handle}` }}
                        </span>
                        <!-- Fork attribution -->
                        <span v-if="run.original_author_handle" class="text-[10px] text-neutral-400 dark:text-neutral-500">
                          Forked from @{{ run.original_author_handle }}
                        </span>
                      </div>
                      <p class="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{{ run.name }}</p>
                      <!-- Meta row -->
                      <div class="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                        <span v-if="run.class_min || run.class_max" class="text-xs text-neutral-500 dark:text-neutral-400">
                          {{ classRange(run.class_min, run.class_max) }}
                        </span>
                        <span v-if="run.length_mi" class="text-xs text-neutral-400">{{ run.length_mi.toFixed(1) }}mi</span>
                        <span v-if="run.gauge_name" class="text-xs text-neutral-400 truncate max-w-30">📍 {{ run.gauge_name }}</span>
                        <span class="text-xs text-neutral-400">{{ run.upvote_count }} ▲</span>
                        <span v-if="run.fork_count > 0" class="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                          {{ run.fork_count }} variant{{ run.fork_count !== 1 ? 's' : '' }}
                        </span>
                        <span v-if="run.last_forked_at" class="text-xs text-neutral-300 dark:text-neutral-600">{{ fmtDate(run.last_forked_at) }}</span>
                      </div>
                    </div>

                    <!-- Action buttons -->
                    <div class="flex items-center gap-1 shrink-0" @click.stop>
                      <!-- Curated run: fork only (creates user_reaches row) -->
                      <template v-if="run.is_official">
                        <button
                          class="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white transition-colors min-h-[36px]"
                          :disabled="forkingId === run.id"
                          @click="startFork(run)"
                        >
                          <span v-if="forkingId === run.id" class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                          <template v-else>Fork &amp; Add</template>
                        </button>
                      </template>

                      <!-- Community run: instant Add (reference) as primary action -->
                      <!-- Split button on desktop; single Add button on mobile (uses "Adding to" chip) -->
                      <template v-else>
                        <!-- Added state -->
                        <span v-if="addedReferenceIds.has(run.id)" class="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-green-600 text-white min-h-[36px]">
                          ✓ Added
                        </span>
                        <!-- Loading state -->
                        <span v-else-if="addingReferenceId === run.id" class="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-primary-600 text-white min-h-[36px]">
                          <span class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                        </span>
                        <!-- Split button: primary Add + ⌄ picker (desktop); single Add (mobile) -->
                        <div v-else class="flex items-stretch rounded-md overflow-hidden shadow-sm">
                          <!-- Primary Add -->
                          <button
                            class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white transition-colors min-h-[36px]"
                            :disabled="addingReferenceId === run.id"
                            @click="doAddReference(run.id, selectedDashboardId)"
                          >Add</button>
                          <!-- Dropdown arrow for different dashboard — desktop only -->
                          <div class="relative hidden sm:block">
                            <button
                              class="flex items-center justify-center w-6 h-full bg-primary-700 hover:bg-primary-800 text-white transition-colors border-l border-primary-500"
                              title="Add to a different dashboard"
                              @click.stop="splitOpenForId = splitOpenForId === run.id ? null : run.id"
                            >
                              <svg class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd"/>
                              </svg>
                            </button>
                            <!-- Dashboard picker dropdown -->
                            <div
                              v-if="splitOpenForId === run.id"
                              class="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg py-1"
                            >
                              <p class="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Add to dashboard</p>
                              <button
                                v-for="d in db.dashboards.value"
                                :key="d.id"
                                class="w-full text-left px-3 py-1.5 text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                                :class="d.id === selectedDashboardId ? 'font-medium text-primary-700 dark:text-primary-300' : ''"
                                @click.stop="doAddReference(run.id, d.id); splitOpenForId = null"
                              >{{ d.name }}</button>
                              <div class="border-t border-neutral-100 dark:border-neutral-800 my-1"/>
                              <!-- New dashboard: create it, then add this run to it -->
                              <div v-if="creatingDashForId === run.id" class="px-2 py-1.5 flex items-center gap-1" @click.stop>
                                <input
                                  v-model="newDashName"
                                  type="text"
                                  maxlength="60"
                                  placeholder="Dashboard name"
                                  class="flex-1 min-w-0 px-2 py-1 text-xs rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                  @keydown.enter.stop="createDashAndAdd(run.id)"
                                  @keydown.esc.stop="creatingDashForId = null; newDashName = ''"
                                >
                                <button
                                  class="shrink-0 px-2 py-1 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
                                  :disabled="!newDashName.trim() || creatingDash"
                                  @click.stop="createDashAndAdd(run.id)"
                                >Add</button>
                              </div>
                              <button
                                v-else
                                class="w-full text-left px-3 py-1.5 text-xs text-primary-600 dark:text-primary-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                                @click.stop="creatingDashForId = run.id; newDashName = ''"
                              >+ New dashboard</button>
                            </div>
                          </div>
                        </div>

                        <!-- Overflow ⋯ menu with Fork option -->
                        <div class="relative">
                          <button
                            class="p-1.5 rounded-md text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                            title="More options"
                            @click.stop="overflowOpenForId = overflowOpenForId === run.id ? null : run.id"
                          >
                            <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z"/>
                            </svg>
                          </button>
                          <div
                            v-if="overflowOpenForId === run.id"
                            class="absolute right-0 top-full mt-1 z-50 min-w-[200px] rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg py-1"
                          >
                            <button
                              class="w-full text-left px-3 py-2 text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                              :disabled="forkingId === run.id"
                              @click.stop="overflowOpenForId = null; startFork(run)"
                            >
                              <p class="font-medium">Fork &amp; customize</p>
                              <p class="text-neutral-400 dark:text-neutral-500 mt-0.5">Your own editable copy</p>
                            </button>
                          </div>
                        </div>
                      </template>
                    </div>
                  </div>

                  <!-- Inline fork dashboard picker — shown after fork completes (multi-dash) -->
                  <div
                    v-if="forkedForRunId === run.id && pendingForkedSlug"
                    class="mt-2 pl-2 flex flex-wrap items-center gap-2"
                    @click.stop
                  >
                    <span class="text-xs text-neutral-500">Add fork to:</span>
                    <button
                      v-for="d in db.dashboards.value"
                      :key="d.id"
                      class="px-2 py-1 rounded-md text-xs border transition-colors"
                      :class="addingToDashId === d.id
                        ? 'bg-primary-100 border-primary-300 text-primary-700 cursor-default'
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-primary-400 hover:bg-primary-50/60 text-neutral-600 dark:text-neutral-300'"
                      :disabled="addingToDashId != null"
                      @click="confirmForkDashboard(d.id)"
                    >{{ d.name }}</button>
                    <button class="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 ml-1" @click="cancelFork">Cancel</button>
                  </div>
                </li>
              </ul>

              <!-- Load more -->
              <div v-if="discoverHasMore && !discoverLoading" class="pt-2 text-center">
                <button
                  class="text-xs text-primary-500 hover:text-primary-700 dark:text-primary-400 font-medium"
                  @click="loadMore"
                >Load more</button>
              </div>
            </div>

            <!-- Preview side panel — desktop only, auto-driven by selected row -->
            <div
              v-if="previewRun"
              class="hidden sm:block w-52 shrink-0 border-l border-neutral-100 dark:border-neutral-800 pl-3 space-y-3 max-h-[50vh] overflow-y-auto"
            >
              <div class="flex items-center justify-between">
                <p class="text-xs font-semibold text-neutral-700 dark:text-neutral-200 truncate">{{ previewRun.name }}</p>
                <button class="shrink-0 text-neutral-300 hover:text-neutral-500 dark:text-neutral-600 dark:hover:text-neutral-400" @click="previewRun = null">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
                </button>
              </div>
              <dl class="space-y-1.5 text-xs">
                <div class="flex justify-between gap-2">
                  <dt class="text-neutral-400 shrink-0">Author</dt>
                  <dd class="text-neutral-700 dark:text-neutral-200 text-right truncate">
                    {{ previewRun.is_official ? '⭐ H2OFlows' : `@${previewRun.handle}` }}
                  </dd>
                </div>
                <div v-if="previewRun.class_min || previewRun.class_max" class="flex justify-between gap-2">
                  <dt class="text-neutral-400 shrink-0">Class</dt>
                  <dd class="text-neutral-700 dark:text-neutral-200">{{ classRange(previewRun.class_min, previewRun.class_max) }}</dd>
                </div>
                <div v-if="previewRun.length_mi" class="flex justify-between gap-2">
                  <dt class="text-neutral-400 shrink-0">Length</dt>
                  <dd class="text-neutral-700 dark:text-neutral-200">{{ previewRun.length_mi.toFixed(1) }} mi</dd>
                </div>
                <div v-if="previewRun.gauge_name" class="flex justify-between gap-2">
                  <dt class="text-neutral-400 shrink-0">Gauge</dt>
                  <dd class="text-neutral-700 dark:text-neutral-200 truncate text-right">{{ previewRun.gauge_name }}</dd>
                </div>
                <div class="flex justify-between gap-2">
                  <dt class="text-neutral-400 shrink-0">Upvotes</dt>
                  <dd class="text-neutral-700 dark:text-neutral-200">{{ previewRun.upvote_count }}</dd>
                </div>
                <div v-if="previewRun.original_author_handle" class="flex justify-between gap-2">
                  <dt class="text-neutral-400 shrink-0">Forked from</dt>
                  <dd class="text-neutral-700 dark:text-neutral-200 truncate text-right">@{{ previewRun.original_author_handle }}</dd>
                </div>
                <div v-if="previewRun.last_forked_at" class="flex justify-between gap-2">
                  <dt class="text-neutral-400 shrink-0">Last forked</dt>
                  <dd class="text-neutral-700 dark:text-neutral-200">{{ fmtDate(previewRun.last_forked_at) }}</dd>
                </div>
                <div class="flex justify-between gap-2">
                  <dt class="text-neutral-400 shrink-0">Put-in</dt>
                  <dd class="text-neutral-700 dark:text-neutral-200 font-mono">{{ previewRun.put_in_lat.toFixed(3) }}, {{ previewRun.put_in_lng.toFixed(3) }}</dd>
                </div>
              </dl>
              <!-- Fork action in preview panel (desktop) -->
              <div v-if="!previewRun.is_official" class="pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  class="w-full text-left text-xs text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  :disabled="forkingId === previewRun.id"
                  @click="startFork(previewRun)"
                >
                  <span v-if="forkingId === previewRun.id" class="flex items-center gap-1">
                    <span class="w-3 h-3 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin"/>
                    Forking…
                  </span>
                  <template v-else>
                    <span class="font-medium">Fork &amp; customize</span>
                    <span class="block text-neutral-400 mt-0.5">Your own editable copy</span>
                  </template>
                </button>
              </div>
            </div>
          </div>
        </template>

        <!-- ── Gauges tab ── -->
        <template v-if="activeTab === 'gauges'">
          <!-- Custom gauges section -->
          <div class="space-y-1">
            <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wide px-1">My Custom Gauges</p>
            <input
              v-model="gaugeTabQuery"
              type="search"
              placeholder="Filter custom gauges…"
              class="w-full text-sm bg-neutral-100 dark:bg-neutral-900 rounded-md px-3 py-2 text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <div v-if="customGaugesLoading" class="space-y-2 py-1">
              <div v-for="i in 3" :key="i" class="flex items-center gap-3 px-2 py-2">
                <div class="flex-1 h-4 rounded bg-neutral-100 dark:bg-neutral-800 animate-pulse"/>
                <div class="h-7 w-16 rounded bg-neutral-100 dark:bg-neutral-800 animate-pulse"/>
              </div>
            </div>
            <div v-else-if="customGauges.length === 0" class="text-xs text-neutral-400 px-1 py-2">
              No custom gauges yet.
              <NuxtLink to="/my/runs/new" class="text-primary-500 hover:underline" @click="open = false">Create one →</NuxtLink>
            </div>
            <ul v-else class="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-[28vh] overflow-y-auto">
              <li
                v-for="cg in filteredCustomGauges"
                :key="cg.id"
                class="flex items-center gap-3 py-2 px-2 hover:bg-primary-50 dark:hover:bg-primary-950/30 rounded-lg transition-colors"
              >
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{{ cg.name }}</p>
                  <p v-if="cg.last_value_cfs != null" class="text-xs text-neutral-400">
                    {{ Math.round(cg.last_value_cfs).toLocaleString() }} {{ cg.unit }}
                  </p>
                </div>
                <button
                  class="shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                  :class="addedCustomIds.has(cg.id) ? 'bg-green-600 text-white' : 'bg-primary-600 hover:bg-primary-700 text-white'"
                  :disabled="addingCustomId === cg.id || addedCustomIds.has(cg.id)"
                  @click="addCustomGauge(cg)"
                >
                  <span v-if="addingCustomId === cg.id" class="flex items-center gap-1">
                    <span class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                    Adding…
                  </span>
                  <span v-else-if="addedCustomIds.has(cg.id)">Added ✓</span>
                  <span v-else>Add</span>
                </button>
              </li>
            </ul>
          </div>

          <!-- Third-Party gauge search -->
          <div class="space-y-1.5 pt-1 border-t border-neutral-100 dark:border-neutral-800">
            <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wide px-1">Third-Party Gauges</p>
            <div class="flex gap-2">
              <select
                v-model="gaugeState"
                class="shrink-0 text-xs rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 px-2 py-1.5"
                @change="onGaugeInput"
              >
                <option value="" disabled>State…</option>
                <option v-for="s in US_STATES" :key="s.code" :value="s.code">{{ s.code }} — {{ s.name }}</option>
              </select>
              <input
                v-model="gaugeQuery"
                type="search"
                placeholder="Station name or ID…"
                class="flex-1 text-sm bg-neutral-100 dark:bg-neutral-900 rounded-md px-3 py-1.5 text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
                @input="onGaugeInput"
              />
            </div>
            <p v-if="gaugeState === 'CO'" class="text-[10px] text-neutral-400 px-1">USGS + Colorado DWR (search by name or station abbreviation).</p>
            <p v-else-if="gaugeState" class="text-[10px] text-neutral-400 px-1">USGS for {{ gaugeState }}. Select CO to also include Colorado DWR.</p>
            <p v-else class="text-[10px] text-amber-500 px-1">Select a state to search.</p>
            <div v-if="gaugeLoading" class="space-y-2 py-1">
              <div v-for="i in 3" :key="i" class="flex items-center gap-3 px-2 py-2">
                <div class="flex-1 h-4 rounded bg-neutral-100 dark:bg-neutral-800 animate-pulse"/>
                <div class="h-7 w-16 rounded bg-neutral-100 dark:bg-neutral-800 animate-pulse"/>
              </div>
            </div>
            <div v-else-if="gaugeQuery.trim() && gaugeResults.length === 0 && !gaugeLoading" class="text-xs text-neutral-400 px-1 py-2">
              No gauges found for "{{ gaugeQuery }}"{{ gaugeState ? ` in ${gaugeState}` : '' }}.
            </div>
            <ul v-else-if="gaugeResults.length > 0" class="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-[28vh] overflow-y-auto">
              <li
                v-for="g in gaugeResults"
                :key="`${g.source}:${g.external_id}`"
                class="flex items-center gap-3 py-2 px-2 hover:bg-primary-50 dark:hover:bg-primary-950/30 rounded-lg transition-colors"
              >
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{{ g.name }}</p>
                  <p class="text-xs text-neutral-400 font-mono">{{ g.source.toUpperCase() }} · {{ g.external_id }}</p>
                </div>
                <button
                  class="shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                  :class="addedGaugeKeys.has(`${g.source}:${g.external_id}`) ? 'bg-green-600 text-white' : 'bg-primary-600 hover:bg-primary-700 text-white'"
                  :disabled="addingGaugeId === `${g.source}:${g.external_id}` || addedGaugeKeys.has(`${g.source}:${g.external_id}`)"
                  @click="addGaugeResult(g)"
                >
                  <span v-if="addingGaugeId === `${g.source}:${g.external_id}`" class="flex items-center gap-1">
                    <span class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                    Adding…
                  </span>
                  <span v-else-if="addedGaugeKeys.has(`${g.source}:${g.external_id}`)">Added ✓</span>
                  <span v-else>Add</span>
                </button>
              </li>
            </ul>
          </div>
        </template>

      </div>
    </template>
    <template #footer>
      <div class="flex items-center justify-between">
        <!-- "Create a new run →" footer link -->
        <button
          class="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium"
          @click="handleCreateRun"
        >Create a new run →</button>
        <UButton variant="ghost" color="neutral" size="sm" @click="open = false">Close</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { WatchedGauge } from '~/stores/watchlist'
import { classRange } from '~/utils/classRating'

const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(defineProps<{
  initialTab?: 'mine' | 'discover' | 'community'
}>(), { initialTab: 'mine' })

interface AddedExternalPayload {
  kind: 'reach' | 'custom_gauge'
  reachId?: string
  reachSlug?: string
  customGaugeId?: string
}
const emit = defineEmits<{
  (e: 'add', gauge: Omit<WatchedGauge, 'watchState' | 'activeSince'>, dashboardId: string | null): void
  (e: 'addedExternal', payload?: AddedExternalPayload): void
  (e: 'create-run'): void
}>()

const { apiBase } = useRuntimeConfig().public
const { getToken } = useAuth()
const db = useDashboards()
const { addReachToWatchlist, addUserReachToWatchlist, addReferenceToWatchlist } = useWatchlistSync()
const toast = useToast()

onMounted(() => { if (!db.loaded.value) db.load() })

const selectedDashboardId = ref<string | null>(db.activeDashboardId.value)
watch(() => db.activeDashboardId.value, (id) => {
  if (!selectedDashboardId.value || !db.dashboards.value.find(d => d.id === selectedDashboardId.value)) {
    selectedDashboardId.value = id
  }
})

const selectedDashboardName = computed(() => {
  if (!selectedDashboardId.value) return 'dashboard'
  return db.dashboards.value.find(d => d.id === selectedDashboardId.value)?.name ?? 'dashboard'
})

// Dashboard chip dropdown
const dashChipOpen = ref(false)
const dashChipWrap = ref<HTMLElement | null>(null)

// Close dashboard chip on outside click
function onDashChipOutsideClick(e: MouseEvent) {
  if (dashChipWrap.value && !dashChipWrap.value.contains(e.target as Node)) {
    dashChipOpen.value = false
  }
}
watch(dashChipOpen, (open) => {
  if (open) document.addEventListener('click', onDashChipOutsideClick)
  else document.removeEventListener('click', onDashChipOutsideClick)
})

// ── Tabs ──────────────────────────────────────────────────────────────────────
// 'discover' key renamed to 'community' label; keep backward compat via alias
type TabKey = 'mine' | 'community' | 'gauges'
const TABS: { key: TabKey; label: string }[] = [
  { key: 'mine',      label: 'Mine' },
  { key: 'community', label: 'Community' },
  { key: 'gauges',    label: 'Gauges' },
]

// Support legacy 'discover' initialTab by mapping to 'community'
function normalizeTab(t: string): TabKey {
  if (t === 'discover') return 'community'
  if (t === 'mine' || t === 'community' || t === 'gauges') return t as TabKey
  return 'mine'
}

const activeTab = ref<TabKey>(normalizeTab(props.initialTab))

function setTab(key: TabKey) {
  activeTab.value = key
  if (key === 'mine' && myRuns.value.length === 0 && !myRunsLoading.value) loadMyRuns()
  if (key === 'community' && discoverRuns.value.length === 0) loadDiscoverRuns()
  if (key === 'gauges' && customGauges.value.length === 0) loadCustomGauges()
}

watch(open, (v) => {
  if (!v) {
    activeTab.value = normalizeTab(props.initialTab)
    myRunsQuery.value = ''
    discoverQuery.value = ''
    discoverRuns.value = []
    previewRun.value = null
    forkedForRunId.value = null
    pendingForkedSlug.value = null
    pendingForkedGaugeId.value = null
    gaugeQuery.value = ''
    gaugeState.value = ''
    gaugeResults.value = []
    gaugeTabQuery.value = ''
    addedGaugeKeys.value = new Set()
    addedCustomIds.value = new Set()
    filtersVisible.value = false
    dashChipOpen.value = false
    splitOpenForId.value = null
    overflowOpenForId.value = null
  } else {
    if (db.activeDashboardId.value) selectedDashboardId.value = db.activeDashboardId.value
    activeTab.value = normalizeTab(props.initialTab)
    if (activeTab.value === 'mine') loadMyRuns()
    else if (activeTab.value === 'community') loadDiscoverRuns()
    else if (activeTab.value === 'gauges') loadCustomGauges()
  }
})

// ── My Runs tab (V13) ─────────────────────────────────────────────────────────
interface MyRunSummary {
  id: string; slug: string; name: string
  river_name: string | null
  class_min: number | null; class_max: number | null
  current_cfs: number | null
  gauge_id: string | null
}
const myRuns        = ref<MyRunSummary[]>([])
const myRunsLoading = ref(false)
const myRunsQuery   = ref('')
const addingMineId  = ref<string | null>(null)

const filteredMyRuns = computed((): MyRunSummary[] => {
  const q = myRunsQuery.value.trim().toLowerCase()
  if (!q) return myRuns.value
  return myRuns.value.filter(r =>
    r.name.toLowerCase().includes(q) ||
    (r.river_name?.toLowerCase().includes(q) ?? false)
  )
})

async function loadMyRuns() {
  myRunsLoading.value = true
  try {
    const token = await getToken()
    if (!token) return
    const res = await fetch(`${apiBase}/api/v1/me/reaches`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) myRuns.value = await res.json() ?? []
  } catch { /* non-fatal */ } finally {
    myRunsLoading.value = false
  }
}

async function addMyRun(r: MyRunSummary) {
  addingMineId.value = r.id
  try {
    if (r.gauge_id) {
      await addUserReachToWatchlist(r.gauge_id, r.slug, selectedDashboardId.value)
    } else {
      await addReachToWatchlist(r.slug, selectedDashboardId.value)
    }
    emit('addedExternal', { kind: 'reach', reachId: r.id, reachSlug: r.slug })
    open.value = false
  } finally {
    addingMineId.value = null
  }
}

// ── Community tab (was Discover, V14-V19, V23) ────────────────────────────────
interface DiscoverRun {
  id: string; slug: string; name: string; handle: string
  is_official: boolean
  class_min: number | null; class_max: number | null
  length_mi: number | null
  upvote_count: number
  last_forked_at: string | null
  gauge_name: string | null
  put_in_lng: number; put_in_lat: number
  original_author_handle: string | null
  fork_count: number
}

const discoverRuns     = ref<DiscoverRun[]>([])
const discoverLoading  = ref(false)
const discoverHasMore  = ref(false)
const discoverOffset   = ref(0)
const discoverQuery    = ref('')
const discoverMinClass = ref<number | null>(null)
const discoverMaxClass = ref<number | null>(null)
const discoverHasGauge = ref(false)
const discoverHandle   = ref('')
const previewRun       = ref<DiscoverRun | null>(null)
const filtersVisible   = ref(false)
const splitOpenForId   = ref<string | null>(null)
const overflowOpenForId = ref<string | null>(null)

// Inline "New dashboard" create-and-add (from the split-button picker)
const creatingDashForId = ref<string | null>(null)
const newDashName       = ref('')
const creatingDash      = ref(false)
async function createDashAndAdd(runId: string) {
  const name = newDashName.value.trim()
  if (!name || creatingDash.value) return
  creatingDash.value = true
  try {
    const d = await db.create(name)
    if (d) {
      selectedDashboardId.value = d.id
      await doAddReference(runId, d.id)
    }
  } finally {
    creatingDash.value = false
    creatingDashForId.value = null
    newDashName.value = ''
    splitOpenForId.value = null
  }
}

// Close per-row split-button / overflow menus on any outside click.
// Interactive children inside the menus use @click.stop, so they won't trigger this.
function closeRowMenus() {
  splitOpenForId.value = null
  overflowOpenForId.value = null
  creatingDashForId.value = null
  newDashName.value = ''
}
watch([splitOpenForId, overflowOpenForId], ([s, o]) => {
  if (s !== null || o !== null) document.addEventListener('click', closeRowMenus)
  else document.removeEventListener('click', closeRowMenus)
})

const activeFilterCount = computed(() => {
  let n = 0
  if (discoverMinClass.value != null) n++
  if (discoverMaxClass.value != null) n++
  if (discoverHasGauge.value) n++
  if (discoverHandle.value.trim()) n++
  return n
})

let discoverDebounce: ReturnType<typeof setTimeout> | null = null
function onDiscoverInput() {
  if (discoverDebounce) clearTimeout(discoverDebounce)
  discoverDebounce = setTimeout(loadDiscoverRuns, 350)
}

async function loadDiscoverRuns(append = false) {
  if (!append) { discoverOffset.value = 0; discoverRuns.value = [] }
  discoverLoading.value = true
  try {
    const params = new URLSearchParams({ limit: '20', offset: String(discoverOffset.value) })
    if (discoverQuery.value.trim()) params.set('q', discoverQuery.value.trim())
    if (discoverMinClass.value != null) params.set('min_class', String(discoverMinClass.value))
    if (discoverMaxClass.value != null) params.set('max_class', String(discoverMaxClass.value))
    if (discoverHasGauge.value) params.set('has_gauge', 'true')
    if (discoverHandle.value.trim()) params.set('handle', discoverHandle.value.trim().replace(/^@/, ''))
    const res = await fetch(`${apiBase}/api/v1/discover/runs?${params}`)
    if (!res.ok) return
    const data = await res.json()
    const items: DiscoverRun[] = data.items ?? []
    discoverRuns.value = append ? [...discoverRuns.value, ...items] : items
    discoverHasMore.value = data.has_more ?? false
    discoverOffset.value += items.length
    // Auto-select first result if none selected (desktop preview)
    if (!append && items.length > 0 && !previewRun.value) {
      previewRun.value = items[0] ?? null
    }
  } catch { /* non-fatal */ } finally {
    discoverLoading.value = false
  }
}

async function loadMore() {
  await loadDiscoverRuns(true)
}

// ── Reference flow (V6) — instant add ────────────────────────────────────────
const addingReferenceId   = ref<string | null>(null)
const addedReferenceIds   = ref<Set<string>>(new Set())

// startReference is still exported for callers that pass a run object
// (e.g., in case the parent uses it directly); internally we short-circuit
// to the selected dashboard immediately.
async function startReference(run: DiscoverRun) {
  await doAddReference(run.id, selectedDashboardId.value)
}

async function doAddReference(runId: string, dashId: string | null) {
  addingReferenceId.value = runId
  splitOpenForId.value = null
  overflowOpenForId.value = null
  try {
    await addReferenceToWatchlist(runId, dashId)
    addedReferenceIds.value = new Set([...addedReferenceIds.value, runId])
    const dashName = db.dashboards.value.find(d => d.id === dashId)?.name ?? 'dashboard'
    toast.add({ title: `Added to ${dashName}`, color: 'success', duration: 3000 })
    emit('addedExternal', { kind: 'reach', reachSlug: runId })
    setTimeout(() => {
      addedReferenceIds.value = new Set([...addedReferenceIds.value].filter(x => x !== runId))
    }, 3000)
  } finally {
    addingReferenceId.value = null
  }
}

// ── Fork flow (V17) ───────────────────────────────────────────────────────────
const forkingId        = ref<string | null>(null)
const forkedForRunId    = ref<string | null>(null)
const pendingForkedSlug = ref<string | null>(null)
const pendingForkedGaugeId = ref<string | null>(null)
const addingToDashId   = ref<string | null>(null)

async function startFork(run: DiscoverRun) {
  forkingId.value = run.id
  forkedForRunId.value = null
  pendingForkedSlug.value = null
  overflowOpenForId.value = null
  try {
    const token = await getToken()
    if (!token) return
    // curated runs live in reaches table — use slug-based fork endpoint
    // community runs live in user_reaches — use id-based fork endpoint
    const url = run.is_official
      ? `${apiBase}/api/v1/me/runs/fork-reach/${run.slug}`
      : `${apiBase}/api/v1/user-runs/${run.id}/fork`
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return
    const forked = await res.json()
    pendingForkedSlug.value = forked.slug ?? forked.id
    pendingForkedGaugeId.value = forked.gauge_id ?? null
    if (db.dashboards.value.length <= 1) {
      await confirmForkDashboard(selectedDashboardId.value)
    } else {
      forkedForRunId.value = run.id
    }
  } finally {
    forkingId.value = null
  }
}

async function confirmForkDashboard(dashId: string | null) {
  if (!pendingForkedSlug.value) return
  addingToDashId.value = dashId
  try {
    if (pendingForkedGaugeId.value) {
      await addUserReachToWatchlist(pendingForkedGaugeId.value, pendingForkedSlug.value, dashId)
    } else {
      await addReachToWatchlist(pendingForkedSlug.value, dashId)
    }
    emit('addedExternal', { kind: 'reach', reachSlug: pendingForkedSlug.value })
    open.value = false
  } finally {
    addingToDashId.value = null
    forkedForRunId.value = null
    pendingForkedSlug.value = null
    pendingForkedGaugeId.value = null
  }
}

function cancelFork() {
  forkedForRunId.value = null
  pendingForkedSlug.value = null
}

// ── "Create a new run →" footer ───────────────────────────────────────────────
function handleCreateRun() {
  open.value = false
  emit('create-run')
}

// ── Gauges tab ────────────────────────────────────────────────────────────────
const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
]

interface GaugeResult { name: string; external_id: string; source: string; lat: number | null; lng: number | null }
interface CustomGaugeSummary { id: string; slug: string; name: string; description: string | null; unit: string; last_value_cfs: number | null }

const gaugeQuery       = ref('')
const gaugeState       = ref('')
const gaugeResults     = ref<GaugeResult[]>([])
const gaugeLoading     = ref(false)
const addingGaugeId    = ref<string | null>(null)
const addedGaugeKeys   = ref<Set<string>>(new Set())
const customGauges     = ref<CustomGaugeSummary[]>([])
const customGaugesLoading = ref(false)
const addingCustomId   = ref<string | null>(null)
const addedCustomIds   = ref<Set<string>>(new Set())
const gaugeTabQuery    = ref('')

let gaugeDebounce: ReturnType<typeof setTimeout> | null = null
function onGaugeInput() {
  if (gaugeDebounce) clearTimeout(gaugeDebounce)
  gaugeDebounce = setTimeout(searchGauges, 350)
}

async function searchGauges() {
  const q = gaugeQuery.value.trim()
  if (!q || !gaugeState.value) { gaugeResults.value = []; return }
  gaugeLoading.value = true
  try {
    const params = new URLSearchParams({ q })
    if (gaugeState.value) params.set('state', gaugeState.value)
    const res = await fetch(`${apiBase}/api/v1/gauges/search-external?${params}`)
    if (!res.ok) return
    gaugeResults.value = await res.json() ?? []
  } catch { /* non-fatal */ } finally {
    gaugeLoading.value = false
  }
}

async function loadCustomGauges() {
  customGaugesLoading.value = true
  try {
    const token = await getToken()
    if (!token) return
    const res = await fetch(`${apiBase}/api/v1/me/custom-gauges`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const data = await res.json()
      customGauges.value = data.items ?? []
    }
  } catch { /* non-fatal */ } finally {
    customGaugesLoading.value = false
  }
}

const filteredCustomGauges = computed(() => {
  const q = gaugeTabQuery.value.trim().toLowerCase()
  if (!q) return customGauges.value
  return customGauges.value.filter(cg => cg.name.toLowerCase().includes(q))
})

async function addCustomGauge(cg: CustomGaugeSummary) {
  addingCustomId.value = cg.id
  try {
    const token = await getToken()
    if (!token) return
    const res = await fetch(`${apiBase}/api/v1/watchlist`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ custom_gauge_id: cg.id, dashboard_id: selectedDashboardId.value }),
    })
    if (!res.ok) return
    addedCustomIds.value = new Set([...addedCustomIds.value, cg.id])
    emit('addedExternal', { kind: 'custom_gauge', customGaugeId: cg.id })
    setTimeout(() => {
      addedCustomIds.value = new Set([...addedCustomIds.value].filter(id => id !== cg.id))
    }, 3000)
  } finally {
    addingCustomId.value = null
  }
}

async function addGaugeResult(g: GaugeResult) {
  const key = `${g.source}:${g.external_id}`
  addingGaugeId.value = key
  try {
    const token = await getToken()
    if (!token) return
    const res = await fetch(`${apiBase}/api/v1/me/gauges/add-external`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        external_id: g.external_id,
        source: g.source,
        name: g.name,
        lat: g.lat,
        lng: g.lng,
        dashboard_id: selectedDashboardId.value,
      }),
    })
    if (!res.ok) return
    addedGaugeKeys.value = new Set([...addedGaugeKeys.value, key])
    emit('addedExternal')
    setTimeout(() => {
      addedGaugeKeys.value = new Set([...addedGaugeKeys.value].filter(k => k !== key))
    }, 3000)
  } finally {
    addingGaugeId.value = null
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })
  } catch { return '' }
}
</script>
