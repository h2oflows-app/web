<template>
  <!-- Only render in edit mode -->
  <div v-if="store.mode === 'edit'" class="flex flex-col gap-0">
    <!-- Collapsible header -->
    <button
      type="button"
      class="flex items-center gap-2 py-2 text-sm font-medium text-[--ui-text-muted] hover:text-[--ui-text] transition-colors text-left"
      @click="open = !open"
    >
      <UIcon
        :name="open ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
        class="w-4 h-4 shrink-0"
      />
      Advanced
    </button>

    <div v-if="open" class="flex flex-col gap-5 pt-1">

      <!-- URL slug -->
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-[--ui-text]">URL slug</label>
        <UInput
          v-model="store.slug"
          placeholder="e.g. foxton"
          font-mono
          class="w-full font-mono"
          :color="slugColor"
          @input="onSlugInput"
        />
        <p
          class="text-xs"
          :class="slugStatusClass"
        >
          <template v-if="slugAvailability === 'checking'">Checking…</template>
          <template v-else-if="slugAvailability === 'available'">Available</template>
          <template v-else-if="slugAvailability === 'taken'">Already in use</template>
          <template v-else-if="slugAvailability === 'invalid'">Lowercase letters, numbers, hyphens only</template>
          <template v-else>Current URL: /my/runs/{{ store.slug || '…' }}</template>
        </p>
      </div>

      <!-- Custom gauge -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium text-[--ui-text]">Custom gauge</label>
          <NuxtLink
            to="/my/gauges/new"
            class="text-xs text-primary-500 hover:underline"
          >+ New custom gauge</NuxtLink>
        </div>

        <!-- Currently attached custom gauge -->
        <div
          v-if="store.customGaugeId"
          class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
          :style="{ background: 'var(--ui-bg-elevated)', border: '1px solid var(--ui-border)' }"
        >
          <UIcon name="i-heroicons-beaker" class="w-4 h-4 text-[--ui-text-muted] shrink-0" />
          <span class="flex-1 truncate text-[--ui-text-highlighted] font-medium">
            {{ attachedCustomGaugeName }}
          </span>
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            label="Use NLDI gauge instead"
            @click="clearCustomGauge"
          />
        </div>

        <!-- Custom gauge picker -->
        <template v-else>
          <div v-if="loadingCustomGauges" class="text-xs text-[--ui-text-muted]">Loading…</div>
          <div v-else-if="customGauges.length === 0" class="text-xs text-[--ui-text-muted]">
            No custom gauges yet. <NuxtLink to="/my/gauges/new" class="text-primary-500 hover:underline">Create one</NuxtLink>
          </div>
          <div
            v-else
            class="rounded-lg overflow-hidden"
            :style="{ border: '1px solid var(--ui-border)' }"
          >
            <button
              v-for="cg in customGauges"
              :key="cg.id"
              type="button"
              class="w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[--ui-bg-elevated] flex items-center gap-2"
              @click="selectCustomGauge(cg)"
            >
              <UIcon name="i-heroicons-beaker" class="w-3.5 h-3.5 text-[--ui-text-muted] shrink-0" />
              {{ cg.name }}
            </button>
          </div>
        </template>
      </div>

      <!-- Delete run -->
      <div
        class="flex flex-col gap-2 pt-2 border-t"
        :style="{ borderColor: 'var(--ui-border)' }"
      >
        <p class="text-xs text-[--ui-text-muted]">Danger zone</p>
        <UButton
          label="Delete run"
          leading-icon="i-heroicons-trash"
          color="error"
          variant="outline"
          size="sm"
          :loading="deleting"
          @click="confirmDelete"
        />
      </div>

    </div>

    <!-- Delete confirm modal -->
    <UModal v-model:open="deleteModalOpen" title="Delete run?">
      <template #body>
        <div class="flex flex-col gap-4">
          <p class="text-sm text-[--ui-text]">
            Delete <strong class="font-semibold">{{ store.name }}</strong>? This cannot be undone.
          </p>
          <div class="flex justify-end gap-2">
            <UButton label="Cancel" variant="ghost" color="neutral" @click="deleteModalOpen = false" />
            <UButton
              label="Delete"
              color="error"
              :loading="deleting"
              @click="doDelete"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRunWizardStore } from '~/stores/runWizard'

