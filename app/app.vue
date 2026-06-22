<template>
  <UApp class="overflow-x-hidden">
    <Head>
      <Link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    </Head>
    <NuxtPage />
    <ClientOnly><SiteDisclaimerBanner /></ClientOnly>
    <ClientOnly><HandleClaimModal /></ClientOnly>
    <ClientOnly><PwaInstallPrompt /></ClientOnly>
    <MobileTabBar />
  </UApp>
</template>

<script setup lang="ts">
import { useFontSize }   from '~/composables/useFontSize'
import { useFontScheme } from '~/composables/useFontScheme'
const { load: loadFontSize   } = useFontSize()
const { load: loadFontScheme } = useFontScheme()
onMounted(() => { loadFontSize(); loadFontScheme() })
</script>
