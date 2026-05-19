<template>
  <UApp class="overflow-x-hidden">
    <Head>
      <Link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    </Head>
    <NuxtPage />
    <ClientOnly><SiteDisclaimerBanner /></ClientOnly>
    <MobileTabBar />
  </UApp>
</template>

<script setup lang="ts">
import { useFontSize } from '~/composables/useFontSize'
const { load } = useFontSize()
onMounted(load)
</script>
