<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col">
    <AppHeader>
      <span class="text-neutral-300 dark:text-neutral-700 shrink-0">/</span>
      <NuxtLink to="/my/runs" class="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors">My Runs</NuxtLink>
      <span class="text-neutral-300 dark:text-neutral-700 shrink-0">/</span>
      <span class="text-sm font-medium text-neutral-700 dark:text-neutral-200 truncate">{{ reach?.name ?? 'Edit' }}</span>
    </AppHeader>

    <!-- Sticky action bar (below AppHeader) — Save, Cancel, X, Add-to-dashboard, etc. -->
    <div v-if="reach" class="sticky top-[51px] z-10 flex items-center justify-between gap-2 px-4 py-2 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-sm border-b border-neutral-200 dark:border-neutral-800">
      <div class="flex items-center gap-1.5 min-w-0">
        <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-x-mark" :to="'/my/runs'" title="Close"><span class="hidden sm:inline">Close</span></UButton>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-share" title="Share" @click="openShare()"><span class="hidden sm:inline">Share</span></UButton>
        <UButton size="xs" variant="ghost" color="error" icon="i-heroicons-trash" title="Delete" @click="confirmDelete"><span class="hidden sm:inline">Delete</span></UButton>
        <UButton size="xs" variant="outline" color="neutral" icon="i-heroicons-x-circle" :to="'/my/runs'" title="Cancel"><span class="hidden sm:inline">Cancel</span></UButton>
        <UButton size="xs" :disabled="!form.name.trim()" :loading="saving" icon="i-heroicons-check" title="Save" @click="save"><span class="hidden sm:inline">Save</span></UButton>
      </div>
    </div>

    <!-- Fork lineage banner -->
    <div v-if="reach?.forked_from_slug" class="px-4 pt-2">
      <div class="rounded-md bg-neutral-100 dark:bg-neutral-800/60 px-3 py-1.5 flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
        <svg class="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/>
          <path d="M12 7v3m0 0c0 2-2 3-4 3H7m5 0c0 2 2 3 4 3h1"/>
        </svg>
        Forked from
        <NuxtLink
          :to="`/runs/${reach.forked_from_slug}`"
          class="font-medium text-primary-500 hover:text-primary-400 transition-colors"
        >{{ reach.forked_from_name ?? reach.forked_from_slug }}</NuxtLink>
      </div>
    </div>

    <!-- CFS strip (top, full width, modal-style summary) -->
    <div v-if="reach" class="px-4 pt-3">
      <div class="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3 flex items-center gap-4 flex-wrap">
        <div class="min-w-0 flex-1">
          <h1 class="text-base font-bold text-neutral-900 dark:text-neutral-100 truncate">{{ reach.name }}</h1>
          <p v-if="reach.river_name" class="text-xs text-neutral-500 truncate">{{ reach.river_name }}</p>
        </div>
        <template v-if="reach.gauge_name || reach.current_cfs != null">
          <div class="flex items-end gap-3 shrink-0">
            <div class="text-right">
              <p v-if="reach.current_cfs != null" class="text-2xl font-bold font-mono leading-none" :style="{ color: cfsColor }">
                {{ reach.current_cfs.toLocaleString() }}<span class="text-xs font-normal text-neutral-400 ml-1">cfs</span>
              </p>
              <p v-else class="text-sm text-neutral-400">No reading</p>
              <p v-if="reach.gauge_name" class="text-xs text-neutral-400 truncate mt-0.5">{{ reach.gauge_name }}</p>
            </div>
            <span
              v-if="reach.flow_band"
              class="text-xs font-medium px-2 py-0.5 rounded-full shrink-0 mb-0.5"
              :class="bandBadgeClass(reach.flow_band)"
            >{{ flowBandLabel(reach.flow_band) }}</span>
          </div>
        </template>
        <div
          v-if="reach.gauge_poll_health === 'stale' || reach.gauge_poll_health === 'unreachable'"
          class="basis-full flex items-start gap-2 px-2.5 py-1.5 rounded-md text-xs border"
          :class="reach.gauge_poll_health === 'unreachable'
            ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900'
            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900'"
        >
          <svg class="w-3.5 h-3.5 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/></svg>
          <div>
            <span class="font-medium">{{ reach.gauge_poll_health === 'unreachable' ? 'Gauge unreachable' : 'Gauge data is stale' }}</span>
            <span v-if="reach.gauge_last_poll_success_at" class="block opacity-80">
              Last update {{ new Date(reach.gauge_last_poll_success_at).toLocaleDateString() }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Dashboard membership pills -->
    <div v-if="reach && dashboardsAdd.dashboards.value.length > 0" class="px-4 pt-3">
      <div class="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3">
        <p class="text-xs text-neutral-400 uppercase tracking-wide font-medium mb-2">Dashboards</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="d in dashboardsAdd.dashboards.value"
            :key="d.id"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            :class="reachDashboardIds.has(d.id)
              ? 'bg-primary-500 text-white hover:bg-primary-600'
              : 'border border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400'"
            @click="toggleDashboard(d.id)"
          >
            <svg v-if="reachDashboardIds.has(d.id)" class="w-3 h-3 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
            <svg v-else class="w-3 h-3 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
            {{ d.name }}
          </button>
        </div>
      </div>
    </div>

    <!-- River confirmation banner -->
    <div v-if="riverConfirmBannerVisible" class="px-4 pt-2">
      <div class="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 flex flex-wrap items-center gap-3">
        <svg class="w-4 h-4 text-emerald-500 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
        <p class="text-sm text-emerald-800 dark:text-emerald-200 flex-1 min-w-0">
          Looks like <strong>{{ reach.river_name }}</strong><template v-if="reach.river_state_abbr || reach.river_basin"> ({{ [reach.river_state_abbr, reach.river_basin].filter(Boolean).join(' · ') }})</template> — is this correct?
        </p>
        <div class="flex items-center gap-2 shrink-0">
          <UButton size="xs" color="success" variant="solid" @click="confirmRiver">Yes</UButton>
          <UButton size="xs" color="neutral" variant="outline" @click="riverCorrectionOpen = true">No, fix...</UButton>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex-1 flex items-center justify-center text-sm text-neutral-500">{{ error }}</div>

    <!-- Content -->
    <div v-else-if="reach" class="flex-1 flex flex-col lg:flex-row lg:overflow-hidden">

      <!-- Map — mobile: half screen with side padding; desktop: sticky full-height column -->
      <div class="px-4 pt-3 pb-1 lg:p-4 lg:flex-1 lg:sticky lg:top-24 lg:h-[calc(100vh-96px)]">
        <div class="relative h-[50vh] lg:h-full">
          <NHDExplorerMap
            :upstream-flowlines="repinTributaries"
            :downstream-flowlines="repinDownstream"
            :upstream-gauges="repinGauges"
            :snap-lat="null"
            :snap-lng="null"
            :pick-mode="repinPickMode"
            :put-in-pin="repinPutInPin"
            :take-out-pin="repinTakeOutPin"
            :comid-select-mode="!!repinAnchorSnap && !repinPickMode && !repinGaugeSelectMode"
            :comid-select-slot="repinComIDEditMode"
            :selected-up-comid="repinUpComID"
            :selected-down-comid="repinDownComID"
            :preview-centerline="repinPreviewCenterline ?? reach.centerline ?? null"
            :gauge-select-mode="repinGaugeSelectMode"
            :disable-auto-fit="anyPickMode"
            map-height="100%"
            class="w-full h-full"
            @pick="onAnchorPick"
            @comid-select="onComIDSelect"
            @gauge-select="onGaugeSelect"
          />
        </div>
      </div>

      <!-- Form panel — mobile: natural scroll; desktop: fixed-height scrollable column -->
      <div class="lg:w-95 lg:overflow-y-auto lg:h-[calc(100vh-96px)] p-4 pb-20 space-y-4">

        <!-- Flow lines & gauge -->
        <div class="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-3">
          <p class="text-xs text-neutral-400 uppercase tracking-wide font-medium">Flow Lines &amp; Gauge</p>

          <!-- Re-anchor row -->
          <div class="flex flex-wrap items-center gap-2">
            <button
              class="text-xs px-2.5 py-1 rounded-md font-medium border transition-colors"
              :class="repinPickMode
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300'
                : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600'"
              @click="togglePickMode"
            >{{ repinPickMode ? 'Cancel' : 'Re-anchor' }}</button>
            <span v-if="repinAnchorSnapping" class="text-xs text-primary-600 dark:text-primary-400 animate-pulse">Snapping to NHD…</span>
            <span v-if="repinAnchorError" class="text-xs text-red-500">{{ repinAnchorError }}</span>
          </div>

          <!-- Anchor snap card -->
          <div v-if="repinAnchorSnap" class="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 text-xs">
            <span class="w-2.5 h-2.5 rounded-full bg-primary-600 shrink-0" />
            <span class="font-medium text-primary-800 dark:text-primary-200">Anchor ComID {{ repinAnchorSnap.comid }}</span>
            <span v-if="repinAnchorSnap.name" class="text-primary-600 dark:text-primary-300 truncate">{{ repinAnchorSnap.name }}</span>
          </div>

          <!-- ComID + gauge toggles (visible once anchor snapped or downstream loaded) -->
          <div v-if="repinAnchorSnap || repinDownstream" class="flex items-center gap-2 text-xs flex-wrap">
            <span class="text-neutral-500 shrink-0">Click map for:</span>
            <button
              class="flex items-center gap-1.5 px-2 py-1 rounded-md border transition-colors"
              :class="repinComIDEditMode === 'up' && !repinGaugeSelectMode
                ? 'border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 font-medium'
                : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'"
              @click="repinGaugeSelectMode = false; repinComIDEditMode = 'up'"
            >
              <span class="w-2 h-2 rounded-full bg-green-500 shrink-0" />
              Put-In<template v-if="repinUpComID"> · <span class="font-mono">{{ repinUpComID }}</span></template>
            </button>
            <button
              class="flex items-center gap-1.5 px-2 py-1 rounded-md border transition-colors"
              :class="repinComIDEditMode === 'down' && !repinGaugeSelectMode
                ? 'border-red-500 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 font-medium'
                : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'"
              @click="repinGaugeSelectMode = false; repinComIDEditMode = 'down'"
            >
              <span class="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              Take-Out<template v-if="repinDownComID"> · <span class="font-mono">{{ repinDownComID }}</span></template>
            </button>
            <button
              class="flex items-center gap-1.5 px-2 py-1 rounded-md border transition-colors"
              :class="reach.custom_gauge_id
                ? 'border-neutral-200 dark:border-neutral-700 text-neutral-400 cursor-default'
                : repinGaugeSelectMode
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-medium'
                  : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'"
              :disabled="!!reach.custom_gauge_id"
              @click="!reach.custom_gauge_id && (repinGaugeSelectMode = !repinGaugeSelectMode, repinComIDEditMode = null, !repinGaugeSelectMode && (repinPendingGauge = null))"
            >
              <span class="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <template v-if="reach.custom_gauge_id">Custom Gauge</template>
              <template v-else-if="repinGaugeSelectMode">Cancel</template>
              <template v-else-if="reach.gauge_id">Gauge · <span class="font-mono">{{ reach.gauge_external_id }}</span></template>
              <template v-else>Select gauge</template>
            </button>
            <button
              v-if="reach.gauge_id && !repinGaugeSelectMode"
              class="px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:text-red-500 hover:border-red-400 transition-colors text-xs"
              :disabled="repinGaugeSaving"
              title="Clear gauge"
              @click="clearGauge"
            >✕</button>
          </div>

          <!-- Pending gauge card -->
          <div v-if="repinPendingGauge" class="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs">
            <span class="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span class="flex-1 truncate font-medium text-amber-800 dark:text-amber-200">{{ repinPendingGauge.name || repinPendingGauge.externalId }}</span>
            <span class="font-mono text-amber-600 dark:text-amber-400 shrink-0">{{ repinPendingGauge.externalId }}</span>
            <UButton size="xs" :loading="repinGaugeSaving" @click="saveGauge">Save gauge</UButton>
            <button class="text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 shrink-0 px-1" @click="repinPendingGauge = null">✕</button>
          </div>

          <p v-if="repinGaugeError" class="text-xs text-red-500">{{ repinGaugeError }}</p>
          <p v-if="repinGaugeSelectMode" class="text-xs text-amber-600 dark:text-amber-400">Click an amber dot on the map to assign a primary gauge.</p>
          <p v-if="repinFlowlinesLoading" class="text-xs text-primary-500 animate-pulse">Loading downstream mainstem…</p>

          <!-- Linked gauge -->
          <div class="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-1.5">
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs text-neutral-500">Linked gauge</p>
              <div class="relative">
                <UButton
                  v-if="!reach.custom_gauge_id && !reach.gauge_id"
                  size="2xs" variant="outline" color="neutral"
                  :loading="customGaugeSaving"
                  @click="customGaugePickerOpen = !customGaugePickerOpen"
                >
                  Link custom gauge
                </UButton>
                <div
                  v-if="customGaugePickerOpen && customGauges.length"
                  class="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg overflow-hidden"
                >
                  <button
                    v-for="cg in customGauges"
                    :key="cg.id"
                    type="button"
                    class="w-full text-left px-3 py-2 text-sm hover:bg-primary-50 dark:hover:bg-primary-950/30 transition-colors"
                    @click="linkCustomGauge(cg)"
                  >{{ cg.name }}</button>
                </div>
                <p v-if="customGaugePickerOpen && !customGauges.length" class="text-xs text-neutral-400">
                  No custom gauges yet. <NuxtLink to="/my/gauges/new" class="text-primary-500 underline">Create one</NuxtLink>
                </p>
              </div>
            </div>
            <template v-if="reach.gauge_name">
              <p class="text-sm text-neutral-700 dark:text-neutral-300">{{ reach.gauge_name }}</p>
              <p v-if="reach.gauge_external_id" class="text-xs text-neutral-400 font-mono">
                {{ reach.gauge_external_id }}<span v-if="reach.gauge_source" class="uppercase ml-1.5">{{ reach.gauge_source }}</span>
              </p>
            </template>
            <template v-else-if="reach.custom_gauge_name">
              <div class="flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-neutral-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="10" y2="14"/><line x1="14" y1="14" x2="16" y2="14"/>
                </svg>
                <p class="text-sm text-neutral-700 dark:text-neutral-300">{{ reach.custom_gauge_name }}</p>
              </div>
              <NuxtLink
                :to="customGauges.find(g => g.id === reach.custom_gauge_id)?.slug
                  ? `/my/gauges/${customGauges.find(g => g.id === reach.custom_gauge_id)!.slug}`
                  : '/my/gauges'"
                class="text-xs text-primary-500 hover:underline"
              >Edit formula →</NuxtLink>
            </template>
            <p v-else class="text-xs text-neutral-400 italic">None</p>
          </div>

          <!-- Status / revert -->
          <div v-if="repinPreviewLoading || repinError || repinSuccess || repinFlowlinesDirty" class="flex items-center gap-2 pt-1 flex-wrap">
            <span v-if="repinPreviewLoading" class="text-xs text-primary-500 animate-pulse">Computing centerline…</span>
            <span v-if="repinError" class="text-xs text-red-500">{{ repinError }}</span>
            <span v-if="repinSuccess" class="text-xs text-green-600 dark:text-green-400">{{ repinSuccess }}</span>
            <div class="flex-1" />
            <UButton
              v-if="repinFlowlinesDirty"
              size="xs"
              variant="outline"
              color="neutral"
              @click="revertComIDs"
            >Revert</UButton>
          </div>
        </div>

        <!-- Edit form + gauge display -->
        <div class="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-3">
          <p class="text-xs text-neutral-400 uppercase tracking-wide font-medium">Run details</p>

          <div>
            <label class="block text-xs text-neutral-500 mb-1">Reach name <span class="text-red-400">*</span></label>
            <input v-model="form.name" class="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1.5 text-sm" />
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="text-xs text-neutral-500">River name</label>
              <button
                v-if="repinUpComID"
                type="button"
                :disabled="riverNameLooking"
                class="text-xs text-primary-500 hover:text-primary-700 dark:hover:text-primary-300 disabled:opacity-40"
                @click="lookupRiverName"
              >{{ riverNameLooking ? 'Looking up…' : 'Lookup from NLDI' }}</button>
            </div>
            <input v-model="form.riverName" class="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1.5 text-sm" placeholder="e.g. South Platte River" />
            <p
              v-if="reach?.river_basin || reach?.river_state_abbr"
              class="mt-1 text-xs text-neutral-400"
            >
              {{ [reach.river_state_abbr, reach.river_basin].filter(Boolean).join(' · ') }}
            </p>
          </div>

          <div>
            <label class="block text-xs text-neutral-500 mb-1">Notes</label>
            <textarea v-model="form.note" rows="3" class="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1.5 text-sm resize-y" placeholder="Beta, access, permanent hazards…" />
          </div>

          <!-- Privacy toggle -->
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-medium text-neutral-700 dark:text-neutral-300">Private</p>
              <p class="text-xs text-neutral-400">Only visible to you</p>
            </div>
            <button
              type="button"
              role="switch"
              :aria-checked="form.isPrivate"
              class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors"
              :class="form.isPrivate ? 'bg-primary-500' : 'bg-neutral-300 dark:bg-neutral-600'"
              @click="form.isPrivate = !form.isPrivate"
            >
              <span
                class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                :class="form.isPrivate ? 'translate-x-4.5' : 'translate-x-0.5'"
              />
            </button>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-neutral-500 mb-1">Class min</label>
              <input v-model.number="form.classMin" type="number" min="1" max="6" step="0.5" class="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1.5 text-sm" placeholder="3" />
            </div>
            <div>
              <label class="block text-xs text-neutral-500 mb-1">Class max</label>
              <input v-model.number="form.classMax" type="number" min="1" max="6" step="0.5" class="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1.5 text-sm" placeholder="5" />
            </div>
          </div>

        </div>

        <!-- Flow bands -->
        <div class="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-2">
          <p class="text-xs text-neutral-400 uppercase tracking-wide font-medium">Flow bands <span class="font-normal normal-case text-neutral-400">(CFS)</span></p>
          <div class="space-y-2">
            <div v-for="band in flowBandDefs" :key="band.key" class="flex items-center gap-2">
              <span class="w-16 text-xs font-medium shrink-0" :class="band.labelClass">{{ band.label }}</span>
              <input
                v-model.number="form.ranges[band.key].min"
                type="number" min="0"
                class="w-20 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-1.5 py-1 text-xs"
                :placeholder="band.showMin ? 'min' : '—'"
                :disabled="!band.showMin"
              />
              <span class="text-neutral-400 text-xs">–</span>
              <input
                v-model.number="form.ranges[band.key].max"
                type="number" min="0"
                class="w-20 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-1.5 py-1 text-xs"
                :placeholder="band.showMax ? 'max' : '—'"
                :disabled="!band.showMax"
              />
              <span class="text-xs text-neutral-400">cfs</span>
            </div>
          </div>
        </div>

        <!-- Save metadata -->
        <div v-if="saveError" class="text-xs text-red-500 px-1">{{ saveError }}</div>

      </div>
    </div>
  </div>

  <!-- Share modal -->
  <UModal v-model:open="riverCorrectionOpen" title="Suggest a correction">
    <template #body>
      <p class="text-sm text-neutral-600 dark:text-neutral-400 mb-4">What's wrong with the river info for <strong>{{ reach?.river_name }}</strong>?</p>
      <div class="space-y-3">
        <div>
          <label class="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Field to correct</label>
          <div class="flex gap-4">
            <label class="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="radio" v-model="correctionField" value="basin" class="accent-primary-500" /> Basin
            </label>
            <label class="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="radio" v-model="correctionField" value="state_abbr" class="accent-primary-500" /> State
            </label>
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Correct value</label>
          <input
            v-model="correctionValue"
            type="text"
            class="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            :placeholder="correctionField === 'basin' ? 'e.g. Arkansas' : 'e.g. CO'"
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Note <span class="text-neutral-400">(optional)</span></label>
          <textarea
            v-model="correctionNote"
            rows="2"
            class="w-full rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Why is this wrong?"
          />
        </div>
        <p v-if="correctionError" class="text-xs text-red-500">{{ correctionError }}</p>
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <UButton size="xs" variant="outline" color="neutral" @click="riverCorrectionOpen = false">Cancel</UButton>
        <UButton size="xs" :disabled="!correctionValue.trim() || correctionSubmitting" :loading="correctionSubmitting" @click="submitRiverCorrection">Submit</UButton>
      </div>
    </template>
  </UModal>

  <ShareLinkModal
    :open="shareOpen"
    title="Share run"
    :link="reachShareLink"
    :json="sharePayload"
    :loading="shareLoading"
    @close="shareOpen = false; customGaugePayload = null"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { flowBandLabel } from '~/utils/flowBand'

definePageMeta({ ssr: false })

const { bandBadgeClass, bandSolid } = useFlowBandPalette()

const route  = useRoute()
const router = useRouter()
const { getToken } = useAuth()
const { apiBase }  = useRuntimeConfig().public

const slug = computed(() => route.params.slug as string)

// ── Dashboard membership pills ─────────────────────────────────────────────────
const dashboardsAdd = useDashboards()
const reachDashboardIds   = ref<Set<string>>(new Set())
const { addUserReachToWatchlist, addCustomGaugeToWatchlist, addReachToWatchlist } = useWatchlistSync()

async function loadReachDashboards() {
  const token = await getToken()
  if (!token) return
  const res = await fetch(`${apiBase}/api/v1/watchlist`, {
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => null)
  if (!res?.ok) return
  const data = await res.json()
  const ids = new Set<string>()
  for (const item of data.items ?? []) {
    if (item.reach_slug === slug.value && item.dashboard_id) ids.add(item.dashboard_id)
  }
  reachDashboardIds.value = ids
}

const toast = useToast()

async function toggleDashboard(dashboardId: string) {
  if (!reach.value) return
  if (reachDashboardIds.value.has(dashboardId)) {
    const token = await getToken()
    if (!token) return
    const db = encodeURIComponent(dashboardId)
    await fetch(`${apiBase}/api/v1/watchlist/${encodeURIComponent(slug.value)}?kind=reach&dashboard_id=${db}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {})
    toast.add({ title: 'Removed from dashboard', color: 'neutral' })
  } else {
    await addReachToWatchlist(slug.value, dashboardId)
    // Clear the per-dashboard localStorage hidden flag so a previously-trashed
    // reach becomes visible again without needing a manual dashboard refresh.
    if (import.meta.client && reach.value.id) {
      const key = `h2oflow_hidden_reaches_${dashboardId}`
      try {
        const set = new Set<string>(JSON.parse(localStorage.getItem(key) ?? '[]'))
        if (set.delete(reach.value.id)) localStorage.setItem(key, JSON.stringify([...set]))
      } catch {}
    }
    toast.add({ title: 'Added to dashboard', color: 'success' })
  }
  loadReachDashboards()
}

onMounted(() => { if (!dashboardsAdd.loaded.value) dashboardsAdd.load() })

const loading   = ref(false)
const error     = ref('')
const saving    = ref(false)
const saveError = ref('')

// ── Types ─────────────────────────────────────────────────────────────────────

interface NHDFC { type: string; features: any[] }
interface AnchorSnap { comid: string; name: string }
interface PendingGauge { externalId: string; source: string; name: string; lat: number; lng: number }
type ComIDEditMode = 'up' | 'down' | null

interface FlowRange {
  label: string; min_value: number | null; max_value: number | null
}

interface UserReachDetail {
  id:                string
  slug:              string
  name:              string
  river_name:        string | null
  river_slug:        string | null
  river_state_abbr:  string | null
  river_basin:       string | null
  class_min:         number | null
  class_max:         number | null
  put_in_lng:        number
  put_in_lat:        number
  take_out_lng:      number
  take_out_lat:      number
  up_comid:          string | null
  down_comid:        string | null
  gauge_id:                  string | null
  gauge_name:                string | null
  gauge_source:              string | null
  gauge_external_id:         string | null
  gauge_poll_health:         string | null
  gauge_last_poll_success_at: string | null
  custom_gauge_id:           string | null
  custom_gauge_name: string | null
  current_cfs:       number | null
  flow_band:         string | null
  note:              string | null
  is_private:        boolean
  forked_from_slug:  string | null
  forked_from_name:  string | null
  flow_ranges:       FlowRange[]
  centerline:        object | null
}

interface CustomGaugeSummary { id: string; slug: string; name: string }

const reach = ref<UserReachDetail | null>(null)

// ── Form state ────────────────────────────────────────────────────────────────

const form = ref({
  name:      '',
  riverName: '',
  note:      '',
  classMin:  null as number | null,
  classMax:  null as number | null,
  isPrivate: false,
  ranges: {
    low:     { min: null as number | null, max: null as number | null },
    running: { min: null as number | null, max: null as number | null },
    high:    { min: null as number | null, max: null as number | null },
  },
})

const flowBandDefs = [
  { key: 'low',     label: 'Too Low',  labelClass: 'text-neutral-400',    showMin: false, showMax: true  },
  { key: 'running', label: 'Runnable', labelClass: 'text-emerald-500', showMin: true,  showMax: true  },
  { key: 'high',    label: 'High',     labelClass: 'text-sky-400',     showMin: true,  showMax: false },
] as const

// ── Repin state (mirrors admin RunEditor) ───────────────────────────────────

const repinPickMode        = ref(false)
const repinAnchorSnap      = ref<AnchorSnap | null>(null)
const repinAnchorSnapping  = ref(false)
const repinAnchorError     = ref('')
const repinTributaries     = ref<NHDFC | null>(null)
const repinDownstream      = ref<NHDFC | null>(null)
const repinFlowlinesLoading = ref(false)
const repinComIDEditMode   = ref<ComIDEditMode>(null)
const repinUpComID         = ref<string | null>(null)
const repinDownComID       = ref<string | null>(null)
const repinOrigUpComID     = ref<string | null>(null)
const repinOrigDownComID   = ref<string | null>(null)
const repinStartLat        = ref<number | null>(null)
const repinStartLng        = ref<number | null>(null)
const repinEndLat          = ref<number | null>(null)
const repinEndLng          = ref<number | null>(null)
const repinFlowlinesDirty  = ref(false)
const repinPreviewCenterline = ref<object | null>(null)
const repinPreviewLoading  = ref(false)
const repinError           = ref('')
const repinSuccess         = ref('')

const repinGauges          = ref<NHDFC | null>(null)
const repinGaugeSelectMode = ref(false)
const repinPendingGauge    = ref<PendingGauge | null>(null)
const repinGaugeSaving     = ref(false)
const repinGaugeError      = ref('')

const riverNameLooking = ref(false)
const nldiGnisId       = ref<string | null>(null)

const customGauges           = ref<CustomGaugeSummary[]>([])
const customGaugePickerOpen  = ref(false)
const customGaugeSaving      = ref(false)

const shareOpen           = ref(false)
const shareLoading        = ref(false)
const customGaugePayload  = ref<object | null>(null)

// ── River confirmation banner ──────────────────────────────────────────────────

const riverConfirmed       = ref(false)
const riverCorrectionOpen  = ref(false)
const correctionField      = ref<'basin' | 'state_abbr'>('basin')
const correctionValue      = ref('')
const correctionNote       = ref('')
const correctionError      = ref('')
const correctionSubmitting = ref(false)

const riverConfirmBannerVisible = computed(() =>
  !!(reach.value?.river_name && reach.value?.river_slug && !riverConfirmed.value))

function confirmRiver() {
  if (!reach.value) return
  localStorage.setItem(`river-confirmed-${reach.value.id}`, '1')
  riverConfirmed.value = true
}

async function submitRiverCorrection() {
  if (!reach.value?.river_slug || !correctionValue.value.trim()) return
  correctionError.value      = ''
  correctionSubmitting.value = true
  try {
    const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) }
    const res = await fetch(`${apiBase}/api/v1/me/river-corrections`, {
      method:  'POST',
      headers,
      body:    JSON.stringify({
        river_slug:     reach.value.river_slug,
        field:          correctionField.value,
        proposed_value: correctionValue.value.trim(),
        note:           correctionNote.value.trim() || undefined,
      }),
    })
    if (!res.ok) { correctionError.value = `HTTP ${res.status}`; return }
    riverCorrectionOpen.value = false
    correctionValue.value     = ''
    correctionNote.value      = ''
    confirmRiver()
    toast.add({ title: 'Thanks — admin will review.', color: 'success' })
  } catch (e: any) {
    correctionError.value = e?.message ?? 'Submit failed'
  } finally {
    correctionSubmitting.value = false
  }
}

// ── Computed ──────────────────────────────────────────────────────────────────

const repinPutInPin = computed(() => {
  if (repinStartLat.value != null && repinStartLng.value != null)
    return { lat: repinStartLat.value, lng: repinStartLng.value, label: 'Put-in' }
  if (!reach.value) return null
  return { lat: reach.value.put_in_lat, lng: reach.value.put_in_lng, label: 'Put-in' }
})

const repinTakeOutPin = computed(() => {
  if (repinEndLat.value != null && repinEndLng.value != null)
    return { lat: repinEndLat.value, lng: repinEndLng.value, label: 'Take-out' }
  if (!reach.value) return null
  return { lat: reach.value.take_out_lat, lng: reach.value.take_out_lng, label: 'Take-out' }
})

const anyPickMode = computed(() =>
  repinPickMode.value || repinGaugeSelectMode.value || repinComIDEditMode.value !== null,
)

const cfsColor = computed(() => bandSolid(reach.value?.flow_band ?? null))

const sharePayload = computed(() => {
  const r = reach.value
  if (!r) return ''
  const fr = form.value.ranges
  const payload: Record<string, unknown> = {
    name:       r.name,
    river_name: r.river_name ?? '',
    put_in:  { lat: r.put_in_lat,    lng: r.put_in_lng    },
    take_out: { lat: r.take_out_lat, lng: r.take_out_lng  },
    up_comid:   r.up_comid   ?? '',
    down_comid: r.down_comid ?? '',
    note:       r.note ?? '',
    flow_ranges: {
      low:     { min_value: null,          max_value: fr.low.max     },
      running: { min_value: fr.running.min, max_value: fr.running.max },
      high:    { min_value: fr.high.min,   max_value: null           },
    },
  }
  if (customGaugePayload.value) {
    payload.custom_gauge = customGaugePayload.value
  } else if (r.gauge_external_id && r.gauge_source) {
    payload.gauge_external_id = r.gauge_external_id
    payload.gauge_source = r.gauge_source
  }
  return JSON.stringify(payload, null, 2)
})

const reachShareLink = computed(() => {
  if (!sharePayload.value || !import.meta.client) return ''
  try {
    // btoa requires Latin1 — encode through URI escaping to handle any Unicode in notes/names
    const latin1 = unescape(encodeURIComponent(sharePayload.value))
    const token = btoa(latin1).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    return `${window.location.origin}/import/reach?token=${token}`
  } catch {
    return ''
  }
})

async function openShare() {
  customGaugePayload.value = null
  shareOpen.value          = true
  const r = reach.value
  if (!r?.custom_gauge_id) return
  const cg = customGauges.value.find(g => g.id === r.custom_gauge_id)
  if (!cg?.slug) return
  shareLoading.value = true
  try {
    const headers = await authHeaders()
    const res = await fetch(`${apiBase}/api/v1/me/custom-gauges/${cg.slug}/share`, { headers })
    if (!res.ok) return
    const { token } = await res.json()
    // server uses standard base64url (with padding); decode to get gauge definition
    const base64 = token.replace(/-/g, '+').replace(/_/g, '/')
    customGaugePayload.value = JSON.parse(atob(base64))
  } catch { /* non-fatal — share still works, gauge just won't auto-link */ }
  finally { shareLoading.value = false }
}

// ── Auth helper ───────────────────────────────────────────────────────────────

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ── NLDI fetches ──────────────────────────────────────────────────────────────

async function fetchTributaries(lat: number, lng: number): Promise<AnchorSnap | null> {
  const headers = await authHeaders()
  const res = await fetch(
    `${apiBase}/api/v1/nldi/upstream-tributaries?lat=${lat}&lng=${lng}&distance=50`,
    { headers },
  )
  if (!res.ok) {
    repinAnchorError.value = `Snap failed: HTTP ${res.status}`
    return null
  }
  const data = await res.json()
  repinTributaries.value = data.tributaries ?? null
  return data.snap ? { comid: data.snap.comid, name: data.snap.name ?? '' } : null
}

async function fetchDownstream(comid: string): Promise<void> {
  repinFlowlinesLoading.value = true
  try {
    const headers = await authHeaders()
    const res = await fetch(`${apiBase}/api/v1/nldi/downstream?comid=${comid}&distance=800`, { headers })
    if (res.ok) repinDownstream.value = (await res.json()).downstream_flowlines ?? null
  } catch { /* non-fatal */ }
  finally { repinFlowlinesLoading.value = false }
}

async function fetchNearbyGauges(lat: number, lng: number, comid?: string | null): Promise<void> {
  try {
    const headers = await authHeaders()
    const comidParam = comid ? `&comid=${comid}` : ''
    const res = await fetch(
      `${apiBase}/api/v1/nldi/nearby-gauges?lat=${lat}&lng=${lng}&distance=100${comidParam}`,
      { headers },
    )
    if (res.ok) repinGauges.value = await res.json()
  } catch { /* non-fatal */ }
}

async function lookupRiverName(): Promise<void> {
  const comid = repinUpComID.value
  if (!comid) return
  const lat = repinStartLat.value ?? reach.value?.put_in_lat
  const lng = repinStartLng.value ?? reach.value?.put_in_lng
  riverNameLooking.value = true
  try {
    const params = new URLSearchParams({ comid })
    if (lat != null && lng != null) { params.set('lat', String(lat)); params.set('lng', String(lng)) }
    const headers = await authHeaders()
    const res = await fetch(`${apiBase}/api/v1/nldi/river-name?${params}`, { headers })
    if (res.ok) {
      const data = await res.json()
      if (data.river_name) form.value.riverName = data.river_name
      if (data.gnis_id)    nldiGnisId.value = data.gnis_id
    }
  } catch { /* non-fatal */ }
  finally { riverNameLooking.value = false }
}

// ── Geometry pick handlers ────────────────────────────────────────────────────

function resetGeometryState() {
  repinPickMode.value       = false
  repinAnchorSnap.value     = null
  repinAnchorSnapping.value = false
  repinAnchorError.value    = ''
  repinTributaries.value    = null
  repinDownstream.value     = null
  repinComIDEditMode.value  = null
  repinStartLat.value       = null
  repinStartLng.value       = null
  repinEndLat.value         = null
  repinEndLng.value         = null
  repinPreviewCenterline.value = null
  repinFlowlinesDirty.value = false
  repinError.value          = ''
  repinSuccess.value        = ''
}

function revertComIDs() {
  repinUpComID.value       = repinOrigUpComID.value
  repinDownComID.value     = repinOrigDownComID.value
  repinComIDEditMode.value = null
  repinStartLat.value      = null
  repinStartLng.value      = null
  repinEndLat.value        = null
  repinEndLng.value        = null
  repinPreviewCenterline.value = null
  repinFlowlinesDirty.value = false
  repinError.value         = ''
  repinSuccess.value       = ''
}

function togglePickMode() {
  if (repinPickMode.value) { repinPickMode.value = false; repinAnchorError.value = ''; return }
  repinGaugeSelectMode.value = false
  repinPickMode.value        = true
  repinAnchorError.value     = ''
}

async function onAnchorPick(lat: number, lng: number) {
  repinPickMode.value       = false
  repinAnchorSnapping.value = true
  repinAnchorSnap.value     = null
  repinTributaries.value    = null
  repinDownstream.value     = null
  repinAnchorError.value    = ''
  repinPreviewCenterline.value = null
  try {
    const snap = await fetchTributaries(lat, lng)
    if (!snap) return
    repinAnchorSnap.value    = snap
    repinComIDEditMode.value = 'up'
    await fetchDownstream(snap.comid)
    fetchNearbyGauges(lat, lng, snap.comid)
  } finally {
    repinAnchorSnapping.value = false
  }
}

function onComIDSelect(comid: string, lat: number, lng: number) {
  if (!repinComIDEditMode.value) return
  if (repinComIDEditMode.value === 'up') {
    repinUpComID.value      = comid
    repinStartLat.value     = lat
    repinStartLng.value     = lng
    repinComIDEditMode.value = 'down'
  } else {
    repinDownComID.value = comid
    repinEndLat.value    = lat
    repinEndLng.value    = lng
  }
  repinFlowlinesDirty.value    = true
  repinPreviewCenterline.value = null
}

async function previewCenterline() {
  if (!repinUpComID.value || !repinDownComID.value) return
  repinPreviewLoading.value    = true
  repinPreviewCenterline.value = null
  try {
    const headers = await authHeaders()
    const startLat = repinStartLat.value ?? reach.value?.put_in_lat
    const startLng = repinStartLng.value ?? reach.value?.put_in_lng
    const endLat   = repinEndLat.value   ?? reach.value?.take_out_lat
    const endLng   = repinEndLng.value   ?? reach.value?.take_out_lng
    let url = `${apiBase}/api/v1/nldi/preview-centerline?up_comid=${repinUpComID.value}&down_comid=${repinDownComID.value}`
    if (startLat != null && startLng != null && endLat != null && endLng != null)
      url += `&start_lat=${startLat}&start_lng=${startLng}&end_lat=${endLat}&end_lng=${endLng}`
    const res = await fetch(url, { headers })
    if (res.ok) repinPreviewCenterline.value = (await res.json()).geojson ?? null
  } catch { /* non-fatal */ }
  finally { repinPreviewLoading.value = false }
}


// ── Gauge handlers ────────────────────────────────────────────────────────────

function onGaugeSelect(externalId: string, source: string, name: string, lat: number, lng: number) {
  repinGaugeSelectMode.value = false
  repinGaugeError.value      = ''
  repinPendingGauge.value    = { externalId, source, name, lat, lng }
}

async function saveGauge() {
  if (!repinPendingGauge.value) return
  repinGaugeSaving.value = true
  repinGaugeError.value  = ''
  const { externalId, source, name, lat, lng } = repinPendingGauge.value
  try {
    const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) }
    const res = await fetch(`${apiBase}/api/v1/me/runs/${slug.value}/gauge`, {
      method: 'PUT', headers,
      body:   JSON.stringify({ external_id: externalId, source, name, lat, lng }),
    })
    if (!res.ok) { repinGaugeError.value = `HTTP ${res.status}`; return }
    repinPendingGauge.value = null
    await load()
  } catch (e: any) {
    repinGaugeError.value = e?.message ?? 'Failed to set gauge'
  } finally {
    repinGaugeSaving.value = false
  }
}

async function clearGauge() {
  if (!confirm('Remove the linked gauge?')) return
  repinGaugeSaving.value = true
  try {
    const headers = await authHeaders()
    await fetch(`${apiBase}/api/v1/me/runs/${slug.value}/gauge`, { method: 'DELETE', headers })
    await load()
  } catch { /* non-fatal */ }
  finally { repinGaugeSaving.value = false }
}

async function loadCustomGauges() {
  const headers = await authHeaders()
  const res = await fetch(`${apiBase}/api/v1/me/custom-gauges`, { headers }).catch(() => null)
  if (!res?.ok) return
  const data = await res.json()
  customGauges.value = data.items ?? []
}

async function linkCustomGauge(cg: CustomGaugeSummary) {
  customGaugeSaving.value = true
  customGaugePickerOpen.value = false
  try {
    const headers = await authHeaders()
    const res = await fetch(`${apiBase}/api/v1/me/runs/${slug.value}/gauge`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ custom_gauge_id: cg.id }),
    })
    if (res.ok) await load()
  } catch { /* non-fatal */ }
  finally { customGaugeSaving.value = false }
}

// ── Load ──────────────────────────────────────────────────────────────────────

function populateForm(r: UserReachDetail) {
  form.value.name      = r.name
  form.value.riverName = r.river_name ?? ''
  form.value.note      = r.note ?? ''
  form.value.classMin  = r.class_min ?? null
  form.value.classMax  = r.class_max ?? null
  form.value.isPrivate = r.is_private ?? false
  const low     = r.flow_ranges.find(x => x.label === 'low')
  const running = r.flow_ranges.find(x => x.label === 'running')
  const high    = r.flow_ranges.find(x => x.label === 'high')
  form.value.ranges = {
    low:     { min: null,                       max: low?.max_value      ?? null },
    running: { min: running?.min_value ?? null,  max: running?.max_value ?? null },
    high:    { min: high?.min_value    ?? null,  max: null               },
  }
  nldiGnisId.value = null
}

async function load() {
  loading.value = true
  error.value   = ''
  try {
    const headers = await authHeaders()
    const res = await fetch(`${apiBase}/api/v1/me/runs/${slug.value}`, { headers })
    if (res.status === 404) { error.value = 'Run not found.'; return }
    if (!res.ok) throw new Error(`${res.status}`)
    const data: UserReachDetail = await res.json()
    reach.value = data
    riverConfirmed.value = !!localStorage.getItem(`river-confirmed-${data.id}`)
    populateForm(data)

    // Seed ComID state from saved reach data.
    repinUpComID.value       = data.up_comid
    repinDownComID.value     = data.down_comid
    repinOrigUpComID.value   = data.up_comid
    repinOrigDownComID.value = data.down_comid

    // Auto-load NHD network when saved ComIDs exist.
    if (data.up_comid && data.put_in_lat != null) {
      repinAnchorSnap.value    = { comid: data.up_comid, name: data.river_name ?? '' }
      repinComIDEditMode.value = null
      fetchDownstream(data.up_comid)
      fetchTributaries(data.put_in_lat, data.put_in_lng)
      fetchNearbyGauges(data.put_in_lat, data.put_in_lng, data.up_comid)
    }
  } catch (e: any) {
    error.value = e.message ?? 'Failed to load.'
  } finally {
    loading.value = false
  }
}

// Auto-preview centerline whenever both ComIDs are set by user interaction (dirty state tracks user changes)
watch([repinUpComID, repinDownComID], async ([up, down]) => {
  if (!up || !down || !repinFlowlinesDirty.value) return
  repinPreviewCenterline.value = null
  await previewCenterline()
})

onMounted(() => { load(); loadCustomGauges(); loadReachDashboards() })

// ── Save metadata + flow bands ────────────────────────────────────────────────

async function save() {
  if (!form.value.name.trim()) return
  saving.value    = true
  saveError.value = ''
  try {
    const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) }

    // Auto-preview centerline if flow lines changed and preview not yet computed
    if (repinFlowlinesDirty.value && repinUpComID.value && repinDownComID.value && !repinPreviewCenterline.value) {
      await previewCenterline()
      if (!repinPreviewCenterline.value) {
        saveError.value = 'Centerline preview failed — ensure Put-In and Take-Out are on the same river.'
        return
      }
    }

    // Build combined patch: metadata + flow lines if dirty
    const patchBody: Record<string, unknown> = {
      name:       form.value.name.trim(),
      river_name: form.value.riverName.trim() || null,
      note:       form.value.note.trim()      || null,
      class_min:  form.value.classMin,
      class_max:  form.value.classMax,
      is_private: form.value.isPrivate,
      gnis_id:    nldiGnisId.value ?? undefined,
    }
    if (repinFlowlinesDirty.value && repinUpComID.value && repinDownComID.value) {
      const putIn   = repinPutInPin.value
      const takeOut = repinTakeOutPin.value
      if (putIn)   patchBody.put_in    = { lat: putIn.lat,   lng: putIn.lng   }
      if (takeOut) patchBody.take_out  = { lat: takeOut.lat, lng: takeOut.lng }
      patchBody.up_comid   = repinUpComID.value
      patchBody.down_comid = repinDownComID.value
    }

    const patchRes = await fetch(`${apiBase}/api/v1/me/runs/${slug.value}`, {
      method: 'PATCH', headers,
      body: JSON.stringify(patchBody),
    })
    if (!patchRes.ok) throw new Error(`Save failed: ${patchRes.status}`)

    // Persist centerline if dirty
    if (repinFlowlinesDirty.value && repinPreviewCenterline.value) {
      const clRes = await fetch(`${apiBase}/api/v1/me/runs/${slug.value}/centerline`, {
        method: 'POST', headers,
        body: JSON.stringify({ geojson: repinPreviewCenterline.value }),
      })
      if (!clRes.ok) throw new Error(`Centerline save failed: ${clRes.status}`)
      repinOrigUpComID.value    = repinUpComID.value
      repinOrigDownComID.value  = repinDownComID.value
      repinFlowlinesDirty.value = false
    }

    const r = form.value.ranges
    await fetch(`${apiBase}/api/v1/me/runs/${slug.value}/flow-ranges`, {
      method: 'PUT', headers,
      body: JSON.stringify({
        low:     { min_value: null,           max_value: r.low.max     },
        running: { min_value: r.running.min,  max_value: r.running.max },
        high:    { min_value: r.high.min,     max_value: null          },
      }),
    })

    if (reach.value) {
      reach.value = {
        ...reach.value,
        name:        form.value.name.trim(),
        river_name:  form.value.riverName.trim() || null,
        note:        form.value.note.trim()      || null,
        is_private:  form.value.isPrivate,
        flow_ranges: [
          { label: 'low',     min_value: null,          max_value: r.low.max     },
          { label: 'running', min_value: r.running.min, max_value: r.running.max },
          { label: 'high',    min_value: r.high.min,    max_value: null          },
        ],
      }
    }
  } catch (e: any) {
    saveError.value = e.message ?? 'Save failed.'
  } finally {
    saving.value = false
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────

async function confirmDelete() {
  if (!confirm(`Delete "${reach.value?.name}"? This cannot be undone.`)) return
  const headers = await authHeaders()
  const res = await fetch(`${apiBase}/api/v1/me/runs/${slug.value}`, { method: 'DELETE', headers })
  if (res.ok) router.push('/my/runs')
}
</script>
