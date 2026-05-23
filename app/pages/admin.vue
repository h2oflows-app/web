<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950">
    <AppHeader />

    <main class="max-w-5xl mx-auto px-4 py-6 space-y-6">

      <!-- Not authorized -->
      <div v-if="!isDataAdmin && authReady" class="mt-20 flex flex-col items-center gap-3 text-center">
        <svg class="w-10 h-10 text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <h2 class="text-lg font-semibold">Access restricted</h2>
        <p class="text-sm text-neutral-500">You need data admin or site admin permissions to view this page.</p>
      </div>

      <!-- Loading auth -->
      <div v-else-if="!authReady" class="mt-20 flex justify-center">
        <div class="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
      </div>

      <!-- Admin UI -->
      <template v-else>
        <div class="flex items-center justify-between">
          <h1 class="text-xl font-bold text-neutral-900 dark:text-white">Admin</h1>
        </div>

        <!-- Tabs -->
        <div class="flex gap-1 border-b border-neutral-200 dark:border-neutral-800">
          <button
            v-for="tab in visibleTabs" :key="tab.key"
            class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
            :class="activeTab === tab.key
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'"
            @click="activeTab = tab.key; if (tab.key === 'corrections') loadCorrections(); if (tab.key === 'gauges' && adminGauges.length === 0) loadAdminGauges()"
          >{{ tab.label }}</button>
        </div>

        <!-- Rivers tab -->
        <div v-if="activeTab === 'rivers'">
          <div class="flex items-center justify-between mb-3">
            <p class="text-sm text-neutral-500">
              {{ rivers.length }} rivers
              <template v-if="unassignedReaches.length"> · <span class="text-amber-500">{{ unassignedReaches.length }} unassigned</span></template>
            </p>
            <div class="flex items-center gap-2">
              <UButton size="xs" variant="outline" color="neutral" icon="i-heroicons-plus" @click="authorModalOpen = true">New Run</UButton>
              <UButton size="xs" icon="i-heroicons-plus" @click="createRiverOpen = true">New river</UButton>
            </div>
          </div>

          <UInput v-model="riverSearch" icon="i-heroicons-magnifying-glass" placeholder="Search runs…" class="mb-3" />

          <div v-if="riversLoading" class="space-y-2">
            <div v-for="i in 5" :key="i" class="h-12 rounded-lg bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
          </div>

          <div v-if="!riversLoading" class="divide-y divide-neutral-100 dark:divide-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
            <template v-for="stateGroup in groupedByStateBasin" :key="stateGroup.state">
              <!-- State header -->
              <div class="px-4 py-1.5 bg-neutral-100 dark:bg-neutral-800/80 border-t border-neutral-200 dark:border-neutral-700 first:border-t-0">
                <p class="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                  {{ stateGroup.state === '—' ? 'No state' : stateGroup.state }}
                </p>
              </div>

              <template v-for="basinGroup in stateGroup.basins" :key="basinGroup.basin + stateGroup.state">
                <!-- Basin sub-header -->
                <div class="px-6 py-1 bg-neutral-50 dark:bg-neutral-900/60 border-t border-neutral-100 dark:border-neutral-800">
                  <p class="text-xs text-neutral-400 dark:text-neutral-500">{{ basinGroup.basin === '—' ? 'No basin' : basinGroup.basin }}</p>
                </div>

              <template v-for="river in basinGroup.rivers.filter(r => isRiverVisible(r.river_id))" :key="river.river_id + stateGroup.state">
                <!-- River row -->
                <div
                  class="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors"
                  @click="toggleRiverGroup(stateGroup.state, river.river_id)"
                >
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-neutral-900 dark:text-white truncate">{{ river.river_name }}</p>
                    <p class="text-xs text-neutral-400 flex items-center gap-1.5 flex-wrap">
                      <span>{{ river.reaches.length }} reach{{ river.reaches.length !== 1 ? 'es' : '' }}<template v-if="river.river_basin"> · {{ river.river_basin }}</template></span>
                      <template v-if="riverHealthMap.get(river.river_slug) as any">
                        <span v-if="(riverHealthMap.get(river.river_slug)?.gauges_unreachable ?? 0) > 0" class="inline-flex items-center gap-0.5 text-red-500 dark:text-red-400 font-medium">
                          <span class="w-1.5 h-1.5 rounded-full bg-red-500 dark:bg-red-400 inline-block" />
                          {{ riverHealthMap.get(river.river_slug)?.gauges_unreachable }} offline
                        </span>
                        <span v-else-if="(riverHealthMap.get(river.river_slug)?.gauges_stale ?? 0) > 0" class="inline-flex items-center gap-0.5 text-amber-500 dark:text-amber-400 font-medium">
                          <span class="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 inline-block" />
                          {{ riverHealthMap.get(river.river_slug)?.gauges_stale }} stale
                        </span>
                      </template>
                    </p>
                  </div>
                  <svg
                    class="w-4 h-4 text-neutral-400 shrink-0 transition-transform"
                    :class="isRiverExpanded(stateGroup.state, river.river_id) ? 'rotate-90' : ''"
                    viewBox="0 0 20 20" fill="currentColor"
                  >
                    <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd"/>
                  </svg>
                </div>

                <!-- Expanded reaches -->
                <div v-if="isRiverExpanded(stateGroup.state, river.river_id)" class="bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-100 dark:border-neutral-800">
                  <!-- River actions bar -->
                  <div class="flex items-center justify-between px-6 py-2 border-b border-neutral-100 dark:border-neutral-800">
                    <span class="text-xs text-neutral-400 font-mono">{{ river.river_slug }}</span>
                    <div class="flex items-center gap-2">
                      <UButton size="xs" variant="ghost" color="neutral" @click.stop="openEditRiverBySlug(river.river_slug)">Edit</UButton>
                      <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-arrows-up-down" :loading="reorderingRiver === river.river_slug" @click.stop="reorderReaches(river.river_slug)">Re-order</UButton>
                      <UButton size="xs" variant="ghost" color="error" @click.stop="deleteRiver(river.river_slug, river.river_name)">Delete river</UButton>
                    </div>
                  </div>
                  <!-- Reach rows -->
                  <div class="divide-y divide-neutral-100 dark:divide-neutral-800">
                    <div
                      v-for="(reach, reachIdx) in river.reaches" :key="reach.id"
                      class="flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-neutral-900/60"
                    >
                      <!-- Up/down order buttons -->
                      <div class="flex flex-col gap-0.5 shrink-0">
                        <button
                          class="w-4 h-4 flex items-center justify-center text-neutral-300 hover:text-neutral-500 dark:hover:text-neutral-400 disabled:opacity-20 disabled:cursor-default"
                          :disabled="reachIdx === 0"
                          @click.stop="moveReach(stateGroup.state, river.river_id, reachIdx, -1)"
                        >
                          <svg viewBox="0 0 16 16" fill="currentColor" class="w-3 h-3"><path d="M8 4l-5 5h10z"/></svg>
                        </button>
                        <button
                          class="w-4 h-4 flex items-center justify-center text-neutral-300 hover:text-neutral-500 dark:hover:text-neutral-400 disabled:opacity-20 disabled:cursor-default"
                          :disabled="reachIdx === river.reaches.length - 1"
                          @click.stop="moveReach(stateGroup.state, river.river_id, reachIdx, 1)"
                        >
                          <svg viewBox="0 0 16 16" fill="currentColor" class="w-3 h-3"><path d="M8 12l5-5H3z"/></svg>
                        </button>
                      </div>

                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium truncate">{{ reach.common_name ?? reach.name }}</p>
                        <p class="text-xs text-neutral-400 truncate">{{ reach.slug }}</p>
                      </div>

                      <div class="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                        <span v-if="reach.state_abbr" class="text-xs font-mono px-1.5 py-0.5 rounded bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400">{{ reach.state_abbr }}</span>
                        <span
                          class="text-xs px-1.5 py-0.5 rounded"
                          :class="reach.has_centerline
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'"
                        >{{ reach.has_centerline ? 'Line ✓' : 'No line' }}</span>
                        <UButton size="xs" variant="outline" color="error" @click.stop="deleteReachFromGroup(stateGroup.state, river.river_id, reach.slug, reach.common_name ?? reach.name)">Delete</UButton>
                        <NuxtLink :to="`/runs/${reach.slug}/edit`" class="text-xs text-primary-500 hover:underline">Edit</NuxtLink>
                      </div>
                    </div>
                    <div v-if="river.reaches.length === 0" class="px-6 py-4 text-center text-sm text-neutral-400">No runs in this state</div>
                  </div>
                </div>
              </template>
              </template>  <!-- end basin loop -->
            </template>

            <div v-if="groupedByStateBasin.length === 0 && !riversLoading" class="px-4 py-8 text-center text-sm text-neutral-400">
              {{ riverSearch ? 'No reaches match your search' : 'No reaches yet' }}
            </div>

            <!-- Pagination -->
            <div v-if="totalPages > 1 || totalRivers > 10" class="flex items-center justify-between px-4 py-2.5 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 text-xs text-neutral-500">
              <div class="flex items-center gap-2">
                <span>Show</span>
                <select v-model="pageSize" class="rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-1.5 py-0.5 text-xs" @change="currentPage = 1">
                  <option :value="10">10</option>
                  <option :value="50">50</option>
                  <option :value="100">100</option>
                </select>
                <span>per page · {{ totalRivers }} rivers total</span>
              </div>
              <div class="flex items-center gap-1">
                <button class="px-2 py-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-30" :disabled="currentPage <= 1" @click="currentPage--">‹</button>
                <span>{{ currentPage }} / {{ totalPages }}</span>
                <button class="px-2 py-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-30" :disabled="currentPage >= totalPages" @click="currentPage++">›</button>
              </div>
            </div>

            <!-- Unassigned reaches group -->
            <template v-if="unassignedReaches.length">
              <div
                class="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/30 cursor-pointer transition-colors border-t border-neutral-100 dark:border-neutral-800"
                @click="unassignedExpanded = !unassignedExpanded"
              >
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-amber-800 dark:text-amber-300">Unassigned</p>
                  <p class="text-xs text-amber-600 dark:text-amber-500">No river association — assign via run edit page</p>
                </div>
                <span class="text-xs text-amber-600 dark:text-amber-400 shrink-0">{{ unassignedReaches.length }} reach{{ unassignedReaches.length !== 1 ? 'es' : '' }}</span>
                <svg class="w-4 h-4 text-amber-400 shrink-0 transition-transform" :class="unassignedExpanded ? 'rotate-90' : ''" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd"/>
                </svg>
              </div>
              <div v-if="unassignedExpanded" class="bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-100 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800">
                <div
                  v-for="reach in unassignedReaches" :key="reach.id"
                  class="flex items-center gap-3 px-6 py-2.5 bg-white dark:bg-neutral-900/60"
                >
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium truncate">{{ reach.common_name ?? reach.name }}</p>
                    <p class="text-xs text-neutral-400 truncate">
                      {{ reach.slug }}
                      <span v-if="reach.river_name" class="text-amber-500"> · {{ reach.river_name }}</span>
                    </p>
                  </div>
                  <div class="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    <span
                      class="text-xs px-1.5 py-0.5 rounded"
                      :class="reach.has_centerline
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'"
                    >{{ reach.has_centerline ? 'Line ✓' : 'No line' }}</span>
                    <UButton size="xs" variant="outline" color="error" @click="deleteReachFromGroup('', '', reach.slug, reach.common_name ?? reach.name)">Delete</UButton>
                    <NuxtLink :to="`/runs/${reach.slug}/edit`" class="text-xs text-primary-500 hover:underline">Edit</NuxtLink>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- Corrections tab -->
        <div v-if="activeTab === 'corrections'">
          <div v-if="correctionsLoading" class="space-y-2">
            <div v-for="i in 3" :key="i" class="h-16 rounded-lg bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
          </div>
          <div v-else-if="corrections.length === 0" class="px-4 py-10 text-center text-sm text-neutral-400">
            No pending corrections
          </div>
          <div v-else class="divide-y divide-neutral-100 dark:divide-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
            <div
              v-for="c in corrections" :key="c.id"
              class="flex items-start gap-3 px-4 py-3 bg-white dark:bg-neutral-900"
            >
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-neutral-800 dark:text-neutral-100">{{ c.river_name }}</p>
                <p class="text-xs text-neutral-400 mt-0.5">
                  <span class="font-mono text-primary-500">{{ c.field }}</span> →
                  <span class="font-semibold text-neutral-700 dark:text-neutral-200">{{ c.proposed_value }}</span>
                  <span class="ml-1 text-neutral-300 dark:text-neutral-600">current: {{ c.field === 'basin' ? (c.river_basin ?? '—') : (c.river_state ?? '—') }}</span>
                </p>
                <p v-if="c.note" class="text-xs text-neutral-400 mt-0.5 italic">"{{ c.note }}"</p>
                <p class="text-xs text-neutral-300 dark:text-neutral-600 mt-0.5">by {{ c.proposed_by.slice(0, 8) }}… · {{ relativeDate(c.created_at) }}</p>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <UButton size="xs" color="primary" :loading="reviewingId === c.id" @click="reviewCorrection(c.id, 'accept')">Accept</UButton>
                <UButton size="xs" variant="ghost" color="neutral" :loading="reviewingId === c.id" @click="reviewCorrection(c.id, 'reject')">Reject</UButton>
              </div>
            </div>
          </div>
        </div>

        <!-- Gauges tab -->
        <div v-if="activeTab === 'gauges'">
          <!-- Summary row -->
          <div v-if="gaugeSummary" class="flex flex-wrap gap-3 mb-3 text-sm">
            <span class="text-neutral-500">{{ gaugeSummary.total }} gauges</span>
            <span v-if="gaugeSummary.unreachable" class="text-red-500 font-medium">{{ gaugeSummary.unreachable }} offline</span>
            <span v-if="gaugeSummary.stale" class="text-amber-500 font-medium">{{ gaugeSummary.stale }} stale</span>
            <span v-if="gaugeSummary.degraded" class="text-neutral-400">{{ gaugeSummary.degraded }} degraded</span>
            <span class="text-neutral-400">{{ gaugeSummary.healthy }} healthy</span>
          </div>

          <!-- Filters -->
          <div class="flex flex-wrap items-center gap-2 mb-3">
            <UInput v-model="gaugeSearch" icon="i-heroicons-magnifying-glass" placeholder="Search name or ID…" size="sm" class="w-48" @input="debounceGaugeLoad" />
            <div class="flex rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 text-xs">
              <button v-for="f in gaugeHealthFilters" :key="f.value"
                class="px-2.5 py-1.5 transition-colors"
                :class="gaugeHealthFilter === f.value ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200' : 'text-neutral-400 hover:text-neutral-600'"
                @click="gaugeHealthFilter = f.value; loadAdminGauges()"
              >{{ f.label }}</button>
            </div>
            <label class="flex items-center gap-1.5 text-xs text-neutral-500 cursor-pointer select-none">
              <input type="checkbox" v-model="gaugeShowRetired" class="rounded" @change="loadAdminGauges()" />
              Show retired
            </label>
          </div>

          <!-- Table -->
          <div v-if="gaugesLoading" class="space-y-1.5">
            <div v-for="i in 8" :key="i" class="h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
          </div>
          <div v-else-if="adminGauges.length === 0" class="px-4 py-10 text-center text-sm text-neutral-400">
            No gauges match filters
          </div>
          <div v-else class="rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
            <table class="w-full text-xs">
              <thead class="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 dark:text-neutral-400">
                <tr>
                  <th class="text-left px-3 py-2 font-medium">Gauge</th>
                  <th class="text-left px-3 py-2 font-medium hidden sm:table-cell">Source</th>
                  <th class="text-left px-3 py-2 font-medium">Health</th>
                  <th class="text-right px-3 py-2 font-medium hidden md:table-cell">Last reading</th>
                  <th class="text-right px-3 py-2 font-medium hidden md:table-cell">Fails</th>
                  <th class="text-right px-3 py-2 font-medium hidden sm:table-cell">Reaches</th>
                  <th class="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800 bg-white dark:bg-neutral-900">
                <tr v-for="g in adminGauges" :key="g.id" class="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                  <td class="px-3 py-2">
                    <p class="font-medium text-neutral-800 dark:text-neutral-100 truncate max-w-50">{{ g.name || g.external_id }}</p>
                    <a
                      v-if="gaugeSourceUrl(g.source, g.external_id)"
                      :href="gaugeSourceUrl(g.source, g.external_id)!"
                      target="_blank"
                      rel="noopener"
                      class="text-neutral-400 font-mono hover:underline hover:text-primary-500 transition-colors"
                      @click.stop
                    >{{ g.external_id }}</a>
                    <p v-else class="text-neutral-400 font-mono">{{ g.external_id }}</p>
                  </td>
                  <td class="px-3 py-2 hidden sm:table-cell text-neutral-500 uppercase font-mono">{{ g.source }}</td>
                  <td class="px-3 py-2">
                    <span :class="['inline-flex items-center rounded-full px-1.5 py-0.5 font-medium', gaugeHealthClass(g.poll_health)]">
                      {{ g.poll_health }}
                    </span>
                    <p v-if="g.status !== 'active'" class="text-neutral-400 mt-0.5">{{ g.status }}</p>
                  </td>
                  <td class="px-3 py-2 text-right hidden md:table-cell text-neutral-500">
                    {{ g.last_reading_at ? relativeDate(g.last_reading_at) : '—' }}
                  </td>
                  <td class="px-3 py-2 text-right hidden md:table-cell" :class="g.consecutive_poll_failures > 0 ? 'text-amber-500' : 'text-neutral-400'">
                    {{ g.consecutive_poll_failures || '—' }}
                  </td>
                  <td class="px-3 py-2 text-right hidden sm:table-cell text-neutral-500">{{ g.reach_count }}</td>
                  <td class="px-3 py-2">
                    <div class="flex items-center justify-end gap-1">
                      <UButton size="xs" variant="ghost" color="neutral" :loading="gaugePollId === g.id" title="Force poll" @click="adminPollGauge(g.id)">
                        <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M13.5 8A5.5 5.5 0 1 1 10 3.07"/><path d="M10 2v3h3"/>
                        </svg>
                      </UButton>
                      <UButton v-if="g.status !== 'retired'" size="xs" variant="ghost" color="neutral" title="Retire gauge" @click="adminRetireGauge(g.id)">
                        <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M2 8h12M8 2l6 6-6 6"/>
                        </svg>
                      </UButton>
                      <UButton v-if="g.status === 'retired' || g.status === 'inactive'" size="xs" variant="ghost" color="primary" title="Reactivate" @click="adminReactivateGauge(g.id)">
                        <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-8.68"/>
                        </svg>
                      </UButton>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
            <!-- Pagination -->
            <div v-if="gaugeTotal > gaugeLimit" class="flex items-center justify-between px-3 py-2 border-t border-neutral-100 dark:border-neutral-800 text-xs text-neutral-500">
              <span>{{ gaugeOffset + 1 }}–{{ Math.min(gaugeOffset + gaugeLimit, gaugeTotal) }} of {{ gaugeTotal }}</span>
              <div class="flex gap-1">
                <UButton size="xs" variant="outline" color="neutral" :disabled="gaugeOffset === 0" @click="gaugeOffset -= gaugeLimit; loadAdminGauges()">Prev</UButton>
                <UButton size="xs" variant="outline" color="neutral" :disabled="gaugeOffset + gaugeLimit >= gaugeTotal" @click="gaugeOffset += gaugeLimit; loadAdminGauges()">Next</UButton>
              </div>
            </div>
          </div>
        </div>

        <!-- Users tab (site admin only) -->
        <div v-if="activeTab === 'users'">
          <div class="flex items-center justify-between mb-4">
            <p class="text-sm text-neutral-500">Role assignments</p>
            <UButton size="xs" icon="i-heroicons-plus" @click="assignRoleOpen = true">Assign role</UButton>
          </div>

          <div v-if="rolesLoading" class="space-y-2">
            <div v-for="i in 3" :key="i" class="h-12 rounded-lg bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
          </div>

          <div v-else class="divide-y divide-neutral-100 dark:divide-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
            <div
              v-for="ur in userRoles" :key="ur.id"
              class="flex items-center gap-3 px-4 py-3 bg-white dark:bg-neutral-900"
            >
              <div class="flex-1 min-w-0">
                <p class="text-xs font-mono text-neutral-500 truncate">{{ ur.user_id }}</p>
                <p class="text-xs text-neutral-400">
                  <span class="font-medium text-neutral-700 dark:text-neutral-300">{{ ur.role }}</span>
                  <template v-if="ur.river_name"> · {{ ur.river_name }}</template>
                </p>
              </div>
              <button
                class="text-xs text-red-400 hover:text-red-600 transition-colors shrink-0 px-2 py-1 rounded"
                @click="revokeRole(ur.id)"
              >Revoke</button>
            </div>
            <div v-if="userRoles.length === 0" class="px-4 py-8 text-center text-sm text-neutral-400">No role assignments</div>
          </div>
        </div>
      </template>
    </main>

    <!-- Create river modal — GNIS ID only -->
    <UModal v-model:open="createRiverOpen" title="New river">
      <template #body>
        <div class="space-y-3">
          <p class="text-xs text-neutral-400">Rivers are defined by their GNIS ID. Name, state, and basin are fetched from NHD.</p>
          <UFormField label="GNIS ID">
            <div class="flex items-center gap-2">
              <UInput v-model="newRiverGnisId" placeholder="00183164" class="max-w-48" @blur="previewGNIS" />
              <span v-if="gnisPreviewLoading" class="text-xs text-neutral-400 animate-pulse">Looking up…</span>
            </div>
          </UFormField>
          <!-- Preview card -->
          <div v-if="gnisPreview" class="rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 bg-neutral-50 dark:bg-neutral-900 space-y-1 text-sm">
            <p class="font-semibold text-neutral-900 dark:text-white">{{ gnisPreview.name }}</p>
            <p class="text-xs text-neutral-400">
              <span v-if="gnisPreview.state_abbr">{{ gnisPreview.state_abbr }}</span>
              <span v-if="gnisPreview.basin"> · {{ gnisPreview.basin }}</span>
              <span v-if="gnisPreview.huc8"> · HUC8 {{ gnisPreview.huc8 }}</span>
            </p>
          </div>
          <p v-if="gnisPreviewError" class="text-xs text-red-500">{{ gnisPreviewError }}</p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="createRiverOpen = false">Cancel</UButton>
          <UButton :loading="createLoading" :disabled="!gnisPreview" @click="createRiver">Add river</UButton>
        </div>
      </template>
    </UModal>

    <!-- Edit river modal -->
    <UModal v-model:open="editRiverOpen" title="Edit river">
      <template #body>
        <div v-if="editingRiver" class="space-y-3">
          <div class="rounded-lg border border-neutral-100 dark:border-neutral-800 p-3 bg-neutral-50 dark:bg-neutral-900 space-y-1 text-sm">
            <p class="font-semibold text-neutral-900 dark:text-white">{{ editingRiver.name }}</p>
            <p class="text-xs text-neutral-400 font-mono">
              GNIS {{ editingRiver.gnis_id || '—' }}
              <span v-if="editingRiver.huc8"> · HUC8 {{ editingRiver.huc8 }}</span>
            </p>
          </div>

          <UFormField label="State (2-letter)">
            <UInput v-model="editingRiver.state_abbr" placeholder="CO" class="max-w-24" :maxlength="2" />
          </UFormField>

          <UFormField label="Basin">
            <UInput v-model="editingRiver.basin" placeholder="South Platte" class="flex-1" />
          </UFormField>

          <div class="flex items-center gap-2 pt-1">
            <UButton
              size="xs"
              variant="outline"
              color="neutral"
              :loading="editGnisPreviewLoading"
              :disabled="!editingRiver.gnis_id"
              @click="previewEditRiverGNIS"
            >Lookup from NLDI</UButton>
            <span v-if="editGnisPreviewLoading" class="text-xs text-neutral-400 animate-pulse">Looking up…</span>
          </div>

          <div v-if="editGnisPreview" class="rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 bg-neutral-50 dark:bg-neutral-900 space-y-2 text-sm">
            <div>
              <p class="font-semibold text-neutral-900 dark:text-white">{{ editGnisPreview.name }}</p>
              <p class="text-xs text-neutral-400">
                <span v-if="editGnisPreview.state_abbr">{{ editGnisPreview.state_abbr }}</span>
                <span v-if="editGnisPreview.basin"> · {{ editGnisPreview.basin }}</span>
                <span v-if="editGnisPreview.huc8"> · HUC8 {{ editGnisPreview.huc8 }}</span>
              </p>
            </div>
            <UButton size="xs" color="primary" @click="applyEditGnisPreview">Apply</UButton>
          </div>
          <p v-if="editGnisPreviewError" class="text-xs text-red-500">{{ editGnisPreviewError }}</p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="editRiverOpen = false">Cancel</UButton>
          <UButton :loading="editRiverLoading" @click="saveEditRiver">Save</UButton>
        </div>
      </template>
    </UModal>

    <!-- New reach modal -->
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
          <div class="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
            <RunAuthor @created="onAuthorCreated" @cancel="authorModalOpen = false" />
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Assign role modal -->
    <UModal v-model:open="assignRoleOpen" title="Assign role">
      <template #body>
        <div class="space-y-3">
          <UFormField label="User ID (Supabase UUID)">
            <UInput v-model="newRole.user_id" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
          </UFormField>
          <UFormField label="Role">
            <select v-model="newRole.role" class="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm">
              <option value="data_admin">data_admin</option>
              <option value="site_admin">site_admin</option>
            </select>
          </UFormField>
          <UFormField label="River (optional — leave blank for global)">
            <select v-model="newRole.river_id" class="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm">
              <option value="">Global (all rivers)</option>
              <option v-for="r in rivers" :key="r.id" :value="r.id">{{ r.name }}</option>
            </select>
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="assignRoleOpen = false">Cancel</UButton>
          <UButton :loading="assignLoading" @click="assignRole">Assign</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'

