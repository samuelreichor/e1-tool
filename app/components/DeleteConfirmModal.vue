<script setup lang="ts">
const props = defineProps<{
  title?: string
  description?: string
  loading?: boolean
}>()

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  confirm: []
}>()
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-triangle-alert" class="text-error size-5" />
            <h3 class="font-semibold">
              {{ props.title || 'Löschen bestätigen' }}
            </h3>
          </div>
        </template>

        <p class="text-muted">
          {{ props.description || 'Möchten Sie diesen Eintrag wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.' }}
        </p>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="outline"
              label="Abbrechen"
              @click="open = false"
            />
            <UButton
              color="error"
              label="Löschen"
              :loading="props.loading"
              @click="emit('confirm')"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
