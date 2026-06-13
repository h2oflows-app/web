<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950">
    <AppHeader />

    <!-- Unified sticky header: tab bar + controls bar in one block anchored at AppHeader bottom -->
    <div
      v-if="isAuthenticated && db.loaded.value"
      class="sticky top-[50px] z-20"
    >
      <DashboardTabBar
        v-if="db.dashboards.value.length"
        :dashboards="db.dashboards.value"
        :active-dashboard-id="db.activeDashboardId.value"
        @select="onSelectDashboard"
        @new="newDashboardOpen = true"
        @delete="onDeleteDashboard"
        @rename="(slug, name) => db.rename(slug, name)"
        @share="shareOpen = true"
      />

      <!-- Controls bar -->
      <div class="bg-neutral-50/95 dark:bg-neutral-950/95 backdrop-blur-sm border-b border-neutral-200 dark:border-neutral-800">
      <div class="max-w-5xl mx-auto px-4 py-2 flex items-center gap-1">
      <!-- Left items wrap their own overflow so Add gauge stays pinned right -->
      <div class="flex items-center gap-1 min-w-0 overflow-x-auto flex-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
        <template v-if="hasAnyContent">
          <!-- View mode -->
          <ToolbarButton
            v-for="m in VIEW_MODES"
            :key="m.key"
            :class="m.key === 'full' ? 'hidden sm:flex' : ''"
            :active="viewMode === m.key"
            :title="m.label"
            @click="setViewMode(m.key)"
          >
            <svg v-if="m.key === 'list'" class="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <line x1="2" y1="4" x2="14" y2="4"/><line x1="2" y1="8" x2="14" y2="8"/><line x1="2" y1="12" x2="14" y2="12"/>
            </svg>
            <svg v-else-if="m.key === 'comfortable'" class="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/>
              <rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>
            </svg>
            <svg v-else class="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="1" y="1" width="14" height="6" rx="1"/><rect x="1" y="9" width="14" height="6" rx="1"/>
            </svg>
          </ToolbarButton>

          <div class="h-4 w-px bg-neutral-200 dark:bg-neutral-700 mx-0.5" />

          <!-- Expand / Collapse all -->
          <ToolbarButton
            v-if="displaySections.length > 0 && (groupByState || groupByBasin)"
            :label="allExpanded ? 'Collapse' : 'Expand'"
            :title="allExpanded ? 'Collapse all sections' : 'Expand all sections'"
            @click="toggleAllSections"
          >
            <svg class="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <!-- Collapse: two chevrons pointing toward center -->
              <template v-if="allExpanded">
                <path d="M3 4l5 3 5-3"/>
                <path d="M3 12l5-3 5 3"/>
              </template>
              <!-- Expand: two chevrons pointing away from center -->
              <template v-else>
                <path d="M3 6l5-3 5 3"/>
                <path d="M3 10l5 3 5-3"/>
              </template>
            </svg>
          </ToolbarButton>

          <!-- Show gauge map toggle -->
          <ToolbarButton
            :active="mapVisible"
            :title="mapVisible ? 'Hide gauge map' : 'Show gauge map'"
            @click="mapVisible = !mapVisible"
          >
            <svg class="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5.5 2 1.5 4v10l4-2 5 2 4-2V2l-4 2-5-2z"/>
              <path d="M5.5 2v10"/>
              <path d="M10.5 4v10"/>
            </svg>
          </ToolbarButton>


        </template>
      </div>

        <!-- Grouping dropdown — pinned right, outside scroll group -->
        <div v-if="hasAnyContent" class="relative shrink-0" ref="groupingWrap">
          <ToolbarButton :active="!groupByState || !groupByBasin || groupByGauge" title="Group sections" @click="groupingOpen = !groupingOpen">
            <svg class="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="1.5" y="2" width="13" height="3" rx="0.5"/>
              <rect x="1.5" y="6.5" width="13" height="3" rx="0.5"/>
              <rect x="1.5" y="11" width="13" height="3" rx="0.5"/>
            </svg>
          </ToolbarButton>
          <div
            v-if="groupingOpen"
            class="absolute right-0 top-full mt-1 z-50 w-44 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg overflow-hidden py-1"
          >
            <button
              v-for="opt in groupingOptions"
              :key="opt.key"
              class="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              @click="opt.toggle()"
            >
              <svg
                class="w-3.5 h-3.5 shrink-0"
                :class="opt.active ? 'text-primary-500' : 'text-neutral-200 dark:text-neutral-700'"
                viewBox="0 0 20 20" fill="currentColor"
              >
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
              </svg>
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- Add gauge — pinned right, outside scroll group -->
        <ToolbarButton label="Add gauge" title="Add gauge" class="shrink-0 ml-1" @click="searchOpen = true">
          <svg class="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/>
          </svg>
        </ToolbarButton>
      </div>
      </div>
    </div>

    <main class="max-w-5xl mx-auto px-2 sm:px-4 py-6 pb-20 sm:pb-6 space-y-8">

      <!-- Empty state -->
      <div v-if="!hasAnyContent" class="mt-20 flex flex-col items-center gap-4 text-center">
        <div class="text-5xl">🌊</div>
        <h2 class="text-xl font-semibold">No runs yet</h2>
        <p class="text-neutral-500 max-w-sm text-sm">
          Search for a run or gauge and add it to your dashboard.
        </p>
        <UButton color="primary" @click="searchOpen = true">Find a gauge</UButton>
      </div>

      <!-- Reaches grouped by basin → river -->
      <template v-if="hasAnyContent">

        <template v-for="section in displaySections" :key="section.key">
        <section v-if="sectionHasVisibleContent(section)" class="mb-4">
          <!-- Outer (state) header: only when grouping by state -->
          <div v-if="section.name" class="flex items-center gap-2 w-full mb-3">
            <button class="flex items-center gap-2 shrink-0" @click="toggleSection(section.key)">
              <svg
                class="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 shrink-0 transition-transform duration-200"
                :class="{ 'rotate-90': !collapsedSections.has(section.key) }"
                viewBox="0 0 20 20" fill="currentColor"
              >
                <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
              </svg>
              <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">{{ section.name === '—' ? 'No State' : section.name }}</h1>
            </button>
            <div class="flex-1 h-px bg-neutral-300 dark:bg-neutral-700" />
            <span class="text-sm text-neutral-400 shrink-0">({{ section.reachCount }})</span>
          </div>

          <template v-if="!section.name || !collapsedSections.has(section.key)">
            <template v-for="sub in section.subSections" :key="sub.key">
            <div v-if="subSectionHasVisibleContent(sub)" :class="sub.name ? 'mb-4' : 'mb-2'">
              <!-- Inner (basin) header: only when grouping by basin -->
              <div v-if="sub.name" class="flex items-center gap-2 w-full mb-3">
                <button class="flex items-center gap-2 text-left shrink-0" @click="toggleSection(sub.key)">
                  <svg
                    class="w-3 h-3 text-neutral-400 dark:text-neutral-500 shrink-0 transition-transform duration-150"
                    :class="{ 'rotate-90': !collapsedSections.has(sub.key) }"
                    viewBox="0 0 20 20" fill="currentColor"
                  >
                    <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
                  </svg>
                  <h2 class="text-sm font-bold text-neutral-700 dark:text-neutral-200 uppercase tracking-wide">{{ sub.name }} Basin</h2>
                  <span class="text-xs text-neutral-400">({{ sub.reachCount }})</span>
                </button>
                <!-- Map-pin link to full basin page -->
                <NuxtLink
                  :to="`/basin/${slugifyBasin(sub.name)}`"
                  class="p-0.5 rounded text-primary-500 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors shrink-0"
                  title="Open basin page"
                >
                  <svg class="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M8 1.5 C 5.2 1.5 3 3.7 3 6.5 C 3 10.5 8 14.5 8 14.5 C 8 14.5 13 10.5 13 6.5 C 13 3.7 10.8 1.5 8 1.5 Z"/>
                    <circle cx="8" cy="6.5" r="1.7"/>
                  </svg>
                </NuxtLink>
                <div class="flex-1 h-px bg-neutral-200 dark:bg-neutral-700/60" />
              </div>

              <template v-if="!sub.name || !collapsedSections.has(sub.key)">
              <!-- Reaches grouped by river -->
              <div v-if="sub.rivers.some(r => riverHasVisibleContent(r))" class="mb-2">
                <template v-for="river in sub.rivers" :key="river.name">
                <div v-if="riverHasVisibleContent(river)" class="first:mt-0" :class="showRivers ? 'mt-4' : 'mt-1.5'">
                  <!-- River section divider -->
                  <div v-if="showRivers" class="flex items-center gap-2 mb-2">
                    <svg class="w-4 h-4 text-primary-500/70 dark:text-primary-400/70 shrink-0" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                      <path d="M4 14c3-6 6-9 8-9s5 9 8 9 5-9 8-9" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                      <path d="M4 22c3-6 6-9 8-9s5 9 8 9 5-9 8-9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.6"/>
                    </svg>
                    <span class="text-base font-semibold text-primary-600 dark:text-primary-400 shrink-0">{{ river.name }}</span>
                    <!-- Inline basin-reassignment editor (only when basin grouping is on) -->
                    <template v-if="river.riverId && groupByBasin">
                      <template v-if="editingRiverId === river.riverId">
                        <input
                          v-model="editingRiverBasinName"
                          type="text"
                          maxlength="80"
                          placeholder="Basin name"
                          class="text-xs bg-white dark:bg-neutral-800 border border-primary-400 rounded px-1.5 py-0.5 w-28 shrink-0"
                          @keydown.enter="saveRiverBasinOverride(river)"
                          @keydown.esc="cancelRiverBasinEdit"
                        />
                        <button
                          class="shrink-0 p-0.5 rounded text-primary-500 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                          title="Save basin"
                          @click="saveRiverBasinOverride(river)"
                        >
                          <svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                        </button>
                        <button
                          v-if="riverBasinOverrides.has(river.riverId)"
                          class="shrink-0 p-0.5 rounded text-neutral-400 hover:text-red-500 dark:text-neutral-500 dark:hover:text-red-400 transition-colors"
                          title="Reset to default basin"
                          @click="deleteRiverBasinOverride(river)"
                        >
                          <svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
                        </button>
                        <button
                          v-if="editingRiverBasinName === editingRiverBasinInitial"
                          class="shrink-0 p-0.5 rounded text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 transition-colors"
                          title="Cancel"
                          @click="cancelRiverBasinEdit"
                        >
                          <svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
                        </button>
                      </template>
                      <button
                        v-else
                        class="shrink-0 p-0.5 rounded text-neutral-300 dark:text-neutral-600 hover:text-neutral-500 dark:hover:text-neutral-400 transition-colors"
                        title="Move river to a different basin"
                        @click="startRiverBasinEdit(river)"
                      >
                        <svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zm-2.207 2.207L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
                      </button>
                    </template>
                    <div class="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
                  </div>
                  <!-- Cards wrapper -->
                  <template v-if="groupByGauge">
                    <template v-for="split in [splitReachGroups(river.reaches)]" :key="'split'">
                      <div v-if="split.gaugeGroups.length > 0" :class="viewMode === 'list' ? 'space-y-1.5' : cardGridClass">
                        <GaugeRunGroup
                          v-for="group in split.gaugeGroups"
                          :key="group.lead.id"
                          :lead-gauge="group.lead"
                          :reach-items="group.all"
                          :density="viewMode"
                          :hide-river-name="true"
                          @open="(g, mode) => openGauge(g, mode)"
                          @remove-group="group.all.forEach(g => removeAndSync(g.id, g.contextReachSlug))"
                        />
                      </div>
                      <!-- Ungrouped: list = one card; card modes = individual cards in grid -->
                      <template v-if="split.ungrouped.length > 0">
                        <DashboardRunGroup
                          v-if="viewMode === 'list'"
                          :reaches="split.ungrouped"
                          density="list"
                          :class="split.gaugeGroups.length > 0 ? 'mt-1.5' : ''"
                          @open="(g, mode) => openGauge(g, mode)"
                          @remove="(g) => removeAndSync(g.id, g.contextReachSlug)"
                        />
                        <div v-else :class="[cardGridClass, split.gaugeGroups.length > 0 ? 'mt-1.5' : '']">
                          <DashboardRunGroup
                            v-for="reach in split.ungrouped"
                            :key="`${reach.id}::${reach.contextReachSlug}`"
                            :reaches="[reach]"
                            :density="viewMode"
                              @open="(g, mode) => openGauge(g, mode)"
                            @remove="(g) => removeAndSync(g.id, g.contextReachSlug)"
                          />
                        </div>
                      </template>
                    </template>
                  </template>
                  <template v-else>
                    <!-- List: all reaches in one grouped card (skip if empty — empty container shows as phantom hr) -->
                    <DashboardRunGroup
                      v-if="viewMode === 'list' && river.reaches.length > 0"
                      :reaches="river.reaches"
                      density="list"
                      @open="(g, mode) => openGauge(g, mode)"
                      @remove="(g) => removeAndSync(g.id, g.contextReachSlug)"
                    />
                    <!-- Card modes: each reach = own card in grid -->
                    <div v-else-if="viewMode !== 'list' && river.reaches.length > 0" :class="cardGridClass">
                      <DashboardRunGroup
                        v-for="reach in river.reaches"
                        :key="`${reach.id}::${reach.contextReachSlug}`"
                        :reaches="[reach]"
                        :density="viewMode"
                          @open="(g, mode) => openGauge(g, mode)"
                        @remove="(g) => removeAndSync(g.id, g.contextReachSlug)"
                      />
                    </div>
                  </template>
                <!-- User reaches inline — always flat, no gauge grouping -->
                <template v-if="river.userReaches.length > 0">
                  <div v-if="viewMode === 'list'" class="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden mt-1.5">
                    <div
                      v-for="r in river.userReaches"
                      :key="r.id"
                      class="flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors border-b border-neutral-100/50 dark:border-neutral-800/50 last:border-b-0 cursor-pointer"
                      @click="openUserReach(r)"
                    >
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-1 min-w-0">
                          <span class="text-sm font-medium text-neutral-700 dark:text-neutral-300 truncate">{{ r.name }}</span>
                          <!-- Referenced run: fork-to-edit. Own run: edit link. -->
                          <button v-if="r.is_reference" :disabled="forkingRefId === r.id" class="shrink-0 p-0.5 rounded text-neutral-300 dark:text-neutral-600 hover:text-primary-500 dark:hover:text-primary-400 transition-colors disabled:opacity-40" title="Fork to edit" @click.stop="forkReferencedRun(r)">
                            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="8" r="2.5"/><path d="M6 8.5v7M18 10.5c0 3-4 3-6 4.5"/></svg>
                          </button>
                          <NuxtLink v-else :to="`/my/runs/${r.slug}`" class="shrink-0 p-0.5 rounded text-neutral-300 dark:text-neutral-600 hover:text-primary-500 dark:hover:text-primary-400 transition-colors" title="Edit run" @click.stop>
                            <svg class="w-3 h-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 3H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-5M13 3h4m0 0v4m0-4L9 11"/></svg>
                          </NuxtLink>
                        </div>
                        <div v-if="r.author_handle || r.long_name" class="flex items-center gap-1 mt-0.5">
                          <span v-if="r.author_handle" class="text-xs text-neutral-400 dark:text-neutral-500 shrink-0">@{{ r.author_handle }}</span>
                          <span v-if="r.author_handle && r.long_name" class="text-xs text-neutral-300 dark:text-neutral-600">·</span>
                          <span v-if="r.long_name" class="text-xs text-neutral-400 dark:text-neutral-500 truncate">{{ r.long_name }}</span>
                        </div>
                      </div>
                      <div class="w-44 shrink-0 hidden sm:block h-6 opacity-60 pointer-events-none">
                        <GaugeSparkline v-if="r.gauge_id" :gauge-id="r.gauge_id" :flow-status="(r.flow_status as any)" :color="urBandHex(r)" compact />
                        <CustomGaugeSparkline v-else-if="r.custom_gauge_slug" :gauge-slug="r.custom_gauge_slug" compact :color="urBandHex(r)" />
                      </div>
                      <span v-if="r.flow_status !== 'unknown' || r.flow_band" :class="['inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold shrink-0', urBadgeClass(r)]">{{ urBandLabel(r) }}</span>
                      <div class="w-20 shrink-0 text-right">
                        <span class="whitespace-nowrap text-base font-bold tabular-nums" :style="{ color: urBandHex(r) }">
                          {{ r.current_cfs != null ? Math.round(r.current_cfs).toLocaleString() : '—' }}<span class="text-xs font-normal text-neutral-400 dark:text-neutral-500"> cfs</span>
                        </span>
                      </div>
                      <TrashButton label="Remove from dashboard" @click="removeUserReach(r)" />
                    </div>
                  </div>
                  <div v-else :class="[cardGridClass, 'mt-1.5']">
                    <div
                      v-for="r in river.userReaches"
                      :key="r.id"
                      class="relative rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3 transition-all duration-200 cursor-pointer overflow-hidden"
                      @click="openUserReach(r)"
                    >
                      <div class="flex items-start gap-3 mb-2">
                        <div class="min-w-0 flex-1">
                          <div class="flex items-center gap-1.5 min-w-0">
                            <span class="text-base font-semibold truncate">{{ r.name }}</span>
                            <span v-if="r.flow_status !== 'unknown' || r.flow_band" :class="['shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold', urBadgeClass(r)]">{{ urBandLabel(r) }}</span>
                          </div>
                          <div v-if="r.author_handle || r.long_name" class="flex items-center gap-1 mt-0.5">
                            <span v-if="r.author_handle" class="text-xs text-neutral-400 dark:text-neutral-500 shrink-0">@{{ r.author_handle }}</span>
                            <span v-if="r.author_handle && r.long_name" class="text-xs text-neutral-300 dark:text-neutral-600">·</span>
                            <span v-if="r.long_name" class="text-xs text-neutral-400 dark:text-neutral-500 truncate">{{ r.long_name }}</span>
                          </div>
                        </div>
                        <div class="shrink-0 flex items-center gap-1">
                          <span class="font-bold tabular-nums leading-none text-3xl" :style="{ color: urBandHex(r) }">
                            {{ r.current_cfs != null ? Math.round(r.current_cfs).toLocaleString() : '—' }}<span class="text-xs font-normal text-neutral-500 dark:text-neutral-400 ml-0.5">cfs</span>
                          </span>
                          <button v-if="r.is_reference" :disabled="forkingRefId === r.id" class="rounded p-1 text-neutral-300 dark:text-neutral-600 hover:text-primary-500 dark:hover:text-primary-400 transition-colors disabled:opacity-40" title="Fork to edit" @click.stop="forkReferencedRun(r)">
                            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="8" r="2.5"/><path d="M6 8.5v7M18 10.5c0 3-4 3-6 4.5"/></svg>
                          </button>
                          <NuxtLink v-else :to="`/my/runs/${r.slug}`" class="rounded p-1 text-neutral-300 dark:text-neutral-600 hover:text-primary-500 dark:hover:text-primary-400 transition-colors" title="Edit run" @click.stop>
                            <svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/></svg>
                          </NuxtLink>
                          <TrashButton label="Remove from dashboard" @click="removeUserReach(r)" />
                        </div>
                      </div>
                      <GaugeSparkline v-if="r.gauge_id" :gauge-id="r.gauge_id" :flow-status="(r.flow_status as any)" :color="urBandHex(r)" :compact="viewMode !== 'full'" class="mb-1 opacity-70" />
                      <CustomGaugeSparkline v-else-if="r.custom_gauge_slug" :gauge-slug="r.custom_gauge_slug" :compact="viewMode !== 'full'" :color="urBandHex(r)" class="mb-1 opacity-70" />
                      <p v-if="r.last_reading_at" class="text-xs text-neutral-400 mt-0.5">{{ reachLastUpdated(r) }}</p>
                    </div>
                  </div>
                </template><!-- end river.userReaches -->
                </div><!-- end riverHasVisibleContent -->
                </template><!-- end v-for river -->
              </div>

              <!-- Standalone gauges (no reach context) -->
              <div v-if="sub.standaloneGauges.length > 0" class="mb-2 mt-1">
                <div class="flex items-center gap-2 py-1">
                  <svg class="w-3.5 h-3.5 text-neutral-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
                    <path d="M12 12 16 8"/>
                    <path d="M3 12a9 9 0 0 1 18 0"/>
                  </svg>
                  <span class="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Standalone Gauges</span>
                </div>
                <div :class="reachContainerClass">
                  <div
                    v-for="g in sub.standaloneGauges"
                    :key="g.id"
                    :class="viewMode === 'list' ? 'rounded-lg px-3 py-1.5' : 'rounded-xl px-4 py-3'"
                    class="border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors"
                    @click="openGauge(g, 'gauge')"
                  >
                    <div class="flex items-center gap-3">
                      <svg class="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
                        <path d="M12 12 16 8"/>
                        <path d="M3 12a9 9 0 0 1 18 0"/>
                      </svg>
                      <span class="flex-1 min-w-0 font-semibold text-neutral-800 dark:text-neutral-200 truncate" :class="viewMode === 'list' ? 'text-sm' : 'text-base'">
                        {{ g.name ?? `${g.source.toUpperCase()} ${g.externalId}` }}
                      </span>
                      <div class="w-20 shrink-0 hidden sm:block h-5 opacity-50 pointer-events-none">
                        <GaugeSparkline :gauge-id="g.id" flow-status="unknown" color="#3b82f6" compact />
                      </div>
                      <span class="font-bold tabular-nums text-neutral-900 dark:text-white leading-none" :class="viewMode === 'list' ? 'text-sm' : 'text-3xl'">
                        {{ g.currentCfs != null ? Math.round(g.currentCfs).toLocaleString() : '—' }}
                      </span>
                      <span class="text-xs text-neutral-400">cfs</span>
                      <TrashButton label="Remove from dashboard" @click="removeAndSync(g.id)" />
                    </div>
                  </div>
                </div>
              </div>
              </template><!-- end sub v-if -->
            </div>
            </template><!-- end v-for sub -->
          </template>
        </section>
        </template><!-- end v-for section -->

        <section v-if="aggregateGauges.length >= 2" class="border border-neutral-300 dark:border-neutral-700 rounded-xl p-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold text-sm">{{ aggregateLabel }} · Flow Comparison</h3>
            <UButton size="xs" color="neutral" variant="ghost" icon="i-heroicons-x-mark" @click="closeAggregate" />
          </div>
          <AggregateGraph :gauges="aggregateGauges" />
        </section>

        <!-- Custom Gauges section — shows active-dashboard gauges on all tabs -->
        <section v-if="visibleCustomGauges.length > 0">
          <div class="flex items-center gap-2 mb-3">
            <button
              type="button"
              class="flex items-center gap-1.5 text-sm font-bold text-neutral-700 dark:text-neutral-200 uppercase tracking-wide hover:text-neutral-900 dark:hover:text-white transition-colors"
              @click="customGaugesCollapsed = !customGaugesCollapsed"
            >
              <svg
                class="w-3 h-3 transition-transform"
                :class="customGaugesCollapsed ? '-rotate-90' : ''"
                viewBox="0 0 20 20" fill="currentColor"
              ><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
              <!-- Speedometer / gauge icon -->
              <svg class="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
              Custom Gauges
            </button>
            <div class="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
            <div v-if="activeCustomGauges.some(g => hiddenCustomGauges.has(g.id))" class="relative" ref="gaugeAddWrap">
              <button
                class="text-xs text-primary-500 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors flex items-center gap-1"
                @click="gaugeAddOpen = !gaugeAddOpen"
              >
                <svg class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
                Add
              </button>
              <div v-if="gaugeAddOpen" class="absolute right-0 top-full mt-1 z-50 w-52 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg overflow-hidden">
                <button
                  v-for="cg in activeCustomGauges.filter(g => hiddenCustomGauges.has(g.id))"
                  :key="cg.id"
                  class="w-full text-left px-3 py-2 text-sm hover:bg-primary-50 dark:hover:bg-primary-950/30 transition-colors"
                  @click="showCustomGauge(cg.id); gaugeAddOpen = false"
                >{{ cg.name }}</button>
              </div>
            </div>
            <NuxtLink to="/my/gauges" class="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">Manage</NuxtLink>
          </div>
          <!-- Collapsible content -->
          <div v-if="!customGaugesCollapsed">
          <!-- List view -->
          <div v-if="viewMode === 'list'" class="space-y-1.5">
            <div
              v-for="cg in activeCustomGauges.filter(g => !hiddenCustomGauges.has(g.id))"
              :key="cg.id"
              class="flex items-center gap-2 sm:gap-3 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 transition-all duration-200 cursor-pointer"
              @click="openStandaloneCustomGauge(cg)"
            >
              <div class="min-w-0 flex-1 flex items-center gap-1.5">
                <span class="text-sm font-medium truncate">{{ cg.name }}</span>
                <span v-if="cg.any_input_unhealthy" class="hidden sm:inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 shrink-0">Stale</span>
              </div>
              <div class="w-32 shrink-0 hidden sm:block opacity-60">
                <CustomGaugeSparkline :gauge-slug="cg.slug" compact class="h-full w-full" />
              </div>
              <span class="text-base font-bold tabular-nums text-neutral-900 dark:text-white shrink-0">
                {{ cg.last_value_cfs != null ? Math.round(cg.last_value_cfs).toLocaleString() : '—' }}<span class="text-xs font-normal text-neutral-400 ml-0.5">{{ cg.unit }}</span>
              </span>
              <TrashButton label="Remove from dashboard" @click="hideCustomGauge(cg.id)" />
            </div>
          </div>
          <!-- Card view (comfortable) -->
          <div v-else :class="cardGridClass">
            <div
              v-for="cg in activeCustomGauges.filter(g => !hiddenCustomGauges.has(g.id))"
              :key="cg.id"
              class="relative rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3 transition-all duration-200 cursor-pointer overflow-hidden"
              @click="openStandaloneCustomGauge(cg)"
            >
              <!-- Name/icon (left) | value + remove (right) -->
              <div class="flex items-start gap-3">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5">
                    <span class="text-base font-semibold truncate block">{{ cg.name }}</span>
                  </div>
                  <p v-if="cg.description" class="text-xs text-neutral-400 truncate mt-0.5">{{ cg.description }}</p>
                </div>
                <div class="shrink-0 flex items-center gap-1.5">
                  <span class="text-xl font-bold tabular-nums leading-none text-neutral-900 dark:text-white">
                    {{ cg.last_value_cfs != null ? Math.round(cg.last_value_cfs).toLocaleString() : '—' }}<span class="text-xs font-normal text-neutral-500 dark:text-neutral-400 ml-0.5">{{ cg.unit }}</span>
                  </span>
                  <TrashButton label="Remove from dashboard" @click="hideCustomGauge(cg.id)" />
                </div>
              </div>
              <!-- Sparkline -->
              <div class="mt-2 opacity-70">
                <CustomGaugeSparkline :gauge-slug="cg.slug" :compact="viewMode !== 'full'" />
              </div>
              <!-- Calculated origin badge + stale indicator -->
              <div class="flex items-center gap-2 mt-1.5">
                <div class="flex items-center gap-1 text-neutral-400/50 dark:text-neutral-500/40">
                  <svg class="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="10" y2="14"/><line x1="14" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="10" y2="18"/><line x1="14" y1="18" x2="16" y2="18"/></svg>
                  <span class="text-xs font-medium">Calculated</span>
                </div>
                <span v-if="cg.any_input_unhealthy" class="inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">Stale</span>
              </div>
            </div>
          </div>
          </div><!-- end collapsible -->
        </section>

        <!-- Dashboard map -->
        <section v-if="mapVisible">
          <div class="flex items-center gap-2 mb-3">
            <h2 class="text-sm font-semibold text-neutral-500 uppercase tracking-wide">Gauge Map</h2>
            <div class="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
            <button
              class="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
              @click="mapVisible = false"
            >Hide</button>
          </div>
          <ClientOnly>
            <DashboardMap
              :gauges="store.gauges"
              @remove-gauge="removeAndSync($event)"
              @open-gauge="(id) => { const g = store.gauges.find(x => x.id === id); if (g) openGauge(g, 'gauge') }"
            />
          </ClientOnly>
        </section>
      </template>
    </main>

    <GaugeSearchModal v-model:open="searchOpen" @add="handleAdd" @added-external="onAddedExternal" />
    <GaugeDetailModal v-if="detailGauge" v-model:open="detailOpen" :gauge="detailGauge" :mode="detailMode" />
    <UserRunCustomGaugeModal
      v-if="customGaugeModalProps"
      v-model:open="customGaugeModalOpen"
      v-bind="customGaugeModalProps"
    />

    <!-- New dashboard modal -->
    <Teleport to="body">
      <div v-if="newDashboardOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="newDashboardOpen = false">
        <div class="absolute inset-0 bg-black/40" @click="newDashboardOpen = false" />
        <div class="relative w-full max-w-xs bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-xl p-5 space-y-4">
          <h3 class="text-sm font-semibold">New dashboard</h3>
          <input
            v-model="newDashboardName"
            type="text"
            placeholder="Dashboard name"
            class="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
            @keydown.enter="createDashboard"
            @keydown.esc="newDashboardOpen = false"
          />
          <div class="flex gap-2 justify-end">
            <button class="px-3 py-1.5 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700" @click="newDashboardOpen = false">Cancel</button>
            <button class="px-3 py-1.5 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700" @click="createDashboard">Create</button>
          </div>
        </div>
      </div>
    </Teleport>

    <ShareDashboardModal
      :open="shareOpen"
      :gauges="store.gauges"
      @close="shareOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useWatchlistStore, type WatchedGauge } from '~/stores/watchlist'