definePageMeta({ ssr: false })

const { isAdmin, isDataAdmin, loadAdminRoles, getToken } = useAuth()
const { apiBase } = useRuntimeConfig().public
const router = useRouter()

// ── New reach modal ───────────────────────────────────────────────────────────
const authorModalOpen = ref(false)

function onAuthorCreated(slug: string) {
  authorModalOpen.value = false
  router.push(`/runs/${slug}/edit`)
}

// Auth readiness — wait for roles to load before showing gated UI
const authReady = ref(false)
onMounted(async () => {
  await loadAdminRoles()
  authReady.value = true
  if (isDataAdmin.value) {
    loadRivers()
    loadPendingCount()
    if (isAdmin.value) loadUserRoles()
  }
})

async function loadPendingCount() {
  const token = await getToken()
  const res = await fetch(`${apiBase}/api/v1/admin/river-corrections?status=pending`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.ok) {
    const data = await res.json()
    pendingCorrectionsCount.value = Array.isArray(data) ? data.length : 0
  }
}

// Hard-refresh race: Supabase restores the session asynchronously, so
// user.value may be null when onMounted runs. Once isDataAdmin flips to
// true we trigger a load if rivers haven't been fetched yet.
watch(isDataAdmin, (val) => {
  if (val && authReady.value && !riversLoading.value && rivers.value.length === 0) {
    loadRivers()
    loadPendingCount()
    if (isAdmin.value) loadUserRoles()
  }
})

