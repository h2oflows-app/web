<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col">
    <AppHeader>
      <span class="text-neutral-300 dark:text-neutral-700 shrink-0">/</span>
      <NuxtLink to="/dashboard" class="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors">Dashboard</NuxtLink>
      <span class="text-neutral-300 dark:text-neutral-700 shrink-0">/</span>
      <span class="text-sm font-medium text-neutral-700 dark:text-neutral-200 truncate">{{ reach?.name ?? 'Edit' }}</span>
    </AppHeader>

    <!-- Sticky action bar (below AppHeader) — Save, Cancel, X, KML, Share, Delete -->
    <div v-if="reach" class="sticky top-[51px] z-20 flex items-center justify-between gap-2 px-4 py-2 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-sm border-b border-neutral-200 dark:border-neutral-800">
      <div class="flex items-center gap-1.5 min-w-0">
        <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-x-mark" :to="'/dashboard'" title="Close"><span class="hidden sm:inline">Close</span></UButton>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <RunDashboardMembershipPicker v-if="reach" :slug="slug" :reach-id="reach.id" />
        <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-arrow-up-tray" title="Import KML/KMZ" @click="kmlModalOpen = true"><span class="hidden sm:inline">KML</span></UButton>
        <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-share" title="Share" @click="openShare()"><span class="hidden sm:inline">Share</span></UButton>
        <UButton size="xs" variant="ghost" color="error" icon="i-heroicons-trash" title="Delete" @click="confirmDelete"><span class="hidden sm:inline">Delete</span></UButton>
        <UButton size="xs" variant="outline" color="neutral" icon="i-heroicons-x-circle" :to="'/dashboard'" title="Cancel"><span class="hidden sm:inline">Cancel</span></UButton>
        <UButton size="xs" :disabled="!form.name.trim()" :loading="saving" icon="i-heroicons-check" title="Save" @click="save"><span class="hidden sm:inline">Save</span></UButton>
      </div>
    </div>

    <!-- Admin sentinel banner — shown when editing an h2oflows-owned run as admin -->
    <div v-if="reach?.author_handle === 'h2oflows'" class="flex items-center gap-2 px-4 py-1.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 text-xs text-amber-700 dark:text-amber-400">
      <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
      Editing <strong class="font-semibold">@h2oflows</strong> run as admin — changes affect the canonical version
    </div>

    <!-- Fork attribution — single inline line -->
    <div v-if="reach?.original_forked_at || reach?.forked_from_slug" class="px-4 pt-2 text-xs text-neutral-400 dark:text-neutral-500">
      Forked from {{ reach.forked_from_name ?? reach.forked_from_slug ?? '' }}<template v-if="reach.original_author_handle"> · <NuxtLink :to="`/explore?browse=${reach.original_author_handle}`" class="hover:text-primary-500 transition-colors">@{{ reach.original_author_handle }}</NuxtLink></template><template v-if="forkDate"> · {{ forkDate }}</template>
    </div>

    <!-- Run heading (no card chrome) -->
    <div v-if="reach" class="px-4 pt-4">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div v-if="reach.river_name" class="text-xs font-medium text-primary-500 uppercase tracking-wide mb-1">{{ reach.river_name }}</div>
          <h1 class="text-2xl font-bold leading-tight text-neutral-900 dark:text-white truncate">{{ reach.name }}</h1>
          <div class="flex items-center gap-2 mt-0.5 flex-wrap">
            <div v-if="reach.river_state_abbr || reach.river_basin" class="text-sm text-neutral-500">
              {{ [reach.river_state_abbr, reach.river_basin].filter(Boolean).join(' · ') }}
            </div>
            <span class="text-xs font-mono text-neutral-300 dark:text-neutral-600">{{ slug }}</span>
          </div>
        </div>
        <template v-if="reach.current_cfs != null">
          <div class="flex items-end gap-3 shrink-0 mt-1">
            <div class="text-right">
              <p class="text-2xl font-bold font-mono leading-none" :style="{ color: cfsColor }">
                {{ reach.current_cfs.toLocaleString() }}<span class="text-xs font-normal text-neutral-400 ml-1">cfs</span>
              </p>
            </div>
            <span
              v-if="liveBand"
              class="text-xs font-medium px-2 py-0.5 rounded-full shrink-0 mb-0.5"
              :class="colorKeyToBadgeClass(liveBand.color)"
            >{{ liveBand.label }}</span>
          </div>
        </template>
      </div>
      <div
        v-if="reach.gauge_poll_health === 'stale' || reach.gauge_poll_health === 'unreachable'"
        class="mt-2 flex items-start gap-2 px-2.5 py-1.5 rounded-md text-xs border"
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
            :comid-select-mode="repinComIDEditMode !== null && !repinPickMode && !repinGaugeSelectMode"
            :comid-select-slot="repinComIDEditMode"
            :selected-up-comid="repinUpComID"
            :selected-down-comid="repinDownComID"
            :preview-centerline="repinPreviewCenterline ?? (repinCenterlineHidden ? null : reach.centerline) ?? null"
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

        <!-- Run Details card (top) -->
        <div class="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-3">
          <p class="text-xs text-neutral-400 uppercase tracking-wide font-medium">Run details</p>

          <div>
            <label class="block text-xs text-neutral-500 mb-1">Name <span class="text-red-400">*</span></label>
            <input v-model="form.name" class="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1.5 text-sm" placeholder="e.g. Foxton" />
          </div>

          <div>
            <label class="block text-xs text-neutral-500 mb-1">URL slug</label>
            <div class="relative">
              <input
                v-model="form.slug"
                class="w-full rounded-md border px-2 py-1.5 text-sm bg-white dark:bg-neutral-800 font-mono"
                :class="slugAvailability === 'taken' || slugAvailability === 'invalid'
                  ? 'border-red-400 dark:border-red-500'
                  : slugAvailability === 'available'
                    ? 'border-green-400 dark:border-green-500'
                    : 'border-neutral-300 dark:border-neutral-600'"
                placeholder="e.g. foxton"
                @input="slugManuallyEdited = true"
              />
            </div>
            <p class="mt-0.5 text-xs"
              :class="slugAvailability === 'taken' || slugAvailability === 'invalid' ? 'text-red-500' : slugAvailability === 'available' ? 'text-green-500' : 'text-neutral-400'"
            >
              <template v-if="slugAvailability === 'checking'">Checking…</template>
              <template v-else-if="slugAvailability === 'available'">Available</template>
              <template v-else-if="slugAvailability === 'taken'">Already in use</template>
              <template v-else-if="slugAvailability === 'invalid'">Lowercase letters, numbers, hyphens only</template>
              <template v-else>Current URL: /my/runs/{{ form.slug || '…' }}</template>
            </p>
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
            <div v-if="reach?.river_state_abbr || reach?.river_basin" class="mt-1 text-xs text-neutral-400 flex gap-3">
              <span v-if="reach?.river_state_abbr">State: {{ reach.river_state_abbr }}</span>
              <span v-if="reach?.river_basin">Basin: {{ reach.river_basin }}</span>
            </div>
          </div>

          <div>
            <label class="block text-xs text-neutral-500 mb-1">Description</label>
            <textarea v-model="form.note" rows="3" class="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1.5 text-sm resize-y" placeholder="Beta, access, permanent hazards…" />
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

          <!-- Visibility pills (V1/V2/V3) -->
          <div class="space-y-1.5">
            <p class="text-xs font-medium text-neutral-700 dark:text-neutral-300">Visibility</p>
            <div class="flex items-center gap-1.5 flex-wrap">
              <button
                v-for="opt in visibilityOptions"
                :key="opt.value"
                type="button"
                :disabled="opt.disabled"
                class="px-2.5 py-1 rounded-full text-xs font-medium border transition-colors"
                :class="form.visibility === opt.value
                  ? 'bg-primary-500 text-white border-primary-500'
                  : opt.disabled
                    ? 'border-neutral-200 dark:border-neutral-700 text-neutral-300 dark:text-neutral-600 cursor-default'
                    : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400'"
                @click="setVisibility(opt.value)"
              >{{ opt.label }}</button>
            </div>
            <p class="text-xs text-neutral-400">{{ visibilityDescription }}</p>
          </div>
        </div>

        <!-- Geometry card -->
        <div class="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-3">
          <p class="text-xs text-neutral-400 uppercase tracking-wide font-medium">Geometry</p>

          <!-- Clear Flow Lines / pick mode -->
          <div class="flex flex-wrap items-center gap-2">
            <button
              class="text-xs px-2.5 py-1 rounded-md font-medium border transition-colors"
              :class="repinPickMode
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300'
                : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600'"
              @click="togglePickMode"
            >{{ repinPickMode ? 'Cancel' : 'Clear Geometry' }}</button>
            <span v-if="repinAnchorSnapping" class="text-xs text-primary-600 dark:text-primary-400 animate-pulse">Snapping to NHD…</span>
            <span v-if="repinAnchorError" class="text-xs text-red-500">{{ repinAnchorError }}</span>
          </div>

          <!-- ComID toggles (put-in + take-out only) -->
          <div class="flex items-center gap-2 text-xs flex-wrap">
            <span class="text-neutral-500 shrink-0">Click map for:</span>
            <button
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm font-medium transition-colors"
              :class="repinComIDEditMode === 'up' && !repinGaugeSelectMode
                ? 'border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300'
                : repinUpComID
                  ? 'border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:border-green-500'
                  : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-neutral-400'"
              @click="onToggleComID('up')"
            >
              <span class="w-2 h-2 rounded-full bg-green-500 shrink-0" />
              {{ repinComIDEditMode === 'up' && !repinGaugeSelectMode ? 'Click map…' : 'Set Put-In' }}
            </button>
            <button
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm font-medium transition-colors"
              :class="repinComIDEditMode === 'down' && !repinGaugeSelectMode
                ? 'border-red-500 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300'
                : repinDownComID
                  ? 'border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:border-red-500'
                  : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-neutral-400'"
              @click="onToggleComID('down')"
            >
              <span class="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              {{ repinComIDEditMode === 'down' && !repinGaugeSelectMode ? 'Click map…' : 'Set Take-Out' }}
            </button>
          </div>

          <p v-if="repinFlowlinesLoading" class="text-xs text-primary-500 animate-pulse">Loading downstream mainstem…</p>

          <!-- Status messages -->
          <div v-if="repinPreviewLoading || repinError || repinSuccess" class="flex items-center gap-2 pt-1 flex-wrap">
            <span v-if="repinPreviewLoading" class="text-xs text-primary-500 animate-pulse">Computing centerline…</span>
            <span v-if="repinError" class="text-xs text-red-500">{{ repinError }}</span>
            <span v-if="repinSuccess" class="text-xs text-green-600 dark:text-green-400">{{ repinSuccess }}</span>
          </div>
        </div>

        <!-- Flows section: Gauge + Flow Bands -->
        <div class="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 divide-y divide-neutral-100 dark:divide-neutral-800">

        <!-- Gauge subsection -->
        <div class="p-4 space-y-3">
          <p class="text-xs text-neutral-400 uppercase tracking-wide font-medium">Flows</p>

          <!-- Gauge select toggle -->
          <div class="flex items-center gap-2 text-sm flex-wrap">
            <button
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-md border font-medium transition-colors"
              :class="reach.custom_gauge_id
                ? 'border-neutral-200 dark:border-neutral-700 text-neutral-400 cursor-default'
                : repinGaugeSelectMode
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                  : reach.gauge_id
                    ? 'border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:border-amber-500'
                    : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-neutral-400'"
              :disabled="!!reach.custom_gauge_id"
              @click="!reach.custom_gauge_id && (repinGaugeSelectMode = !repinGaugeSelectMode, repinComIDEditMode = null, !repinGaugeSelectMode && (repinPendingGauge = null))"
            >
              <span class="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <template v-if="reach.custom_gauge_id">Custom Gauge</template>
              <template v-else-if="repinGaugeSelectMode">Cancel</template>
              <template v-else>Set Gauge</template>
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

          <!-- Linked gauge -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs text-neutral-500">Linked gauge</p>
              <div class="relative">
                <UButton
                  v-if="reach.custom_gauge_id"
                  size="xs" variant="outline" color="neutral"
                  :loading="customGaugeSaving"
                  @click="clearGauge"
                >
                  Unlink
                </UButton>
                <UButton
                  v-else-if="!reach.gauge_id"
                  size="xs" variant="outline" color="neutral"
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
                <a
                  v-if="reach.gauge_source && gaugeSourceUrl(reach.gauge_source, reach.gauge_external_id)"
                  :href="gaugeSourceUrl(reach.gauge_source, reach.gauge_external_id)!"
                  target="_blank" rel="noopener"
                  class="hover:text-primary-400 underline underline-offset-2"
                >{{ reach.gauge_external_id }}</a>
                <span v-else>{{ reach.gauge_external_id }}</span>
                <span v-if="reach.gauge_source" class="uppercase ml-1.5">{{ reach.gauge_source }}</span>
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
        </div><!-- end gauge subsection -->

        <!-- Flow Bands subsection -->
        <div class="p-4">
          <FlowBandEditor v-model="form.flowBands" />
        </div>

        </div><!-- end Flows section -->

        <!-- Features list -->
        <div v-if="reach && (reach.rapids.length > 0 || reach.access_points.length > 0)" class="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-2">
          <p class="text-xs text-neutral-400 uppercase tracking-wide font-medium">
            Features
            <span class="normal-case font-normal">
              ({{ reach.rapids.length }} rapid{{ reach.rapids.length !== 1 ? 's' : '' }} · {{ reach.access_points.length }} access pt{{ reach.access_points.length !== 1 ? 's' : '' }})
            </span>
          </p>
          <div v-if="reach.rapids.length > 0" class="space-y-1">
            <p class="text-xs font-medium text-neutral-500 dark:text-neutral-400">Rapids &amp; hazards</p>
            <div v-for="r in reach.rapids" :key="r.id" class="flex items-start gap-2 text-xs py-0.5">
              <span
                class="mt-0.5 shrink-0 inline-block w-2 h-2 rounded-full"
                :class="r.is_permanent_hazard ? 'bg-red-500' : r.is_surf_wave ? 'bg-sky-400' : 'bg-amber-400'"
              />
              <span class="font-medium text-neutral-700 dark:text-neutral-300">{{ r.name }}</span>
              <span v-if="r.class_rating" class="text-neutral-400">III+</span>
              <span v-if="r.is_permanent_hazard" class="text-red-500">hazard</span>
              <span v-if="r.is_surf_wave" class="text-sky-500">wave</span>
            </div>
          </div>
          <div v-if="reach.access_points.length > 0" class="space-y-1">
            <p class="text-xs font-medium text-neutral-500 dark:text-neutral-400">Access points</p>
            <div v-for="a in reach.access_points" :key="a.id" class="flex items-start gap-2 text-xs py-0.5">
              <span class="mt-0.5 shrink-0 inline-block w-2 h-2 rounded-full bg-emerald-500" />
              <span class="font-medium text-neutral-700 dark:text-neutral-300 capitalize">{{ a.access_type.replace('_', ' ') }}</span>
              <span v-if="a.name" class="text-neutral-400">· {{ a.name }}</span>
            </div>
          </div>
        </div>

        <!-- Similar runs (cluster) -->
        <div v-if="clusterRuns.length > 0" class="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 space-y-2">
          <p class="text-xs text-neutral-400 uppercase tracking-wide font-medium">Similar Runs <span class="font-normal normal-case">(same section)</span></p>
          <div v-for="run in clusterRuns" :key="run.id" class="flex items-center gap-2 py-0.5 text-xs">
            <svg v-if="run.is_official" class="w-3 h-3 text-primary-500 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            <span class="w-2 h-2 rounded-full bg-neutral-300 dark:bg-neutral-600 shrink-0" v-else />
            <NuxtLink
              :to="`/runs/${run.author_handle ?? 'h2oflows'}/${run.slug}`"
              class="font-medium text-neutral-700 dark:text-neutral-300 hover:text-primary-600 dark:hover:text-primary-400 hover:underline truncate flex-1"
            >{{ run.name }}</NuxtLink>
            <span class="text-neutral-400 shrink-0">{{ run.report_count }} report{{ run.report_count !== 1 ? 's' : '' }}</span>
            <span v-if="run.author_handle" class="text-neutral-400 shrink-0">@{{ run.author_handle }}</span>
            <span v-else-if="run.is_official" class="text-primary-500 shrink-0">Official</span>
          </div>
        </div>

        <!-- Save metadata -->
        <div v-if="saveError" class="text-xs text-red-500 px-1">{{ saveError }}</div>

      </div>
    </div>
  </div>

  <!-- Share modal -->
  <ShareLinkModal
    :open="shareOpen"
    title="Share run"
    :link="reachShareLink"
    :json="sharePayload"
    :loading="shareLoading"
    @close="shareOpen = false; customGaugePayload = null"
  />

  <!-- Publish confirm gate (V5) — irreversible warning -->
  <UModal v-model:open="publishConfirmOpen" title="Make this run public?">
    <template #body>
      <div class="space-y-3">
        <p class="text-sm text-neutral-700 dark:text-neutral-300">
          Publishing is <strong>permanent</strong>. Others can add, fork, and up-vote this run.
          You can only delete it later — people who added it keep a read-only copy.
        </p>
        <p class="text-xs text-amber-600 dark:text-amber-400 font-medium">
          This cannot be undone.
        </p>
        <p v-if="publishError" class="text-xs text-red-500">{{ publishError }}</p>
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <UButton size="xs" variant="outline" color="neutral" :disabled="publishing" @click="publishConfirmOpen = false">Cancel</UButton>
        <UButton size="xs" color="primary" :loading="publishing" @click="confirmPublish">Make Public</UButton>
      </div>
    </template>
  </UModal>

  <!-- KML import modal -->
  <UModal v-model:open="kmlModalOpen" title="Import KML / KMZ">
    <template #body>
      <div class="space-y-3">
        <p class="text-sm text-neutral-500 dark:text-neutral-400">
          Upload a KML/KMZ file to import rapids, hazards, and access points. Existing imported pins are replaced on each upload.
          <a
            href="https://github.com/h2oflows-app/api/blob/main/internal/kmlimport/README.md"
            target="_blank"
            rel="noopener"
            class="ml-1 text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
          >Format guide ↗</a>
        </p>
        <div class="flex items-center gap-2">
          <input
            id="kml-file-input"
            type="file"
            accept=".kml,.kmz"
            class="flex-1 text-xs text-neutral-600 dark:text-neutral-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-neutral-100 dark:file:bg-neutral-800 file:text-neutral-600 dark:file:text-neutral-300 file:cursor-pointer"
            @change="onKmlFileChange"
          />
          <UButton
            size="xs"
            :disabled="!kmlFile || kmlUploading"
            :loading="kmlUploading"
            @click="uploadKml"
          >Upload</UButton>
        </div>
        <p v-if="kmlError" class="text-xs text-red-500">{{ kmlError }}</p>
        <div v-if="kmlLog.length > 0" class="rounded bg-neutral-50 dark:bg-neutral-800 px-3 py-2 max-h-40 overflow-y-auto">
          <p v-for="(line, i) in kmlLog" :key="i" class="text-xs font-mono text-neutral-600 dark:text-neutral-300 leading-relaxed">{{ line }}</p>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { FlowBands } from '~/utils/flowBand'