import { cleanBasinName, slugifyBasin } from '~/utils/basin'
import { flowBandLabel, colorKeyToHex, colorKeyToBadgeClass } from '~/utils/flowBand'

definePageMeta({ ssr: false })

const { bandBadgeClass, bandSolid } = useFlowBandPalette()
const { prefetch: prefetchBand, bandForCfs } = useRunFlowBand()

// Helpers for UserReachSummary coloring via composable (color keys, not old palette)
function urBandColor(r: UserReachSummary): string | null {
  return bandForCfs(r.slug, r.current_cfs)?.color ?? null
}
function urBandHex(r: UserReachSummary): string {
  const key = urBandColor(r)
  return key ? colorKeyToHex(key) : bandSolid(r.flow_band, r.flow_status)
}
function urBadgeClass(r: UserReachSummary): string {
  const key = urBandColor(r)
  return key ? colorKeyToBadgeClass(key) : bandBadgeClass(r.flow_band, r.flow_status)
}
function urBandLabel(r: UserReachSummary): string {
  return bandForCfs(r.slug, r.current_cfs)?.label ?? flowBandLabel(r.flow_band, r.flow_status)
}

const router = useRouter()
const store = useWatchlistStore()
store.deduplicate()
const { refresh } = useWatchlistRefresh()
const { isAuthenticated, getToken } = useAuth()
const { apiBase } = useRuntimeConfig().public
const { addAndSync, removeAndSync, loadFromServer, loadForDashboard, pushLocalToServer } = useWatchlistSync()
const db = useDashboards()