// ── Tabs ──────────────────────────────────────────────────────────────────────
const activeTab = ref('rivers')
const visibleTabs = computed(() => {
  const tabs: { key: string; label: string }[] = [{ key: 'rivers', label: 'Rivers' }]
  tabs.push({ key: 'corrections', label: pendingCorrectionsCount.value > 0 ? `Needs Review (${pendingCorrectionsCount.value})` : 'Needs Review' })
  tabs.push({ key: 'gauges', label: 'Gauges' })
  if (isAdmin.value) tabs.push({ key: 'users', label: 'Users' })
  return tabs
})

// ── Rivers ────────────────────────────────────────────────────────────────────
interface River { id: string; slug: string; name: string; gnis_id: string | null; basin: string | null; state_abbr: string | null; huc8: string | null; reach_count: number; gauges_degraded: number; gauges_stale: number; gauges_unreachable: number }
interface RiverDetail extends River {
  reaches: { id: string; slug: string; name: string; common_name: string | null; has_centerline: boolean; state_abbr: string | null; river_order: number | null }[]
}
interface GroupedReach { id: string; slug: string; name: string; common_name: string | null; river_order: number | null; state_abbr: string; has_centerline: boolean }
interface GroupedRiver { river_id: string; river_slug: string; river_name: string; river_basin: string; reaches: GroupedReach[] }
interface GroupedState { state: string; rivers: GroupedRiver[] }
interface GroupedBasin { basin: string; rivers: GroupedRiver[] }
interface GroupedStateBasin { state: string; basins: GroupedBasin[] }

