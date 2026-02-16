<script setup lang="ts">
const props = defineProps<{
  status: string
}>()

const config = computed(() => {
  switch (props.status) {
    case 'draft': return { label: 'Entwurf', color: 'neutral' as const }
    case 'sent': return { label: 'Versendet', color: 'info' as const }
    case 'paid': return { label: 'Bezahlt', color: 'success' as const }
    case 'overdue': return { label: 'Überfällig', color: 'warning' as const }
    case 'cancelled': return { label: 'Storniert', color: 'error' as const }
    default: return { label: props.status, color: 'neutral' as const }
  }
})
</script>

<template>
  <UBadge :color="config.color" variant="subtle" :label="config.label" />
</template>