const shareOpen = ref(false)

// ── Dashboard tab management ──────────────────────────────────────────────────
const newDashboardOpen = ref(false)
const newDashboardName = ref('')

async function onSelectDashboard(id: string) {
  if (id === db.activeDashboardId.value) return
  db.setActive(id)
  await activateDashboard(id)
  await refresh()
}

async function onDeleteDashboard(slug: string) {
  const target = db.dashboards.value.find(d => d.slug === slug)
  if (!target) return
  const wasActive = target.id === db.activeDashboardId.value
  await db.remove(slug)
  if (wasActive && db.activeDashboard.value) {
    await activateDashboard(db.activeDashboard.value.id)
    await refresh()
  }
}

async function createDashboard() {
  const name = newDashboardName.value.trim()
  if (!name) return
  const created = await db.create(name)
  if (created) {
    newDashboardName.value = ''
    newDashboardOpen.value = false
    await onSelectDashboard(created.id)
  }
}

// ── Server sync ───────────────────────────────────────────────────────────────
let serverSynced = false
async function syncWithServer() {
  if (serverSynced) return
  serverSynced = true
  await db.load()
  const activeId = db.activeDashboard.value?.id
  if (activeId) {
    await activateDashboard(activeId)
  } else {
    await loadFromServer()
    await pushLocalToServer()
  }
}