const rivers = ref<River[]>([])
const riverHealthMap = computed(() => {
  const m = new Map<string, Pick<River, 'gauges_degraded' | 'gauges_stale' | 'gauges_unreachable'>>()
  for (const rv of rivers.value) m.set(rv.slug, rv)
  return m
})
const groupedReaches = ref<GroupedState[]>([])
const riversLoading = ref(false)
const riverSearch = ref('')
const expandedRiverKeys = ref<Set<string>>(new Set())

// Pagination
const pageSize = ref(50)
const currentPage = ref(1)
watch(riverSearch, () => { currentPage.value = 1 })

function riverKey(state: string, riverId: string) { return `${state}::${riverId}` }
function isRiverExpanded(state: string, riverId: string) { return expandedRiverKeys.value.has(riverKey(state, riverId)) }
function toggleRiverGroup(state: string, riverId: string) {
  const key = riverKey(state, riverId)
  const next = new Set(expandedRiverKeys.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expandedRiverKeys.value = next
}

// Filter + basin grouping
const filteredGroupedReaches = computed(() => {
  const q = riverSearch.value.toLowerCase()
  const base = q
    ? groupedReaches.value
        .map(sg => ({
          ...sg,
          rivers: sg.rivers
            .map(rv => ({
              ...rv,
              reaches: rv.reaches.filter(re =>
                re.name.toLowerCase().includes(q) ||
                (re.common_name ?? '').toLowerCase().includes(q) ||
                rv.river_name.toLowerCase().includes(q) ||
                re.state_abbr.toLowerCase().includes(q)
              ),
            }))
            .filter(rv => rv.reaches.length > 0),
        }))
        .filter(sg => sg.rivers.length > 0)
    : groupedReaches.value
  return base
})

// State→Basin→River hierarchy for rendering
const groupedByStateBasin = computed((): GroupedStateBasin[] => {
  return filteredGroupedReaches.value.map(sg => {
    const basinMap = new Map<string, GroupedRiver[]>()
    for (const rv of sg.rivers) {
      const b = rv.river_basin || '—'
      if (!basinMap.has(b)) basinMap.set(b, [])
      basinMap.get(b)!.push(rv)
    }
    const basins: GroupedBasin[] = Array.from(basinMap.entries()).map(([basin, rivers]) => ({ basin, rivers }))
    return { state: sg.state, basins }
  })
})

// Paginate by total river count across all state groups
const allRivers = computed(() => filteredGroupedReaches.value.flatMap(sg => sg.rivers))
const totalRivers = computed(() => allRivers.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalRivers.value / pageSize.value)))
const pagedRiverIds = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return new Set(allRivers.value.slice(start, start + pageSize.value).map(r => r.river_id))
})