import { bandForCfs as computeBandForCfs, colorKeyToHex, colorKeyToBadgeClass } from '~/utils/flowBand'

definePageMeta({ ssr: false })

useFlowBandPalette()

const route  = useRoute()
const router = useRouter()
const toast  = useToast()
const { getToken } = useAuth()
const { apiBase }  = useRuntimeConfig().public

const slug = computed(() => route.params.slug as string)

const loading   = ref(false)
const error     = ref('')
const saving    = ref(false)
const saveError = ref('')

// ── Types ─────────────────────────────────────────────────────────────────────

interface NHDFC { type: string; features: any[] }
interface AnchorSnap { comid: string; name: string }
interface PendingGauge { externalId: string; source: string; name: string; lat: number; lng: number }
type ComIDEditMode = 'up' | 'down' | null


interface RunRapid {
  id: string
  name: string
  description: string | null
  class_rating: number | null
  is_surf_wave: boolean
  is_permanent_hazard: boolean
  hazard_type: string | null
  lng: number | null
  lat: number | null
}

interface RunAccessPoint {
  id: string
  access_type: string
  name: string | null
  notes: string | null
  lng: number | null
  lat: number | null
}

interface UserReachDetail {
  id:                string
  slug:              string
  name:              string
  long_name:         string | null
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
  visibility:        string
  author_handle:     string | null
  forked_from_slug:  string | null
  forked_from_name:  string | null
  original_author_handle:     string | null
  original_forked_at:         string | null
  last_modified_after_fork_at: string | null
  flow_bands:        FlowBands
  rapids:            RunRapid[]
  access_points:     RunAccessPoint[]
  upvote_count:      number
  user_upvoted:      boolean
  centerline:        object | null
  river_confirmed:   boolean
}

