<script setup lang="ts">
const toast = useToast()
const search = ref('')
const showForm = ref(false)
const showDelete = ref(false)
const deleteLoading = ref(false)
const deleteClient = ref<AppClient | null>(null)

const { data: clients, refresh } = useLazyFetch('/api/clients', {
  query: { search }
})

const columns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'email', header: 'E-Mail' },
  { accessorKey: 'city', header: 'Ort' },
  { accessorKey: 'hourlyRate', header: 'Stundensatz' },
  { accessorKey: 'taxId', header: 'UID' },
  { accessorKey: 'actions', header: '' }
]

function formatCurrency(value: string | null) {
  if (!value) return '-'
  const num = parseFloat(value)
  return num.toLocaleString('de-AT', { style: 'currency', currency: 'EUR' })
}

function openCreate() {
  showForm.value = true
}

function openDelete(client: AppClient) {
  deleteClient.value = client
  showDelete.value = true
}

async function confirmDelete() {
  if (!deleteClient.value) return
  deleteLoading.value = true
  try {
    await $fetch(`/api/clients/${deleteClient.value.id}`, { method: 'DELETE' })
    toast.add({ title: 'Kunde gelöscht', color: 'success' })
    showDelete.value = false
    refresh()
  } catch (e: unknown) {
    toast.add({ title: getErrorMessage(e, 'Fehler beim Löschen'), color: 'error' })
  } finally {
    deleteLoading.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 p-4">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Kunden suchen..."
        class="w-full sm:max-w-xs"
      />
      <UButton
        icon="i-lucide-plus"
        label="Neuer Kunde"
        class="w-full sm:w-auto"
        @click="openCreate"
      />
    </div>

    <div class="overflow-x-auto">
      <UTable :data="clients || []" :columns="columns" class="w-full">
        <template #name-cell="{ row }">
          <NuxtLink :to="`/clients/${row.original.id}`" class="text-primary hover:underline font-medium">
            {{ row.original.name }}
          </NuxtLink>
        </template>
        <template #hourlyRate-cell="{ row }">
          <span class="tabular-nums">{{ formatCurrency(row.original.hourlyRate) }}</span>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex justify-end gap-1">
            <UButton
              icon="i-lucide-pencil"
              variant="ghost"
              color="neutral"
              size="xs"
              :to="`/clients/${row.original.id}`"
            />
            <UButton
              icon="i-lucide-trash-2"
              variant="ghost"
              color="error"
              size="xs"
              @click="openDelete(row.original)"
            />
          </div>
        </template>
        <template #empty>
          <div class="flex flex-col items-center justify-center py-12 gap-2">
            <UIcon name="i-lucide-users" class="size-10 text-dimmed" />
            <p class="text-dimmed">
              Keine Kunden vorhanden
            </p>
            <UButton variant="outline" label="Ersten Kunden erstellen" @click="openCreate" />
          </div>
        </template>
      </UTable>
    </div>

    <ClientFormModal v-model:open="showForm" @saved="refresh" />
    <DeleteConfirmModal
      v-model:open="showDelete"
      title="Kunde löschen"
      :description="`Möchten Sie den Kunden '${deleteClient?.name}' wirklich löschen?`"
      :loading="deleteLoading"
      @confirm="confirmDelete"
    />
  </div>
</template>