function isRiverVisible(riverId: string) { return pagedRiverIds.value.has(riverId) }

const unassignedReaches = ref<{ id: string; slug: string; name: string; common_name: string | null; river_name: string | null; has_centerline: boolean }[]>([])
const unassignedExpanded = ref(false)

async function loadRivers() {
  riversLoading.value = true
  const token = await getToken()
  if (!token) { riversLoading.value = false; return }
  try {
    const [rRes, uRes, gRes] = await Promise.all([
      fetch(`${apiBase}/api/v1/admin/rivers`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${apiBase}/api/v1/admin/runs/unassigned`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${apiBase}/api/v1/admin/runs/grouped`, { headers: { Authorization: `Bearer ${token}` } }),
    ])
    if (rRes.ok) rivers.value = await rRes.json()
    if (uRes.ok) unassignedReaches.value = await uRes.json()
    if (gRes.ok) groupedReaches.value = await gRes.json()
  } finally {
    riversLoading.value = false
  }
}

async function openEditRiverBySlug(slug: string) {
  const token = await getToken()
  const res = await fetch(`${apiBase}/api/v1/admin/rivers/${slug}`, { headers: { Authorization: `Bearer ${token}` } })
  if (res.ok) {
    const rv: RiverDetail = await res.json()
    openEditRiver(rv)
  }
}