watch(isAuthenticated, (val) => { if (val) { syncWithServer(); loadUserReaches(); loadCustomGauges(); loadRiverBasinOverrides() } })

let refreshTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  if (isAuthenticated.value) { syncWithServer(); loadUserReaches(); loadCustomGauges(); loadRiverBasinOverrides() }
  refresh()
  refreshTimer = setInterval(refresh, 60_000)
})

// My Reaches and Custom Gauges are not dashboard-scoped in the backend, so show
// them only on the primary dashboard to avoid cluttering every custom dashboard.
const isDefaultDashboard = computed(() =>
  db.dashboards.value.length <= 1 || db.activeDashboard.value?.id === db.dashboards.value[0]?.id
)

// ── User reaches ──────────────────────────────────────────────────────────────
interface UserReachSummary {
  id: string; slug: string; name: string; long_name: string | null; river_name: string | null
  river_id: string | null; state_abbr: string | null; basin_group: string | null
  current_cfs: number | null; flow_band: string | null
  flow_status: 'runnable' | 'caution' | 'flood' | 'unknown'
  last_reading_at: string | null; gauge_id: string | null
  gauge_external_id: string | null; gauge_source: string | null; gauge_name: string | null
  custom_gauge_id: string | null; custom_gauge_slug: string | null; custom_gauge_name: string | null
  author_handle: string | null
  // True when this row is another user's public run added by reference (read-only).
  is_reference?: boolean
}