interface CustomGaugeSummary { id: string; slug: string; name: string }

const reach = ref<UserReachDetail | null>(null)

// ── Form state ────────────────────────────────────────────────────────────────

const form = ref({
  name:       '',
  slug:       '',
  riverName:  '',
  note:       '',
  classMin:   null as number | null,
  classMax:   null as number | null,
  visibility: 'private' as 'private' | 'unlisted' | 'public',
  flowBands:  { base_label: 'Too Low', base_color: 'red-3', thresholds: [] } as FlowBands,
})

const slugManuallyEdited = ref(false)
const slugAvailability   = ref<'unknown' | 'checking' | 'available' | 'taken' | 'invalid'>('unknown')
let   slugCheckTimer: ReturnType<typeof setTimeout> | null = null

function deriveSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
}

watch(() => form.value.name, (name) => {
  if (slugManuallyEdited.value) return
  form.value.slug = deriveSlug(name)
  slugAvailability.value = 'unknown'
})

watch(() => form.value.slug, (s) => {
  if (slugCheckTimer) clearTimeout(slugCheckTimer)
  if (!s || s === reach.value?.slug) { slugAvailability.value = 'unknown'; return }
  const slugRe = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/
  if (!slugRe.test(s)) { slugAvailability.value = 'invalid'; return }
  slugAvailability.value = 'checking'
  slugCheckTimer = setTimeout(async () => {
    try {
      const headers = await authHeaders()
      const res = await fetch(`${apiBase}/api/v1/me/runs/slug-check?slug=${encodeURIComponent(s)}&exclude=${encodeURIComponent(reach.value?.slug ?? '')}`, { headers })
      if (res.ok) slugAvailability.value = (await res.json()).available ? 'available' : 'taken'
    } catch { slugAvailability.value = 'unknown' }
  }, 400)
})

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
const repinStartLat        = ref<number | null>(null)
const repinStartLng        = ref<number | null>(null)
const repinEndLat          = ref<number | null>(null)
const repinEndLng          = ref<number | null>(null)
const repinFlowlinesDirty    = ref(false)
const repinCenterlineHidden  = ref(false)
const repinPreviewCenterline = ref<object | null>(null)
const repinPreviewLoading  = ref(false)
const repinError           = ref('')
const repinSuccess         = ref('')

