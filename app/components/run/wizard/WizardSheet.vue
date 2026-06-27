<template>
  <!-- Mobile: fixed bottom panel -->
  <div
    class="fixed bottom-0 left-0 right-0 z-30 md:hidden"
    :style="{
      background: 'var(--ui-bg)',
      borderRadius: '24px 24px 0 0',
      boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
    }"
  >
    <!-- Drag handle -->
    <div class="flex justify-center pt-3 pb-1">
      <div class="w-9 h-1 rounded-full bg-[--ui-border-accented]" />
    </div>
    <div class="px-5 pb-safe-bottom pb-6">
      <slot />
    </div>
  </div>

  <!-- Desktop: fixed right panel -->
  <div
    class="hidden md:flex fixed right-0 top-0 bottom-0 z-30 w-[420px] flex-col"
    :style="{ background: 'var(--ui-bg)', boxShadow: '-4px 0 24px rgba(0,0,0,0.10)', borderLeft: '1px solid var(--ui-border)' }"
  >
    <div class="flex-1 overflow-y-auto px-6 py-6">
      <slot />
    </div>
  </div>
</template>