function reachBadgeClass(r: UserReachSummary): string {
  return bandBadgeClass(r.flow_band, r.flow_status)
}
function reachStatusLabel(r: UserReachSummary): string {
  return flowBandLabel(r.flow_band, r.flow_status)
}
function reachLastUpdated(r: UserReachSummary): string {
  if (!r.last_reading_at) return ''
  const ms = Date.now() - new Date(r.last_reading_at).getTime()
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1)  return 'Updated just now'
  if (minutes < 60) return `Updated ${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24)   return `Updated ${hours}h ago`
  return `Updated ${Math.floor(hours / 24)}d ago`
}

// Custom gauge modal state (used for user reaches backed by custom gauges AND standalone cards)
const customGaugeModalOpen  = ref(false)
const customGaugeModalProps = ref<{
  reachName: string; reachSlug: string
  gaugeName: string; gaugeSlug: string
  currentCfs: number | null; flowBand: string | null; flowStatus: string
} | null>(null)

function openStandaloneCustomGauge(cg: CustomGaugeSummary) {
  customGaugeModalProps.value = {
    reachName:  cg.name,
    reachSlug:  '',           // empty = standalone (no reach link in modal)
    gaugeName:  cg.name,
    gaugeSlug:  cg.slug,
    currentCfs: cg.last_value_cfs,
    flowBand:   null,
    flowStatus: 'unknown',
  }
  customGaugeModalOpen.value = true
}

// Click a user reach card → open appropriate modal or navigate.
function openUserReach(r: UserReachSummary) {
  // Referenced run — read-only. Custom-gauge runs can't open the owner-only
  // custom gauge modal, so open the gauge modal when there's a real gauge,
  // else view the owner's public run page.
  if (r.is_reference) {
    if (r.gauge_id && r.gauge_external_id && r.gauge_source) {
      openGauge(synthGaugeForReach(r), 'reach')
      return
    }
    router.push(`/runs/${r.author_handle ?? 'h2oflows'}/${r.slug}`)
    return
  }
  if (r.custom_gauge_id && r.custom_gauge_slug) {
    customGaugeModalProps.value = {
      reachName:  r.name,
      reachSlug:  r.slug,
      gaugeName:  r.custom_gauge_name ?? r.name,
      gaugeSlug:  r.custom_gauge_slug,
      currentCfs: r.current_cfs,
      flowBand:   r.flow_band,
      flowStatus: r.flow_status,
    }
    customGaugeModalOpen.value = true
    return
  }
  if (r.gauge_id) {
    const gauge = store.gauges.find(g => g.id === r.gauge_id && g.contextReachSlug === r.slug)
              ?? store.gauges.find(g => g.id === r.gauge_id)
    if (gauge) { openGauge(gauge, 'reach'); return }
    // Run's gauge isn't in the watchlist store (the run carries it, not a separate
    // watchlist add). Build a synthetic WatchedGauge from the run summary so the
    // modal opens in reach mode instead of falling through to navigation.
    if (r.gauge_external_id && r.gauge_source) {
      openGauge(synthGaugeForReach(r), 'reach')
      return
    }
  }
  router.push(`/runs/${r.author_handle ?? 'h2oflows'}/${r.slug}`)
}

// Minimal WatchedGauge built from a user-reach summary — only the fields
// GaugeDetailModal reads in reach mode are populated.
function synthGaugeForReach(r: UserReachSummary): WatchedGauge {
  return {
    id: r.gauge_id!,
    externalId: r.gauge_external_id ?? '',
    source: r.gauge_source ?? '',
    name: r.gauge_name ?? null,
    contextReachSlug: r.slug,
    contextReachCommonName: r.name,
    contextReachFullName: r.long_name,
    contextReachRiverName: r.river_name,
    contextReachBasinGroup: r.basin_group,
    contextReachCenterLng: null,
    contextReachRiverOrder: null,
    contextReachAuthorHandle: r.author_handle,
    contextReachPermitRequired: false,
    contextReachMultiDayDays: 0,
    reachId: null,
    reachName: r.name,
    reachNames: [r.name],
    reachSlug: r.slug,
    reachSlugs: [r.slug],
    reachCommonNames: [r.name],
    reachRelationship: null,
    watershedName: null,
    basinName: r.basin_group,
    riverName: r.river_name,
    stateAbbr: r.state_abbr,
    lat: null,
    lng: null,
    currentCfs: r.current_cfs,
    flowStatus: r.flow_status,
    flowBandLabel: r.flow_band,
    lastReadingAt: r.last_reading_at,
    pollHealth: null,
    lastPollSuccessAt: null,
    watchState: 'saved',
    activeSince: null,
  }
}
const userReaches = ref<UserReachSummary[]>([])
async function loadUserReaches() {
  const token = await getToken()
  if (!token) return
  const res = await fetch(`${apiBase}/api/v1/me/reaches`, {
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => null)
  if (!res?.ok) return
  userReaches.value = await res.json() ?? []
  for (const r of userReaches.value) prefetchBand(r.slug)
}

// Referenced runs: other users' public runs the caller added by reference.
// Keyed per-dashboard (the endpoint filters by dashboard_id), rendered read-only.
const referencedReaches = ref<UserReachSummary[]>([])
async function loadReferencedRuns(dashboardId: string, runIds: string[]) {
  if (runIds.length === 0) { referencedReaches.value = []; return }
  const token = await getToken()
  if (!token) return
  const res = await fetch(`${apiBase}/api/v1/me/referenced-runs?dashboard_id=${encodeURIComponent(dashboardId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => null)
  if (!res?.ok) { referencedReaches.value = []; return }
  const data: UserReachSummary[] = await res.json() ?? []
  referencedReaches.value = data.map(r => ({ ...r, is_reference: true }))
}

function loadSet(key: string): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(key) ?? '[]')) } catch { return new Set() }
}
function saveSet(key: string, s: Set<string>) {
  localStorage.setItem(key, JSON.stringify([...s]))
}

// Per-dashboard hidden sets — keyed by dashboardId so trashing on secondary
// doesn't bleed into primary and vice-versa.
const hiddenReachesKey = computed(() => `h2oflow_hidden_reaches_${db.activeDashboard.value?.id ?? 'default'}`)
const hiddenGaugesKey  = computed(() => `h2oflow_hidden_custom_gauges_${db.activeDashboard.value?.id ?? 'default'}`)

const hiddenReaches        = ref<Set<string>>(new Set())
const hiddenCustomGauges   = ref<Set<string>>(new Set())
const gaugeAddOpen         = ref(false)
const gaugeAddWrap         = ref<HTMLElement | null>(null)
const customGaugesCollapsed = ref(false)

onMounted(() => {
  hiddenReaches.value      = loadSet(hiddenReachesKey.value)
  hiddenCustomGauges.value = loadSet(hiddenGaugesKey.value)
})

// Reload per-dashboard hidden sets when user switches tabs.
watch(() => db.activeDashboard.value?.id, () => {
  hiddenReaches.value      = loadSet(hiddenReachesKey.value)
  hiddenCustomGauges.value = loadSet(hiddenGaugesKey.value)
})