const repinGauges              = ref<NHDFC | null>(null)
const repinGaugeSelectMode     = ref(false)
const repinPendingGauge        = ref<PendingGauge | null>(null)
const repinGaugeSaving         = ref(false)
const repinGaugeError          = ref('')
const riverNameLooking = ref(false)
const nldiGnisId       = ref<string | null>(null)

const customGauges           = ref<CustomGaugeSummary[]>([])
const customGaugePickerOpen  = ref(false)
const customGaugeSaving      = ref(false)

const shareOpen           = ref(false)
const shareLoading        = ref(false)
const customGaugePayload  = ref<object | null>(null)

const publishConfirmOpen  = ref(false)
const publishing          = ref(false)
const publishError        = ref('')

// ── Visibility helpers (V1/V2/V3/V5) ─────────────────────────────────────────

type Visibility = 'private' | 'unlisted' | 'public'

const visibilityOptions = computed(() => {
  const isPublished = form.value.visibility === 'public'
  return [
    { value: 'private'  as Visibility, label: 'Private',  disabled: isPublished },
    { value: 'unlisted' as Visibility, label: 'Unlisted', disabled: isPublished },
    { value: 'public'   as Visibility, label: 'Public',   disabled: false },
  ]
})

const visibilityDescription = computed(() => {
  switch (form.value.visibility) {
    case 'private':  return 'Only you can see this run.'
    case 'unlisted': return 'Accessible via link — not in explore or search.'
    case 'public':   return 'Run is searchable, up-votable, and can be found by other users. Cannot unlist or make private again.'
    default:         return ''
  }
})