async function moveReach(state: string, riverId: string, reachIdx: number, direction: 1 | -1) {
  const sg = groupedReaches.value.find(s => s.state === state)
  if (!sg) return
  const rv = sg.rivers.find(r => r.river_id === riverId)
  if (!rv) return
  const swapIdx = reachIdx + direction
  if (swapIdx < 0 || swapIdx >= rv.reaches.length) return

  const a = rv.reaches[reachIdx]
  const b = rv.reaches[swapIdx]
  const orderA = a.river_order ?? (reachIdx + 1)
  const orderB = b.river_order ?? (swapIdx + 1)

  // Optimistic update
  rv.reaches[reachIdx] = { ...b, river_order: orderA }
  rv.reaches[swapIdx] = { ...a, river_order: orderB }
  groupedReaches.value = [...groupedReaches.value]

  const token = await getToken()
  await Promise.all([
    fetch(`${apiBase}/api/v1/admin/runs/${a.slug}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ river_order: orderB }),
    }),
    fetch(`${apiBase}/api/v1/admin/runs/${b.slug}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ river_order: orderA }),
    }),
  ])
}

async function deleteReachFromGroup(state: string, riverId: string, reachSlug: string, displayName: string) {
  if (!confirm(`Permanently delete "${displayName}"?\n\nThis removes all rapids, access points, and features. Gauges are unlinked but kept.`)) return
  const token = await getToken()
  const res = await fetch(`${apiBase}/api/v1/reaches/${reachSlug}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) { alert(`Delete failed: ${res.status}`); return }
  // Remove optimistically from grouped state, then full refresh
  const sg = groupedReaches.value.find(s => s.state === state)
  if (sg) {
    const rv = sg.rivers.find(r => r.river_id === riverId)
    if (rv) rv.reaches = rv.reaches.filter(r => r.slug !== reachSlug)
    groupedReaches.value = [...groupedReaches.value]
  }
  loadRivers()
}

const reorderingRiver = ref<string | null>(null)
async function reorderReaches(riverSlug: string) {
  reorderingRiver.value = riverSlug
  try {
    const token = await getToken()
    const res = await fetch(`${apiBase}/api/v1/admin/rivers/${riverSlug}/reorder-reaches`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) { alert(`Reorder failed: ${res.status}`); return }
    loadRivers()
  } finally {
    reorderingRiver.value = null
  }
}

async function deleteRiver(riverSlug: string, riverName: string) {
  if (!confirm(`Permanently delete "${riverName}"?\n\nAll reaches will be unlinked but not deleted.`)) return
  const token = await getToken()
  const res = await fetch(`${apiBase}/api/v1/admin/rivers/${riverSlug}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) { alert(`Delete failed: ${res.status}`); return }
  loadRivers()
}