function hideReach(id: string) {
  hiddenReaches.value = new Set([...hiddenReaches.value, id])
  saveSet(hiddenReachesKey.value, hiddenReaches.value)
}
function showReach(id: string) {
  const s = new Set(hiddenReaches.value); s.delete(id)
  hiddenReaches.value = s; saveSet(hiddenReachesKey.value, s)
}
async function removeUserReach(r: UserReachSummary) {
  // Referenced (other-user) run — drop the reference, keyed by run id.
  if (r.is_reference) {
    referencedReaches.value = referencedReaches.value.filter(x => x.id !== r.id)
    const dashboardId = db.activeDashboard.value?.id
    if (!dashboardId) return
    const token = await getToken()
    if (!token) return
    const qs = `?kind=reference&dashboard_id=${encodeURIComponent(dashboardId)}`
    fetch(`${apiBase}/api/v1/watchlist/${encodeURIComponent(r.id)}${qs}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {})
    return
  }
  // Remove from dashboardReachSlugs immediately (reactive — no page reload needed)
  dashboardReachSlugs.value = dashboardReachSlugs.value.filter(s => s !== r.slug)
  // Clear any stale localStorage hidden flag for this reach
  const s = new Set(hiddenReaches.value); s.delete(r.id)
  hiddenReaches.value = s; saveSet(hiddenReachesKey.value, s)
  // API DELETE so re-add from explore works correctly
  const dashboardId = db.activeDashboard.value?.id
  if (!dashboardId) return
  const token = await getToken()
  if (!token) return
  const qs = `?kind=reach&dashboard_id=${encodeURIComponent(dashboardId)}`
  fetch(`${apiBase}/api/v1/watchlist/${encodeURIComponent(r.slug)}${qs}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {})
}

// Fork a referenced run into the caller's namespace, then open the editor.
const forkingRefId = ref<string | null>(null)
async function forkReferencedRun(r: UserReachSummary) {
  if (forkingRefId.value) return
  forkingRefId.value = r.id
  try {
    const token = await getToken()
    if (!token) return
    const res = await fetch(`${apiBase}/api/v1/user-runs/${encodeURIComponent(r.id)}/fork`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null)
    if (!res?.ok) return
    const { slug } = await res.json()
    if (slug) router.push(`/my/runs/${slug}`)
  } finally {
    forkingRefId.value = null
  }
}
function hideCustomGauge(id: string) {
  hiddenCustomGauges.value = new Set([...hiddenCustomGauges.value, id])
  saveSet(hiddenGaugesKey.value, hiddenCustomGauges.value)
}
function showCustomGauge(id: string) {
  const s = new Set(hiddenCustomGauges.value); s.delete(id)
  hiddenCustomGauges.value = s; saveSet(hiddenGaugesKey.value, s)
}

// Close add-dropdowns on outside click
if (import.meta.client) {
  document.addEventListener('click', (e) => {
    if (gaugeAddWrap.value && !gaugeAddWrap.value.contains(e.target as Node)) gaugeAddOpen.value = false
    if (groupingWrap.value && !groupingWrap.value.contains(e.target as Node)) groupingOpen.value = false
  })
}

// ── Custom gauges ─────────────────────────────────────────────────────────────
interface CustomGaugeSummary { id: string; slug: string; name: string; description: string | null; unit: string; last_value_cfs: number | null; any_input_unhealthy: boolean }
const customGauges = ref<CustomGaugeSummary[]>([])
// IDs of custom gauges and reach slugs pinned to the currently active (non-primary) dashboard.
const dashboardCustomGaugeIds = ref<string[]>([])
const dashboardReachSlugs     = ref<string[]>([])

// Items visible on the active dashboard — always filtered by watchlist.
// Every tab (including primary) uses its own watchlist entries so that
// adding a reach to secondary doesn't bleed it onto primary.
const activeCustomGauges = computed(() =>
  customGauges.value.filter(cg => dashboardCustomGaugeIds.value.includes(cg.id))
)
const activeUserReaches = computed(() =>
  userReaches.value.filter(r => dashboardReachSlugs.value.includes(r.slug))
)
// Referenced runs are already scoped to the active dashboard by the endpoint;
// just apply the local hidden set (keyed by run id).
const activeReferencedReaches = computed(() =>
  referencedReaches.value.filter(r => !hiddenReaches.value.has(r.id))
)

// After applying the localStorage hidden-set: what actually renders.
const visibleUserReaches  = computed(() => activeUserReaches.value.filter(r => !hiddenReaches.value.has(r.id)))
const visibleCustomGauges = computed(() => activeCustomGauges.value.filter(cg => !hiddenCustomGauges.value.has(cg.id)))

// Whether there's anything to render anywhere on the page.
const hasAnyContent = computed(() =>
  store.gauges.length > 0 || visibleUserReaches.value.length > 0
  || visibleCustomGauges.value.length > 0 || activeReferencedReaches.value.length > 0
)

async function loadCustomGauges() {
  const token = await getToken()
  if (!token) return
  const res = await fetch(`${apiBase}/api/v1/me/custom-gauges`, {
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => null)
  if (!res?.ok) return
  const data = await res.json()
  customGauges.value = data.items ?? []
}

// Wrapper: load dashboard watchlist + update per-dashboard filter lists.
async function activateDashboard(id: string) {
  const { customGaugeIds, reachSlugs, referencedRunIds } = await loadForDashboard(id)
  dashboardCustomGaugeIds.value = customGaugeIds
  dashboardReachSlugs.value = reachSlugs
  await loadReferencedRuns(id, referencedRunIds)
}
onUnmounted(() => { serverSynced = false; if (refreshTimer) clearInterval(refreshTimer) })

// ── River basin overrides ─────────────────────────────────────────────────────
// Keyed by river_id → basin_key (free-text label).
// Fetched once on load; applied in byStateTree to re-group rivers client-side.

const riverBasinOverrides = ref<Map<string, string>>(new Map())

async function loadRiverBasinOverrides() {
  const token = await getToken()
  if (!token) return
  const res = await fetch(`${apiBase}/api/v1/me/river-basin-overrides`, {
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => null)
  if (!res?.ok) return
  const data: { river_id: string; basin_key: string }[] = await res.json() ?? []
  riverBasinOverrides.value = new Map(data.map(o => [o.river_id, o.basin_key]))
}

// Derived: (state|riverName) → basin_key for applying overrides to gauge entries
// that lack a river_id but share the same river name + state as an overridden run.
const riverNameBasinOverrides = computed(() => {
  const m = new Map<string, string>()
  for (const [riverId, basinKey] of riverBasinOverrides.value) {
    const run = activeUserReaches.value.find(r => r.river_id === riverId)
    if (run?.river_name && run?.state_abbr) {
      m.set(`${run.state_abbr}|${run.river_name}`, basinKey)
    }
  }
  return m
})

// Inline river-basin editor state
const editingRiverId            = ref<string | null>(null)
const editingRiverBasinName     = ref('')
const editingRiverBasinInitial  = ref('')  // value at open; cancel hidden when input differs

function startRiverBasinEdit(river: RiverGroup) {
  if (!river.riverId) return
  editingRiverId.value          = river.riverId
  editingRiverBasinName.value   = riverBasinOverrides.value.get(river.riverId) ?? ''
  editingRiverBasinInitial.value = editingRiverBasinName.value
}

function cancelRiverBasinEdit() {
  editingRiverId.value          = null
  editingRiverBasinName.value   = ''
  editingRiverBasinInitial.value = ''
}

async function saveRiverBasinOverride(river: RiverGroup) {
  if (!river.riverId) return
  const name = editingRiverBasinName.value.trim()
  if (!name) { cancelRiverBasinEdit(); return }
  const token = await getToken()
  if (!token) return
  const res = await fetch(`${apiBase}/api/v1/me/rivers/${river.riverId}/basin-override`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ basin_key: name }),
  }).catch(() => null)
  if (!res?.ok) return
  riverBasinOverrides.value = new Map([...riverBasinOverrides.value, [river.riverId, name]])
  cancelRiverBasinEdit()
}

async function deleteRiverBasinOverride(river: RiverGroup) {
  if (!river.riverId) return
  const token = await getToken()
  if (!token) return
  await fetch(`${apiBase}/api/v1/me/rivers/${river.riverId}/basin-override`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => null)
  const next = new Map(riverBasinOverrides.value)
  next.delete(river.riverId)
  riverBasinOverrides.value = next
  cancelRiverBasinEdit()
}

// ── Reach-primary grouping: state → basin → river → reaches ─────────────────

interface RiverGroup { name: string; riverId: string | null; reaches: WatchedGauge[]; userReaches: UserReachSummary[] }
interface BasinGroup { name: string; rawKey: string; reachCount: number; rivers: RiverGroup[]; standaloneGauges: WatchedGauge[] }
interface StateGroup { name: string; reachCount: number; basins: BasinGroup[] }