function setVisibility(v: Visibility) {
  if (v === form.value.visibility) return
  if (v === 'public') {
    publishError.value = ''
    publishConfirmOpen.value = true
    return
  }
  // private↔unlisted transitions go through PATCH (API validates V3 ratchet)
  form.value.visibility = v
}

async function confirmPublish() {
  if (!reach.value) return
  publishing.value  = true
  publishError.value = ''
  try {
    const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) }
    const res = await fetch(`${apiBase}/api/v1/me/runs/${slug.value}/publish`, { method: 'POST', headers })
    if (!res.ok) {
      const msg = await res.json().catch(() => ({}))
      publishError.value = msg.error ?? `HTTP ${res.status}`
      return
    }
    form.value.visibility = 'public'
    publishConfirmOpen.value = false
    toast.add({ title: 'Run is now public.', color: 'success' })
    await load()
  } catch (e: any) {
    publishError.value = e?.message ?? 'Publish failed'
  } finally {
    publishing.value = false
  }
}

// ── KML import ────────────────────────────────────────────────────────────────

const kmlModalOpen   = ref(false)
const kmlFile        = ref<File | null>(null)
const kmlUploading   = ref(false)
const kmlLog         = ref<string[]>([])
const kmlError       = ref('')

function onKmlFileChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  kmlFile.value  = f ?? null
  kmlLog.value   = []
  kmlError.value = ''
}

