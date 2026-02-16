<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const toast = useToast()
const id = route.params.id as string

const { data: invoice, refresh } = useLazyFetch(`/api/invoices/${id}`)
const { data: businessSettings } = useLazyFetch('/api/settings/business')
const { data: emailLogs, refresh: refreshEmails } = useLazyFetch(`/api/invoices/${id}/emails`)

const showDelete = ref(false)
const deleteLoading = ref(false)
const showSend = ref(false)

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

function onSent() {
  refresh()
  refreshEmails()
}

const templateLabels: Record<string, string> = {
  friendly: 'Freundlich',
  formal: 'Formell',
  reminder: 'Zahlungserinnerung'
}

function templateLabel(key: string) {
  return templateLabels[key] || key
}
</script>

<template>
  <div v-if="invoice" class="p-4 max-w-4xl mx-auto">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <div class="flex items-center gap-3">
        <h2 class="text-lg font-semibold">
          {{ invoice.invoiceNumber }}
        </h2>
        <InvoiceStatusBadge :status="invoice.status" />
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <USelect
          :model-value="invoice.status"
          :items="statusOptions"
          value-key="value"
          size="sm"
          @update:model-value="changeStatus"
        />
        <UButton
          icon="i-lucide-eye"
          variant="outline"
          size="sm"
          @click="previewPdf"
        >
          <span class="hidden sm:inline">Vorschau</span>
        </UButton>
        <UButton
          icon="i-lucide-download"
          variant="outline"
          size="sm"
          @click="downloadPdf"
        >
          <span class="hidden sm:inline">PDF</span>
        </UButton>
        <UButton
          icon="i-lucide-send"
          variant="outline"
          size="sm"
          @click="showSend = true"
        >
          <span class="hidden sm:inline">Senden</span>
        </UButton>
        <UButton
          v-if="invoice.status === 'draft'"
          icon="i-lucide-trash-2"
          variant="outline"
          color="error"
          size="sm"
          @click="showDelete = true"
        >
          <span class="hidden sm:inline">Löschen</span>
        </UButton>
      </div>
    </div>

    <InvoiceForm :invoice="invoice" @saved="onSaved" />

    <!-- Email Log -->
    <div v-if="emailLogs?.length" class="mt-6">
      <h3 class="text-sm font-semibold mb-2">
        E-Mail-Verlauf
      </h3>
      <div class="space-y-2">
        <div
          v-for="log in emailLogs"
          :key="log.id"
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm p-2 rounded border border-default gap-1"
        >
          <div class="flex items-center gap-2">
            <UIcon
              :name="log.status === 'sent' ? 'i-lucide-check-circle' : 'i-lucide-x-circle'"
              :class="log.status === 'sent' ? 'text-success' : 'text-error'"
              class="size-4"
            />
            <span>{{ log.recipient }}</span>
            <UBadge
              v-if="log.templateKey"
              :label="templateLabel(log.templateKey)"
              variant="subtle"
              size="sm"
            />
          </div>
          <div class="flex items-center gap-2">
            <span class="text-muted text-xs">{{ log.subject }}</span>
            <span class="text-muted text-xs">{{ new Date(log.sentAt).toLocaleString('de-AT') }}</span>
          </div>
        </div>
      </div>
    </div>

    <DeleteConfirmModal
      v-model:open="showDelete"
      title="Rechnung löschen"
      :description="`Möchten Sie die Rechnung '${invoice.invoiceNumber}' wirklich löschen?`"
      :loading="deleteLoading"
      @confirm="confirmDelete"
    />

    <SendInvoiceModal
      v-model:open="showSend"
      :invoice-id="invoice.id"
      :invoice-number="invoice.invoiceNumber"
      :client-email="invoice.client?.email || null"
      :company-name="businessSettings?.companyName || null"
      :issue-date="invoice.issueDate || null"
      @sent="onSent"
    />
  </div>
</template>