interface CustomGaugeSummary { id: string; slug: string; name: string }

const store = useRunWizardStore()
const { getToken } = useAuth()
const { apiBase } = useRuntimeConfig().public
const toast = useToast()

const open = ref(false)

// ── Slug availability check ──────────────────────────────────────────────────

const slugAvailability = ref<'unknown' | 'checking' | 'available' | 'taken' | 'invalid'>('unknown')
let slugCheckTimer: ReturnType<typeof setTimeout> | null = null

const slugRe = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/

function onSlugInput() {
  scheduleSlugCheck(store.slug)
}

function scheduleSlugCheck(s: string) {
  if (slugCheckTimer) clearTimeout(slugCheckTimer)
  if (!s || s === store.editSlug) { slugAvailability.value = 'unknown'; return }
  if (!slugRe.test(s)) { slugAvailability.value = 'invalid'; return }
  slugAvailability.value = 'checking'
  slugCheckTimer = setTimeout(async () => {
    try {
      const token = await getToken()
      const headers: Record<string, string> = {}
      if (token) headers.Authorization = `Bearer ${token}`
      const res = await fetch(
        `${apiBase}/api/v1/me/runs/slug-check?slug=${encodeURIComponent(s)}&exclude=${encodeURIComponent(store.editSlug ?? '')}`,
        { headers },
      )
      if (res.ok) slugAvailability.value = (await res.json()).available ? 'available' : 'taken'
    } catch { slugAvailability.value = 'unknown' }
  }, 400)
}

// Expose availability so saveEdit can gate on it
defineExpose({ slugAvailability })

watch(() => store.slug, (s) => {
  if (s !== store.editSlug) scheduleSlugCheck(s)
  else slugAvailability.value = 'unknown'
})

const slugColor = computed(() => {
  if (slugAvailability.value === 'taken' || slugAvailability.value === 'invalid') return 'error'
  if (slugAvailability.value === 'available') return 'success'
  return 'neutral'
})

const slugStatusClass = computed(() => {
  if (slugAvailability.value === 'taken' || slugAvailability.value === 'invalid') return 'text-red-500'
  if (slugAvailability.value === 'available') return 'text-green-500'
  return 'text-[--ui-text-muted]'
})

// ── Custom gauges ─────────────────────────────────────────────────────────────

const customGauges = ref<CustomGaugeSummary[]>([])
const loadingCustomGauges = ref(false)

const attachedCustomGaugeName = computed(() => {
  if (!store.customGaugeId) return ''
  return customGauges.value.find(g => g.id === store.customGaugeId)?.name
    ?? store.loadedGauge?.name
    ?? 'Custom gauge'
})

async function loadCustomGauges() {
  loadingCustomGauges.value = true
  try {
    const token = await getToken()
    const headers: Record<string, string> = {}
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch(`${apiBase}/api/v1/me/custom-gauges`, { headers })
    if (res.ok) {
      const data = await res.json()
      customGauges.value = data.items ?? []
    }
  } catch { /* non-fatal */ }
  finally { loadingCustomGauges.value = false }
}

function selectCustomGauge(cg: CustomGaugeSummary) {
  store.customGaugeId = cg.id
  // Clear NLDI gauge when a custom gauge is selected
  store.gauge = null
  store.gaugeDirty = true
}

function clearCustomGauge() {
  store.customGaugeId = null
  store.gaugeDirty = true
}

onMounted(() => {
  if (store.mode === 'edit') loadCustomGauges()
})

// ── Delete run ────────────────────────────────────────────────────────────────

const deleteModalOpen = ref(false)
const deleting = ref(false)

function confirmDelete() {
  deleteModalOpen.value = true
}

async function doDelete() {
  if (!store.editSlug) return
  deleting.value = true
  try {
    const token = await getToken()
    const headers: Record<string, string> = {}
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch(`${apiBase}/api/v1/me/runs/${store.editSlug}`, {
      method: 'DELETE',
      headers,
    })
    if (res.ok) {
      deleteModalOpen.value = false
      store.reset()
      await navigateTo('/my/runs')
    } else {
      toast.add({ title: `Delete failed (${res.status})`, color: 'error' })
    }
  } catch (e: any) {
    toast.add({ title: 'Delete failed', description: e?.message, color: 'error' })
  } finally {
    deleting.value = false
  }
}
</script>
