<script setup lang="ts">
const toast = useToast()
const statusFilter = ref<string>('all')
const showDelete = ref(false)
const deleteLoading = ref(false)
const deleteInvoice = ref<InvoiceListItem | null>(null)

const { data: invoicesList, refresh } = useLazyFetch('/api/invoices', {
  query: computed(() => statusFilter.value !== 'all' ? { status: statusFilter.value } : {})
})

const statusOptions = [
  { label: 'Alle', value: 'all' },
  { label: 'Entwurf', value: 'draft' },
  { label: 'Versendet', value: 'sent' },
  { label: 'Bezahlt', value: 'paid' },
  { label: 'Überfällig', value: 'overdue' },
  { label: 'Storniert', value: 'cancelled' }
]

const columns = [
  { accessorKey: 'invoiceNumber', header: 'Nr.' },
  { accessorKey: 'clientName', header: 'Kunde' },
  { accessorKey: 'issueDate', header: 'Datum' },
  { accessorKey: 'grossTotal', header: 'Betrag' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'actions', header: '' }
]

function formatCurrency(value: string | null) {
  const num = parseFloat(value || '0')
  return num.toLocaleString('de-AT', { style: 'currency', currency: 'EUR' })
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('de-AT')
}

function openDelete(invoice: InvoiceListItem) {
  deleteInvoice.value = invoice
  showDelete.value = true
}

async function confirmDelete() {
  if (!deleteInvoice.value) return
  deleteLoading.value = true
  try {
    await $fetch(`/api/invoices/${deleteInvoice.value.id}`, { method: 'DELETE' })
    toast.add({ title: 'Rechnung gelöscht', color: 'success' })
    showDelete.value = false
    refresh()
  } catch (e: unknown) {
    toast.add({ title: getErrorMessage(e, 'Fehler beim Löschen'), color: 'error' })
  } finally {
    deleteLoading.value = false
  }
}

async function downloadPdf(invoice: InvoiceListItem) {
  const blob = await $fetch<Blob>(`/api/invoices/${invoice.id}/pdf`, {
    responseType: 'blob'
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${invoice.invoiceNumber}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

async function previewPdf(invoice: InvoiceListItem) {
  const blob = await $fetch<Blob>(`/api/invoices/${invoice.id}/pdf`, {
    responseType: 'blob'
  })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}
</script>

<template>
  <div class="flex flex-col gap-4 p-4">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <USelect
        v-model="statusFilter"
        :items="statusOptions"
        value-key="value"
        placeholder="Status filtern"
        class="w-full sm:w-48"
      />
      <UButton icon="i-lucide-plus" label="Neue Rechnung" to="/invoices/new" class="w-full sm:w-auto" />
    </div>

    <div class="overflow-x-auto">
    <UTable :data="invoicesList || []" :columns="columns" class="w-full">
      <template #invoiceNumber-cell="{ row }">
        <NuxtLink :to="`/invoices/${row.original.id}`" class="text-primary hover:underline font-medium">
          {{ row.original.invoiceNumber }}
        </NuxtLink>
      </template>
      <template #issueDate-cell="{ row }">
        {{ formatDate(row.original.issueDate) }}
      </template>
      <template #grossTotal-cell="{ row }">
        <span class="tabular-nums">{{ formatCurrency(row.original.grossTotal) }}</span>
      </template>
      <template #status-cell="{ row }">
        <InvoiceStatusBadge :status="row.original.status" />
      </template>
      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-1">
          <UButton
            icon="i-lucide-eye"
            variant="ghost"
            color="neutral"
            size="xs"
            @click="previewPdf(row.original)"
          />
          <UButton
            icon="i-lucide-download"
            variant="ghost"
            color="neutral"
            size="xs"
            @click="downloadPdf(row.original)"
          />
          <UButton
            icon="i-lucide-pencil"
            variant="ghost"
            color="neutral"
            size="xs"
            :to="`/invoices/${row.original.id}`"
          />
          <UButton
            v-if="row.original.status === 'draft'"
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
          <UIcon name="i-lucide-file-text" class="size-10 text-dimmed" />
          <p class="text-dimmed">
            Keine Rechnungen vorhanden
          </p>
          <UButton variant="outline" label="Erste Rechnung erstellen" to="/invoices/new" />
        </div>
      </template>
    </UTable>
    </div>

    <DeleteConfirmModal
      v-model:open="showDelete"
      title="Rechnung löschen"
      :description="`Möchten Sie die Rechnung '${deleteInvoice?.invoiceNumber}' wirklich löschen?`"
      :loading="deleteLoading"
      @confirm="confirmDelete"
    />
  </div>
</template>