// Create river — GNIS ID only
const createRiverOpen = ref(false)
const createLoading = ref(false)
const newRiverGnisId = ref('')
const gnisPreviewLoading = ref(false)
const gnisPreviewError = ref('')
const gnisPreview = ref<{ name: string; state_abbr: string; basin: string; huc8: string } | null>(null)

watch(createRiverOpen, v => {
  if (!v) { newRiverGnisId.value = ''; gnisPreview.value = null; gnisPreviewError.value = '' }
})

async function previewGNIS() {
  const id = newRiverGnisId.value.trim()
  if (!id) { gnisPreview.value = null; return }
  gnisPreviewLoading.value = true
  gnisPreviewError.value = ''
  gnisPreview.value = null
  try {
    const token = await getToken()
    const res = await fetch(`${apiBase}/api/v1/admin/rivers/gnis-lookup?gnis_id=${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (!res.ok) { gnisPreviewError.value = data.error ?? `Error ${res.status}`; return }
    if (!data.name) { gnisPreviewError.value = 'NHD returned no name for this GNIS ID'; return }
    gnisPreview.value = { name: data.name, state_abbr: data.state_abbr ?? '', basin: data.basin ?? '', huc8: data.huc8 ?? '' }
  } catch {
    gnisPreviewError.value = 'Lookup failed'
  } finally {
    gnisPreviewLoading.value = false
  }
}

async function createRiver() {
  if (!gnisPreview.value) return
  createLoading.value = true
  const token = await getToken()
  try {
    const res = await fetch(`${apiBase}/api/v1/admin/rivers`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ gnis_id: newRiverGnisId.value.trim() }),
    })
    if (res.ok) {
      createRiverOpen.value = false
      loadRivers()
    } else {
      const err = await res.json().catch(() => ({}))
      gnisPreviewError.value = err.error ?? `Error ${res.status}`
    }
  } finally {
    createLoading.value = false
  }
}

// Edit river — basin + state_abbr + NLDI lookup
const editRiverOpen = ref(false)
const editRiverLoading = ref(false)
const editingRiver = ref<{ slug: string; name: string; basin: string; state_abbr: string; gnis_id: string; huc8: string } | null>(null)

const editGnisPreview = ref<{ name: string; state_abbr: string; basin: string; huc8: string } | null>(null)
const editGnisPreviewLoading = ref(false)
const editGnisPreviewError = ref('')

watch(editRiverOpen, v => {
  if (!v) {
    editGnisPreview.value = null
    editGnisPreviewError.value = ''
    editGnisPreviewLoading.value = false
  }
})

async function previewEditRiverGNIS() {
  const id = (editingRiver.value?.gnis_id || '').trim()
  if (!id) { editGnisPreviewError.value = 'No GNIS ID on this river'; return }
  editGnisPreviewLoading.value = true
  editGnisPreviewError.value = ''
  editGnisPreview.value = null
  try {
    const token = await getToken()
    const res = await fetch(`${apiBase}/api/v1/admin/rivers/gnis-lookup?gnis_id=${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (!res.ok) { editGnisPreviewError.value = data.error ?? `Error ${res.status}`; return }
    if (!data.name) { editGnisPreviewError.value = 'NHD returned no name for this GNIS ID'; return }
    editGnisPreview.value = { name: data.name, state_abbr: data.state_abbr ?? '', basin: data.basin ?? '', huc8: data.huc8 ?? '' }
  } catch {
    editGnisPreviewError.value = 'Lookup failed'
  } finally {
    editGnisPreviewLoading.value = false
  }
}

function applyEditGnisPreview() {
  if (!editGnisPreview.value || !editingRiver.value) return
  if (editGnisPreview.value.basin)      editingRiver.value.basin = editGnisPreview.value.basin
  if (editGnisPreview.value.state_abbr) editingRiver.value.state_abbr = editGnisPreview.value.state_abbr
}

function openEditRiver(river: RiverDetail) {
  editingRiver.value = {
    slug: river.slug,
    name: river.name,
    basin: river.basin ?? '',
    state_abbr: river.state_abbr ?? '',
    gnis_id: river.gnis_id ?? '',
    huc8: river.huc8 ?? '',
  }
  editRiverOpen.value = true
}

async function saveEditRiver() {
  if (!editingRiver.value) return
  editRiverLoading.value = true
  const token = await getToken()
  try {
    const res = await fetch(`${apiBase}/api/v1/admin/rivers/${editingRiver.value.slug}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        basin: editingRiver.value.basin || null,
        state_abbr: editingRiver.value.state_abbr || null,
      }),
    })
    if (res.ok) { editRiverOpen.value = false; loadRivers() }
  } finally {
    editRiverLoading.value = false
  }
}

// ── River corrections ─────────────────────────────────────────────────────────
interface RiverCorrection {
  id: string; river_slug: string; river_name: string; river_state: string | null; river_basin: string | null
  proposed_by: string; field: string; proposed_value: string; note: string | null; created_at: string
}

const corrections = ref<RiverCorrection[]>([])
const correctionsLoading = ref(false)
const pendingCorrectionsCount = ref(0)
const reviewingId = ref<string | null>(null)

async function loadCorrections() {
  correctionsLoading.value = true
  try {
    const token = await getToken()
    const res = await fetch(`${apiBase}/api/v1/admin/river-corrections?status=pending`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) { corrections.value = await res.json() }
  } finally {
    correctionsLoading.value = false
  }
}

async function reviewCorrection(id: string, action: 'accept' | 'reject') {
  reviewingId.value = id
  try {
    const token = await getToken()
    await fetch(`${apiBase}/api/v1/admin/river-corrections/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    corrections.value = corrections.value.filter(c => c.id !== id)
    pendingCorrectionsCount.value = Math.max(0, pendingCorrectionsCount.value - 1)
    if (action === 'accept') loadRivers()
  } finally {
    reviewingId.value = null
  }
}

function gaugeSourceUrl(source: string, externalId: string): string | null {
  const s = (source || '').toLowerCase()
  if (s === 'usgs') return `https://waterdata.usgs.gov/monitoring-location/${externalId}/`
  if (s === 'dwr')  return `https://dwr.state.co.us/Tools/Stations/${externalId}`
  return null
}

function relativeDate(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.floor(ms / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── User Roles ────────────────────────────────────────────────────────────────
interface UserRole { id: string; user_id: string; role: string; river_id: string | null; river_name: string | null }

const userRoles = ref<UserRole[]>([])
const rolesLoading = ref(false)

async function loadUserRoles() {
  rolesLoading.value = true
  const token = await getToken()
  if (!token) { rolesLoading.value = false; return }
  try {
    const res = await fetch(`${apiBase}/api/v1/admin/users/roles`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) userRoles.value = await res.json()
  } finally {
    rolesLoading.value = false
  }
}

async function revokeRole(id: string) {
  const token = await getToken()
  await fetch(`${apiBase}/api/v1/admin/users/roles/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  loadUserRoles()
}

const assignRoleOpen = ref(false)
const assignLoading = ref(false)
const newRole = ref({ user_id: '', role: 'data_admin', river_id: '' })

async function assignRole() {
  assignLoading.value = true
  const token = await getToken()
  try {
    const res = await fetch(`${apiBase}/api/v1/admin/users/roles`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: newRole.value.user_id,
        role: newRole.value.role,
        river_id: newRole.value.river_id || null,
      }),
    })
    if (res.ok) {
      assignRoleOpen.value = false
      newRole.value = { user_id: '', role: 'data_admin', river_id: '' }
      loadUserRoles()
    }
  } finally {
    assignLoading.value = false
  }
}

// ── Admin gauges ──────────────────────────────────────────────────────────────

interface AdminGauge {
  id: string
  external_id: string
  source: string
  name: string
  status: string
  auto_managed: boolean
  poll_health: string
  consecutive_poll_failures: number
  last_reading_at: string | null
  last_poll_success_at: string | null
  last_poll_failure_at: string | null
  seasonal_start_mmdd: string | null
  seasonal_end_mmdd: string | null
  state_abbr: string | null
  reach_count: number
}

interface GaugeSummary { healthy: number; degraded: number; stale: number; unreachable: number; total: number }

const adminGauges    = ref<AdminGauge[]>([])
const gaugeSummary   = ref<GaugeSummary | null>(null)
const gaugesLoading  = ref(false)
const gaugeTotal     = ref(0)
const gaugeLimit     = ref(50)
const gaugeOffset    = ref(0)
const gaugeSearch    = ref('')
const gaugeShowRetired  = ref(false)
const gaugeHealthFilter = ref('')
const gaugePollId    = ref<string | null>(null)

const gaugeHealthFilters = [
  { label: 'All',         value: '' },
  { label: 'Stale',       value: 'stale' },
  { label: 'Offline',     value: 'unreachable' },
  { label: 'Healthy',     value: 'healthy' },
]

let gaugeSearchTimer: ReturnType<typeof setTimeout> | null = null
function debounceGaugeLoad() {
  if (gaugeSearchTimer) clearTimeout(gaugeSearchTimer)
  gaugeSearchTimer = setTimeout(() => { gaugeOffset.value = 0; loadAdminGauges() }, 300)
}

async function loadAdminGauges() {
  gaugesLoading.value = true
  try {
    const token = await getToken()
    const params = new URLSearchParams({
      limit: String(gaugeLimit.value),
      offset: String(gaugeOffset.value),
    })
    if (gaugeSearch.value) params.set('q', gaugeSearch.value)
    if (gaugeHealthFilter.value) params.set('poll_health', gaugeHealthFilter.value)
    if (gaugeShowRetired.value) params.set('show_retired', 'true')
    const res = await fetch(`${apiBase}/api/v1/admin/gauges?${params}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (res.ok) {
      const data = await res.json()
      adminGauges.value  = data.gauges ?? []
      gaugeTotal.value   = data.total ?? 0
      gaugeSummary.value = data.summary ?? null
    }
  } finally {
    gaugesLoading.value = false
  }
}

async function adminPollGauge(id: string) {
  gaugePollId.value = id
  try {
    const token = await getToken()
    await fetch(`${apiBase}/api/v1/admin/gauges/${id}/poll`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    await loadAdminGauges()
  } finally {
    gaugePollId.value = null
  }
}

async function adminRetireGauge(id: string) {
  const token = await getToken()
  await fetch(`${apiBase}/api/v1/admin/gauges/${id}/retire`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  await loadAdminGauges()
}

async function adminReactivateGauge(id: string) {
  const token = await getToken()
  await fetch(`${apiBase}/api/v1/admin/gauges/${id}/reactivate`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  await loadAdminGauges()
}

function gaugeHealthClass(h: string): string {
  if (h === 'unreachable') return 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
  if (h === 'stale')       return 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
  if (h === 'degraded')    return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
  return 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
}

// Load gauges when tab activates
watch(activeTab, (tab) => {
  if (tab === 'gauges' && adminGauges.value.length === 0) loadAdminGauges()
})

</script>
