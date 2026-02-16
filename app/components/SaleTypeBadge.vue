<script setup lang="ts">
const props = defineProps<{
  renewal: number
}>()

const config = computed(() => {
  return props.renewal
    ? { label: 'Renewal', color: 'success' as const }
    : { label: 'License', color: 'info' as const }
})
</script>

<template>
  <UBadge :color="config.color" variant="subtle" :label="config.label" />
</template>
