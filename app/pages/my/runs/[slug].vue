<template>
  <RunWizard mode="edit" :slug="slug" />
</template>

<script setup lang="ts">
definePageMeta({ ssr: false })
const slug = useRoute().params.slug as string
</script>
