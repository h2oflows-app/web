<template>
  <!-- Global mount point for the "+" create menu: the chooser, plus the
       unified create sheet (web#354 W1 — absorbs the deleted
       PlanCreateSheet) it (and CalendarDaySheet's day-scoped "+ New") can
       open. -->
  <CreateChooserSheet />
  <PlanRunLogSheet />
</template>

<script setup lang="ts">
</script>