async function uploadKml() {
  if (!kmlFile.value || !reach.value) return
  kmlUploading.value = true
  kmlError.value     = ''
  kmlLog.value       = []
  try {
    const headers = await authHeaders()
    const fd = new FormData()
    fd.append('file', kmlFile.value)
    const res = await fetch(`${apiBase}/api/v1/me/reaches/${reach.value.slug}/kml`, {
      method: 'POST', headers, body: fd,
    })
    if (!res.ok) { kmlError.value = `Upload failed (${res.status})`; return }
    const result = await res.json()
    const rr: any = result.reaches ? Object.values(result.reaches)[0] : null
    kmlLog.value = result.log ?? []
    kmlFile.value = null
    ;(document.getElementById('kml-file-input') as HTMLInputElement | null)?.value && ((document.getElementById('kml-file-input') as HTMLInputElement).value = '')
    await load()
    if (rr) toast.add({ title: `Imported: ${rr.rapids ?? 0} rapids, ${(rr.put_ins ?? 0) + (rr.take_outs ?? 0) + (rr.parking ?? 0)} access pts`, color: 'success' })
  } catch (e: any) {
    kmlError.value = e?.message ?? 'Upload failed'
  } finally {
    kmlUploading.value = false
  }
}

// ── Similar runs (cluster) ────────────────────────────────────────────────────

