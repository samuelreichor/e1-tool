<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const toast = useToast()
const id = route.params.id as string

const { data: invoice, refresh } = useLazyFetch(`/api/invoices/${id}`)

const showDelete = ref(false)
const deleteLoading = ref(false)

const statusOptions = [
  { label: 'Entwurf', value: 'draft' },
  { label: 'Versendet', value: 'sent' },
  { label: 'Bezahlt', value: 'paid' },
  { label: 'Überfällig', value: 'overdue' },
  { label: 'Storniert', value: 'cancelled' }
]

async function changeStatus(status: string) {
  try {
    await $fetch(`/api/invoices/${id}/status`, {
      method: 'PATCH',
      body: { status }
    })
    toast.add({ title: 'Status aktualisiert', color: 'success' })
    refresh()
  } catch (e: unknown) {
    toast.add({ title: getErrorMessage(e, 'Fehler'), color: 'error' })
  }
}

async function downloadPdf() {
  const blob = await $fetch<Blob>(`/api/invoices/${id}/pdf`, {
    responseType: 'blob'
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${invoice.value!.invoiceNumber}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

async function previewPdf() {
  const blob = await $fetch<Blob>(`/api/invoices/${id}/pdf`, {
    responseType: 'blob'
  })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}

async function confirmDelete() {
  deleteLoading.value = true
  try {
    await $fetch(`/api/invoices/${id}`, { method: 'DELETE' })
    toast.add({ title: 'Rechnung gelöscht', color: 'success' })
    router.push('/invoices')
  } catch (e: unknown) {
    toast.add({ title: getErrorMessage(e, 'Fehler beim Löschen'), color: 'error' })
  } finally {
    deleteLoading.value = false
  }
}

function onSaved() {
  refresh()
}
</script>

<template>
  <div v-if="invoice" class="p-4 max-w-4xl mx-auto">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <h2 class="text-lg font-semibold">
          {{ invoice.invoiceNumber }}
        </h2>
        <InvoiceStatusBadge :status="invoice.status" />
      </div>
      <div class="flex items-center gap-2">
        <USelect
          :model-value="invoice.status"
          :items="statusOptions"
          value-key="value"
          size="sm"
          @update:model-value="changeStatus"
        />
        <UButton
          icon="i-lucide-eye"
          label="Vorschau"
          variant="outline"
          size="sm"
          @click="previewPdf"
        />
        <UButton
          icon="i-lucide-download"
          label="PDF"
          variant="outline"
          size="sm"
          @click="downloadPdf"
        />
        <UButton
          v-if="invoice.status === 'draft'"
          icon="i-lucide-trash-2"
          label="Löschen"
          variant="outline"
          color="error"
          size="sm"
          @click="showDelete = true"
        />
      </div>
    </div>

    <InvoiceForm :invoice="invoice" @saved="onSaved" />

    <DeleteConfirmModal
      v-model:open="showDelete"
      title="Rechnung löschen"
      :description="`Möchten Sie die Rechnung '${invoice.invoiceNumber}' wirklich löschen?`"
      :loading="deleteLoading"
      @confirm="confirmDelete"
    />
  </div>
</template>