const byStateTree = computed<StateGroup[]>(() => {
  // state → basin → river → reaches (gauge watchlist + user runs)
  // BasinEntry also stores the first raw basin value seen (pre-cleanBasinName),
  // used as the basin_key for per-user override CRUD.
  type RiverEntry = { gaugeReaches: WatchedGauge[]; userReaches: UserReachSummary[] }
  type BasinEntry = { rivers: Map<string, RiverEntry>; standalone: WatchedGauge[]; rawKey: string }
  const stateMap = new Map<string, Map<string, BasinEntry>>()

  // Resolve basin for a gauge entry: check riverNameBasinOverrides by (state|riverName).
  function resolveBasinForGauge(rawBasin: string | null | undefined, state: string, riverName: string | null): string {
    if (riverName) {
      const nameKey = `${state}|${riverName}`
      if (riverNameBasinOverrides.value.has(nameKey)) return riverNameBasinOverrides.value.get(nameKey)!
    }
    return cleanBasinName(rawBasin) ?? 'Other'
  }

  // Resolve basin for a user run: check riverBasinOverrides by river_id first.
  function resolveBasinForRun(ur: UserReachSummary, state: string): string {
    if (ur.river_id && riverBasinOverrides.value.has(ur.river_id)) {
      return riverBasinOverrides.value.get(ur.river_id)!
    }
    return cleanBasinName(ur.basin_group) ?? 'Other'
  }

  // De-duplicate: same gauge+reach should only appear once
  const seen = new Set<string>()
  // Track slugs already claimed by a watchlist gauge entry so the userReaches
  // fold-in below skips them (avoids double-render when a user reach also has
  // a gauge in the watchlist).
  const gaugeReachSlugs = new Set(store.gauges.map(g => g.contextReachSlug).filter(Boolean) as string[])
  for (const g of store.gauges) {
    const dedupeKey = `${g.id}::${g.contextReachSlug ?? ''}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)

    const state = g.stateAbbr ?? '—'
    const rawBasin = g.contextReachBasinGroup ?? g.watershedName ?? g.basinName
      ?? g.contextReachRiverName ?? g.riverName ?? null
    const riverName = g.contextReachRiverName ?? g.riverName ?? null
    const basin = resolveBasinForGauge(rawBasin, state, riverName)
    const rawKey = rawBasin ?? ''

    if (!stateMap.has(state)) stateMap.set(state, new Map())
    const basinMap = stateMap.get(state)!
    if (!basinMap.has(basin)) basinMap.set(basin, { rivers: new Map(), standalone: [], rawKey })
    const entry = basinMap.get(basin)!

    if (g.contextReachSlug) {
      const river = g.contextReachRiverName ?? g.riverName ?? 'Unknown River'
      if (!entry.rivers.has(river)) entry.rivers.set(river, { gaugeReaches: [], userReaches: [] })
      entry.rivers.get(river)!.gaugeReaches.push(g)
    } else {
      entry.standalone.push(g)
    }
  }

  // Fold visible user reaches that are NOT already covered by a watchlist gauge entry
  for (const ur of activeUserReaches.value.filter(r => !hiddenReaches.value.has(r.id) && !gaugeReachSlugs.has(r.slug))) {
    const state = ur.state_abbr ?? '—'
    const basin = resolveBasinForRun(ur, state)
    const rawKey = ur.basin_group ?? ''
    const river = ur.river_name ?? 'My Runs'
    if (!stateMap.has(state)) stateMap.set(state, new Map())
    const basinMap = stateMap.get(state)!
    if (!basinMap.has(basin)) basinMap.set(basin, { rivers: new Map(), standalone: [], rawKey })
    const entry = basinMap.get(basin)!
    if (!entry.rivers.has(river)) entry.rivers.set(river, { gaugeReaches: [], userReaches: [] })
    entry.rivers.get(river)!.userReaches.push(ur)
  }

  // Fold referenced runs (other users' public runs) into the same river groups —
  // they render read-only in the userReaches list, flagged via is_reference.
  for (const ur of activeReferencedReaches.value) {
    const state = ur.state_abbr ?? '—'
    const basin = resolveBasinForRun(ur, state)
    const rawKey = ur.basin_group ?? ''
    const river = ur.river_name ?? 'Shared Runs'
    if (!stateMap.has(state)) stateMap.set(state, new Map())
    const basinMap = stateMap.get(state)!
    if (!basinMap.has(basin)) basinMap.set(basin, { rivers: new Map(), standalone: [], rawKey })
    const entry = basinMap.get(basin)!
    if (!entry.rivers.has(river)) entry.rivers.set(river, { gaugeReaches: [], userReaches: [] })
    entry.rivers.get(river)!.userReaches.push(ur)
  }

  return [...stateMap.entries()]
    .sort(([a], [b]) => a === '—' ? 1 : b === '—' ? -1 : a.localeCompare(b))
    .map(([state, basinMap]) => {
      const basins = [...basinMap.entries()]
        .sort(([a], [b]) => a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b))
        .map(([bName, { rivers, standalone, rawKey }]) => {
          const riverGroups = [...rivers.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([rName, { gaugeReaches, userReaches }]) => ({
              name: rName,
              riverId: userReaches.find(r => r.river_id)?.river_id
                ?? gaugeReaches.find(g => g.contextReachRiverId)?.contextReachRiverId
                ?? null,
              userReaches,
              reaches: [...gaugeReaches].sort((a, b) => {
                // river_order (stored, admin-set) preferred; fall back to center longitude
                const ao = a.contextReachRiverOrder
                const bo = b.contextReachRiverOrder
                if (ao != null && bo != null) return ao - bo
                if (ao != null) return -1
                if (bo != null) return 1
                const al = a.contextReachCenterLng ?? a.lng
                const bl = b.contextReachCenterLng ?? b.lng
                if (al == null && bl == null) return 0
                if (al == null) return 1
                if (bl == null) return -1
                return al - bl
              }),
            }))
          const reachCount = riverGroups.reduce((s, r) => s + r.reaches.length + r.userReaches.length, 0) + standalone.length
          return { name: bName, rawKey, reachCount, rivers: riverGroups, standaloneGauges: standalone }
        })
      const reachCount = basins.reduce((s, b) => s + b.reachCount, 0)
      return { name: state, reachCount, basins }
    })
})

// ── Display sections — derived from byStateTree based on grouping flags ─────

interface DisplaySubSection {
  name: string | null
  key: string
  rivers: RiverGroup[]
  standaloneGauges: WatchedGauge[]
  reachCount: number
  // For basin-override editing: raw canonical basin key + state
  rawBasinKey: string | null
  stateAbbr: string | null
}
interface DisplaySection {
  name: string | null
  key: string
  reachCount: number
  subSections: DisplaySubSection[]
}

function sortReaches(reaches: WatchedGauge[]): WatchedGauge[] {
  return [...reaches].sort((a, b) => {
    const ao = a.contextReachRiverOrder
    const bo = b.contextReachRiverOrder
    if (ao != null && bo != null) return ao - bo
    if (ao != null) return -1
    if (bo != null) return 1
    const al = a.contextReachCenterLng ?? a.lng
    const bl = b.contextReachCenterLng ?? b.lng
    if (al == null && bl == null) return 0
    if (al == null) return 1
    if (bl == null) return -1
    return al - bl
  })
}

function mergeRivers(allRivers: RiverGroup[]): RiverGroup[] {
  const map = new Map<string, RiverGroup>()
  for (const r of allRivers) {
    if (!map.has(r.name)) map.set(r.name, { name: r.name, riverId: r.riverId, reaches: [], userReaches: [] })
    const m = map.get(r.name)!
    m.reaches.push(...r.reaches)
    m.userReaches.push(...r.userReaches)
  }
  for (const m of map.values()) m.reaches = sortReaches(m.reaches)
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
}

const displaySections = computed<DisplaySection[]>(() => {
  const tree = byStateTree.value

  // (S, B) — current shape
  if (groupByState.value && groupByBasin.value) {
    return tree.map(state => ({
      name: state.name,
      key: `state:${state.name}`,
      reachCount: state.reachCount,
      subSections: state.basins.map(basin => ({
        name: basin.name,
        key: `state:${state.name}|basin:${basin.name}`,
        rivers: basin.rivers,
        standaloneGauges: basin.standaloneGauges,
        reachCount: basin.reachCount,
        rawBasinKey: basin.rawKey || null,
        stateAbbr: state.name === '—' ? null : state.name,
      })),
    }))
  }

  // (S, !B) — state headers, basins flattened
  if (groupByState.value && !groupByBasin.value) {
    return tree.map(state => {
      const allRivers = state.basins.flatMap(b => b.rivers)
      const allStandalone = state.basins.flatMap(b => b.standaloneGauges)
      const merged = mergeRivers(allRivers)
      return {
        name: state.name,
        key: `state:${state.name}`,
        reachCount: state.reachCount,
        subSections: [{
          name: null,
          key: `state:${state.name}|flat`,
          rivers: merged,
          standaloneGauges: allStandalone,
          reachCount: state.reachCount,
          rawBasinKey: null,
          stateAbbr: null,
        }],
      }
    })
  }

  // (!S, B) — basins merged across states
  if (!groupByState.value && groupByBasin.value) {
    // Track one (stateAbbr, rawKey) per basin-display-name for override editing.
    const basinMeta = new Map<string, { stateAbbr: string | null; rawKey: string }>()
    const basinMap = new Map<string, { rivers: RiverGroup[]; standalone: WatchedGauge[] }>()
    for (const state of tree) {
      for (const basin of state.basins) {
        if (!basinMap.has(basin.name)) {
          basinMap.set(basin.name, { rivers: [], standalone: [] })
          basinMeta.set(basin.name, { stateAbbr: state.name === '—' ? null : state.name, rawKey: basin.rawKey })
        }
        const m = basinMap.get(basin.name)!
        m.rivers.push(...basin.rivers)
        m.standalone.push(...basin.standaloneGauges)
      }
    }
    const subs: DisplaySubSection[] = [...basinMap.entries()]
      .sort(([a], [b]) => a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b))
      .map(([bName, { rivers, standalone }]) => {
        const merged = mergeRivers(rivers)
        const reachCount = merged.reduce((s, r) => s + r.reaches.length + r.userReaches.length, 0) + standalone.length
        const meta = basinMeta.get(bName)
        return {
          name: bName,
          key: `basin:${bName}`,
          rivers: merged,
          standaloneGauges: standalone,
          reachCount,
          rawBasinKey: meta?.rawKey ?? null,
          stateAbbr: meta?.stateAbbr ?? null,
        }
      })
    const totalCount = subs.reduce((s, b) => s + b.reachCount, 0)
    return [{ name: null, key: 'all', reachCount: totalCount, subSections: subs }]
  }

  // (!S, !B) — flat
  const allRivers = tree.flatMap(s => s.basins.flatMap(b => b.rivers))
  const allStandalone = tree.flatMap(s => s.basins.flatMap(b => b.standaloneGauges))
  const merged = mergeRivers(allRivers)
  const totalCount = merged.reduce((s, r) => s + r.reaches.length + r.userReaches.length, 0) + allStandalone.length
  return [{
    name: null,
    key: 'all',
    reachCount: totalCount,
    subSections: [{ name: null, key: 'all|flat', rivers: merged, standaloneGauges: allStandalone, reachCount: totalCount, rawBasinKey: null, stateAbbr: null }],
  }]
})

// ── Content visibility helpers ────────────────────────────────────────────────

function riverHasVisibleContent(river: RiverGroup): boolean {
  return river.reaches.length > 0 || river.userReaches.length > 0
}

function subSectionHasVisibleContent(sub: DisplaySubSection): boolean {
  return sub.standaloneGauges.length > 0 || sub.rivers.some(r => riverHasVisibleContent(r))
}

function sectionHasVisibleContent(sec: DisplaySection): boolean {
  return sec.subSections.some(s => subSectionHasVisibleContent(s))
}

// ── Per-dashboard preferences ───────────────────────────────────────────────
// Saved as one JSON blob per dashboard so grouping/filter/view/collapse/mapVisible
// stick on the dashboard they were set on. When the active dashboard changes, all
// pref refs are rehydrated from the new dashboard's blob.
type ViewMode = 'list' | 'comfortable' | 'full'
const VIEW_MODES = [
  { key: 'list',        label: 'List'        },
  { key: 'comfortable', label: 'Comfortable' },
  { key: 'full',        label: 'Full'        },
] as const

interface DashboardPrefs {
  viewMode: ViewMode
  groupByGauge: boolean
  groupByState: boolean
  groupByBasin: boolean
  collapsedSections: string[]
  mapVisible: boolean
  showRivers: boolean
}

const DEFAULT_PREFS: DashboardPrefs = {
  viewMode: 'list',
  groupByGauge: false,
  groupByState: false,
  groupByBasin: true,
  collapsedSections: [],
  mapVisible: false,
  showRivers: true,
}

function prefsKey(dashboardId: string | null): string {
  return dashboardId
    ? `h2oflow_dashboard_prefs_${dashboardId}`
    : 'h2oflow_dashboard_prefs__default'
}

function loadPrefs(dashboardId: string | null): DashboardPrefs {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_PREFS }
  try {
    const s = localStorage.getItem(prefsKey(dashboardId))
    if (!s) return { ...DEFAULT_PREFS }
    return { ...DEFAULT_PREFS, ...JSON.parse(s) }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

function savePrefs() {
  if (typeof localStorage === 'undefined') return
  const prefs: DashboardPrefs = {
    viewMode:          viewMode.value,
    groupByGauge:      groupByGauge.value,
    groupByState:      groupByState.value,
    groupByBasin:      groupByBasin.value,
    collapsedSections: [...collapsedSections.value],
    mapVisible:        mapVisible.value,
    showRivers:        showRivers.value,
  }
  localStorage.setItem(prefsKey(db.activeDashboardId.value), JSON.stringify(prefs))
}

const viewMode          = ref<ViewMode>(DEFAULT_PREFS.viewMode)
const groupByGauge      = ref(DEFAULT_PREFS.groupByGauge)
const groupByState      = ref(DEFAULT_PREFS.groupByState)
const groupByBasin      = ref(DEFAULT_PREFS.groupByBasin)
const collapsedSections = ref<Set<string>>(new Set())
const mapVisible        = ref(DEFAULT_PREFS.mapVisible)
const showRivers        = ref(DEFAULT_PREFS.showRivers)

// Hydrate refs from the active dashboard's blob. Called on mount and whenever
// activeDashboardId changes. While hydrating we suppress the save watcher so
// loading dashboard A's prefs doesn't write them under dashboard B's key.
const hydrating = ref(false)
function applyPrefs(prefs: DashboardPrefs) {
  hydrating.value = true
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
  viewMode.value          = (isMobile && prefs.viewMode === 'full') ? 'comfortable' : prefs.viewMode
  groupByGauge.value      = prefs.groupByGauge
  groupByState.value      = prefs.groupByState
  groupByBasin.value      = prefs.groupByBasin
  collapsedSections.value = new Set(prefs.collapsedSections)
  mapVisible.value        = prefs.mapVisible
  showRivers.value        = prefs.showRivers
  nextTick(() => { hydrating.value = false })
}

onMounted(() => {
  applyPrefs(loadPrefs(db.activeDashboardId.value))
})

watch(() => db.activeDashboardId.value, (id) => {
  applyPrefs(loadPrefs(id))
})

// One unified save watcher — fires after any pref ref changes (except during hydration).
watch(
  [viewMode, groupByGauge, groupByState, groupByBasin,
   collapsedSections, () => mapVisible.value, () => showRivers.value],
  () => { if (!hydrating.value) savePrefs() },
  { deep: true },
)

function toggleSection(key: string) {
  const s = new Set(collapsedSections.value)
  if (s.has(key)) s.delete(key); else s.add(key)
  collapsedSections.value = s
}

const allExpanded = computed(() => collapsedSections.value.size === 0 && !customGaugesCollapsed.value)

function toggleAllSections() {
  if (allExpanded.value) {
    const keys = new Set<string>()
    for (const sec of displaySections.value) {
      if (sec.name) keys.add(sec.key)
      for (const sub of sec.subSections) {
        if (sub.name) keys.add(sub.key)
      }
    }
    collapsedSections.value = keys
    customGaugesCollapsed.value = true
  } else {
    collapsedSections.value = new Set()
    customGaugesCollapsed.value = false
  }
}

function setViewMode(m: ViewMode) {
  viewMode.value = m
}

const groupingOptions = computed(() => [
  { key: 'state', label: 'By state', active: groupByState.value, toggle: () => { groupByState.value = !groupByState.value } },
  { key: 'basin', label: 'By basin', active: groupByBasin.value, toggle: () => { groupByBasin.value = !groupByBasin.value } },
  { key: 'river', label: 'By river', active: showRivers.value,   toggle: () => { showRivers.value = !showRivers.value } },
  { key: 'gauge', label: 'By gauge', active: groupByGauge.value, toggle: () => { groupByGauge.value = !groupByGauge.value } },
])


interface GaugeGroup { lead: WatchedGauge; all: WatchedGauge[] }
interface SplitGroups { gaugeGroups: GaugeGroup[]; ungrouped: WatchedGauge[] }

function splitReachGroups(reaches: WatchedGauge[]): SplitGroups {
  const map = new Map<string, WatchedGauge[]>()
  for (const r of reaches) {
    if (!map.has(r.id)) map.set(r.id, [])
    map.get(r.id)!.push(r)
  }
  const gaugeGroups: GaugeGroup[] = []
  const ungrouped: WatchedGauge[] = []
  for (const all of map.values()) {
    if (all.length > 1) {
      gaugeGroups.push({ lead: all[0]!, all })
    } else {
      ungrouped.push(...all)
    }
  }
  return { gaugeGroups, ungrouped }
}

const cardGridClass = computed(() =>
  viewMode.value === 'full'
    ? 'grid grid-cols-1 gap-2'
    : 'grid grid-cols-1 sm:grid-cols-2 gap-2'
)

// Container class: multi-col grid for card modes
const reachContainerClass = computed(() =>
  viewMode.value === 'list'
    ? 'space-y-2 mt-1'
    : `${cardGridClass.value} mt-1`
)

// ── UI state ─────────────────────────────────────────────────────────────────
const searchOpen   = ref(false)
const groupingOpen = ref(false)
const groupingWrap = ref<HTMLElement | null>(null)

async function handleAdd(gauge: Omit<WatchedGauge, 'watchState' | 'activeSince'>, dashboardId: string | null) {
  const targetId = dashboardId ?? db.activeDashboard.value?.id ?? null
  await addAndSync(gauge, targetId)
  // Re-hydrate from server so we know the gauge persisted under the right dashboard.
  // Without this round-trip, a stale unique constraint or wrong dashboard_id silently
  // drops the gauge on the next refresh, surfacing as "appears, then disappears."
  if (targetId) {
    await activateDashboard(targetId)
    await refresh()
  }
}

interface AddedExternalPayload {
  kind: 'reach' | 'custom_gauge'
  reachId?: string
  reachSlug?: string
  customGaugeId?: string
}

async function onAddedExternal(payload?: AddedExternalPayload) {
  // Re-adding via the modal should clear the local trash-hidden flag — otherwise
  // the section gate (visibleUserReaches/visibleCustomGauges) keeps the row hidden
  // and the click looks like a no-op.
  if (payload?.kind === 'reach' && payload.reachId && hiddenReaches.value.has(payload.reachId)) {
    showReach(payload.reachId)
  }
  if (payload?.kind === 'custom_gauge' && payload.customGaugeId && hiddenCustomGauges.value.has(payload.customGaugeId)) {
    showCustomGauge(payload.customGaugeId)
  }

  await loadUserReaches()
  await loadCustomGauges()
  const id = db.activeDashboard.value?.id
  if (id) {
    await activateDashboard(id)
    await refresh()
  }
}

const detailOpen  = ref(false)
const detailGauge = ref<WatchedGauge | null>(null)
const detailMode  = ref<'gauge' | 'reach'>('gauge')
function openGauge(gauge: WatchedGauge, mode: 'gauge' | 'reach' = 'gauge') {
  detailGauge.value = gauge
  detailMode.value = mode
  detailOpen.value = true
}

const aggregateLabel  = ref('')
const aggregateGauges = ref<WatchedGauge[]>([])
function openAggregate(label: string, gauges: WatchedGauge[]) { aggregateLabel.value = label; aggregateGauges.value = gauges }
function closeAggregate() { aggregateGauges.value = [] }
</script>