interface ClusterRun { id: string; slug: string; name: string; author_handle: string | null; is_official: boolean; class_min: number | null; class_max: number | null; report_count: number; rank_score: number }

const clusterRuns = ref<ClusterRun[]>([])

async function loadCluster() {
  if (!reach.value) return
  try {
    const headers = await authHeaders()
    const res = await fetch(`${apiBase}/api/v1/user-runs/${reach.value.id}/cluster`, { headers })
    if (!res.ok) return
    const data = await res.json()
    clusterRuns.value = data.runs ?? []
  } catch {}
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

const liveBand = computed(() => {
  const r = reach.value
  if (!r || r.current_cfs == null) return null
  return computeBandForCfs(r.current_cfs, r.flow_bands)
})

const cfsColor = computed(() => liveBand.value ? colorKeyToHex(liveBand.value.color) : '#9ca3af')

const forkDate = computed(() => {
  const d = reach.value?.original_forked_at ?? null
  if (!d) return ''
  return new Date(d).toLocaleDateString()
})

const modifiedDate = computed(() => {
  const d = reach.value?.last_modified_after_fork_at ?? null
  if (!d) return ''
  return new Date(d).toLocaleDateString()
})

const sharePayload = computed(() => {
  const r = reach.value
  if (!r) return ''
  const payload: Record<string, unknown> = {
    name:       r.name,
    river_name: r.river_name ?? '',
    put_in:  { lat: r.put_in_lat,    lng: r.put_in_lng    },
    take_out: { lat: r.take_out_lat, lng: r.take_out_lng  },
    up_comid:   r.up_comid   ?? '',
    down_comid: r.down_comid ?? '',
    note:       r.note ?? '',
    flow_bands: form.value.flowBands,
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

async function lookupRiverName(comidOverride?: string, latOverride?: number, lngOverride?: number): Promise<void> {
  const comid = comidOverride ?? repinUpComID.value
  if (!comid) return
  const lat = latOverride ?? repinStartLat.value ?? reach.value?.put_in_lat
  const lng = lngOverride ?? repinStartLng.value ?? reach.value?.put_in_lng
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

function togglePickMode() {
  if (repinPickMode.value) { repinPickMode.value = false; repinAnchorError.value = ''; return }
  // Full reset — clear anchor, flowlines, ComIDs, pins, centerline
  repinAnchorSnap.value        = null
  repinTributaries.value       = null
  repinDownstream.value        = null
  repinUpComID.value           = null
  repinDownComID.value         = null
  repinStartLat.value          = null
  repinStartLng.value          = null
  repinEndLat.value            = null
  repinEndLng.value            = null
  repinPreviewCenterline.value = null
  repinCenterlineHidden.value  = true
  repinComIDEditMode.value     = null
  repinFlowlinesDirty.value    = false
  repinError.value             = ''
  repinSuccess.value           = ''
  repinAnchorError.value       = ''
  repinGaugeSelectMode.value   = false
  repinPickMode.value          = true
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
    repinAnchorSnap.value        = snap
    repinCenterlineHidden.value  = true
    // Auto-set put-in from anchor snap; advance directly to take-out selection
    repinUpComID.value           = snap.comid
    repinStartLat.value          = lat
    repinStartLng.value          = lng
    repinFlowlinesDirty.value    = true
    repinComIDEditMode.value     = 'down'
    await fetchDownstream(snap.comid)
    fetchNearbyGauges(lat, lng, snap.comid)
    // Auto-populate river name from NLDI if form field is empty
    if (!form.value.riverName) lookupRiverName(snap.comid, lat, lng)
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
    // Auto-advance to take-out only when it isn't already set
    repinComIDEditMode.value = repinDownComID.value ? null : 'down'
  } else {
    repinDownComID.value     = comid
    repinEndLat.value        = lat
    repinEndLng.value        = lng
    repinComIDEditMode.value = null  // done — button reverts to "Set Take-Out"
  }
  repinFlowlinesDirty.value    = true
  repinPreviewCenterline.value = null
}

function onToggleComID(slot: 'up' | 'down') {
  repinGaugeSelectMode.value = false
  if (repinComIDEditMode.value === slot) { repinComIDEditMode.value = null; return }
  // No flowlines yet — enter pick mode; onAnchorPick will auto-set put-in and advance
  if (!repinTributaries.value && !repinDownstream.value) {
    repinPickMode.value = true
    return
  }
  repinComIDEditMode.value = slot
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
  slugManuallyEdited.value = true  // block name watcher from overriding stored slug
  form.value.name       = r.name
  form.value.slug       = r.slug
  form.value.riverName  = r.river_name ?? ''
  form.value.note       = r.note ?? ''
  form.value.classMin   = r.class_min ?? null
  form.value.classMax   = r.class_max ?? null
  form.value.visibility = (r.visibility as Visibility) ?? (r.is_private ? 'private' : 'public')
  form.value.flowBands  = r.flow_bands ?? { base_label: 'Too Low', base_color: 'red-3', thresholds: [] }
  nldiGnisId.value       = null
  slugManuallyEdited.value = false
  slugAvailability.value   = 'unknown'
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
    populateForm(data)

    // Seed ComID state from saved reach data.
    repinUpComID.value   = data.up_comid
    repinDownComID.value = data.down_comid

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

onMounted(async () => { await load(); loadCustomGauges(); loadCluster() })

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
      // API rejects visibility:"public" via PATCH (must use /publish); omit if already public
      ...(form.value.visibility !== 'public' ? { visibility: form.value.visibility } : {}),
      gnis_id:    nldiGnisId.value ?? undefined,
    }
    // Include slug if user changed it (and it's valid/available)
    const slugChanged = form.value.slug && form.value.slug !== reach.value?.slug
    if (slugChanged) {
      if (slugAvailability.value === 'taken' || slugAvailability.value === 'invalid') {
        saveError.value = 'Fix the URL slug before saving.'
        return
      }
      patchBody.slug = form.value.slug
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
    if (!patchRes.ok) {
      if (patchRes.status === 409) { saveError.value = 'URL slug already in use.'; return }
      throw new Error(`Save failed: ${patchRes.status}`)
    }
    const patchData = await patchRes.json().catch(() => ({}))
    const returnedSlug: string = patchData.slug ?? slug.value

    // Persist centerline if dirty (use returnedSlug in case it changed)
    if (repinFlowlinesDirty.value && repinPreviewCenterline.value) {
      const clRes = await fetch(`${apiBase}/api/v1/me/runs/${returnedSlug}/centerline`, {
        method: 'POST', headers,
        body: JSON.stringify({ geojson: repinPreviewCenterline.value }),
      })
      if (!clRes.ok) throw new Error(`Centerline save failed: ${clRes.status}`)
      repinFlowlinesDirty.value   = false
      repinCenterlineHidden.value = false
    }

    const fbRes = await fetch(`${apiBase}/api/v1/me/runs/${returnedSlug}/flow-ranges`, {
      method: 'PUT', headers,
      body: JSON.stringify(form.value.flowBands),
    })
    if (!fbRes.ok) throw new Error(`Flow bands save failed: ${fbRes.status}`)

    if (reach.value) {
      reach.value = {
        ...reach.value,
        slug:        returnedSlug,
        name:        form.value.name.trim(),
        river_name:  form.value.riverName.trim() || null,
        note:        form.value.note.trim()      || null,
        is_private:  form.value.visibility !== 'public',
        visibility:  form.value.visibility,
        flow_bands:  form.value.flowBands,
      }
    }
    slugAvailability.value = 'unknown'
    void loadCluster()
    // Redirect to new URL when slug changed
    if (returnedSlug !== slug.value) {
      await navigateTo(`/my/runs/${returnedSlug}`, { replace: true })
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
  if (res.ok) {
    router.push('/dashboard')
  } else {
    alert(`Delete failed (${res.status}). Try again.`)
  }
}
</script>
