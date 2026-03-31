<script setup lang="ts">
const props = defineProps<{
  receipt: Receipt | null
}>()

const open = defineModel<boolean>('open', { default: false })
const toast = useToast()
const uploading = ref(false)
const uploadSuccess = ref(false)
const saving = ref(false)

const emit = defineEmits<{
  updated: []
}>()

const germanMonths = ['Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

function driveFolder(date: string) {
  const d = new Date(date)
  return `${d.getFullYear()}/01-belege/${germanMonths[d.getMonth()]}/`
}

const vatRateOptions = [
  { label: '20% USt', value: 20 },
  { label: '10% USt', value: 10 },
  { label: '0% (netto)', value: 0 }
]

const form = ref({
  bookingDate: '',
  partnerName: '',
  amountEur: '',
  vatRate: 0,
  category: 'Sonstige',
  paymentReference: '',
  excluded: false
})

watch(open, (isOpen) => {
  if (isOpen && props.receipt) {
    uploadSuccess.value = false
    form.value = {
      bookingDate: props.receipt.bookingDate,
      partnerName: props.receipt.partnerName || '',
      amountEur: props.receipt.amountEur,
      vatRate: props.receipt.vatRate,
      category: props.receipt.category,
      paymentReference: props.receipt.paymentReference || '',
      excluded: props.receipt.excluded === 1
    }
  }
})

async function onSave() {
  if (!props.receipt) return
  saving.value = true
  try {
    await $fetch(`/api/receipts/${props.receipt.id}`, {
      method: 'PUT',
      body: {
        bookingDate: form.value.bookingDate,
        partnerName: form.value.partnerName || undefined,
        amountEur: parseFloat(form.value.amountEur),
        vatRate: form.value.vatRate,
        category: form.value.category || undefined,
        paymentReference: form.value.paymentReference || undefined,
        excluded: form.value.excluded
      }
    })
    toast.add({ title: 'Beleg gespeichert', color: 'success' })
    open.value = false
    emit('updated')
  } catch (e: unknown) {
    toast.add({ title: getErrorMessage(e, 'Fehler beim Speichern'), color: 'error' })
  } finally {
    saving.value = false
  }
}

async function uploadPdf(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !props.receipt) return

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    await $fetch(`/api/receipts/${props.receipt.id}/upload`, {
      method: 'POST',
      body: formData
    })
    toast.add({ title: 'PDF erfolgreich auf Google Drive hochgeladen', color: 'success' })
    uploadSuccess.value = true
  } catch (e: unknown) {
    toast.add({ title: getErrorMessage(e, 'Fehler beim Upload'), color: 'error' })
  } finally {
    uploading.value = false
    input.value = ''
  }
}
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <UCard v-if="receipt">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-receipt" class="text-primary size-5" />
            <h3 class="font-semibold">
              Beleg bearbeiten
            </h3>
          </div>
        </template>

        <form class="space-y-4" @submit.prevent="onSave">
          <div class="grid grid-cols-2 gap-3">
            <UFormField label="Datum">
              <UInput
                v-model="form.bookingDate"
                type="date"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Betrag (EUR)">
              <UInput
                v-model="form.amountEur"
                type="number"
                step="0.01"
                class="w-full"
              />
            </UFormField>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <UFormField label="USt-Satz">
              <USelect
                v-model="form.vatRate"
                :items="vatRateOptions"
                value-key="value"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Partner">
              <UInput
                v-model="form.partnerName"
                placeholder="z.B. Amazon, A1, ..."
                class="w-full"
              />
            </UFormField>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <UFormField label="Kategorie">
              <USelect
                v-model="form.category"
                :items="receiptCategories"
                value-key="value"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Referenz">
              <UInput
                v-model="form.paymentReference"
                placeholder="Zahlungsreferenz"
                class="w-full"
              />
            </UFormField>
          </div>

          <label class="flex items-center gap-2 text-sm cursor-pointer">
            <input v-model="form.excluded" type="checkbox" class="rounded">
            <span>Privat (ausschließen)</span>
          </label>

          <div v-if="receipt.partnerIban" class="text-xs text-dimmed">
            IBAN: <span class="font-mono">{{ receipt.partnerIban }}</span>
          </div>

          <div class="border-t border-default pt-4">
            <p class="text-sm font-medium mb-2">
              PDF auf Google Drive hochladen
            </p>
            <div class="flex items-center gap-2">
              <UButton
                :icon="uploadSuccess ? 'i-lucide-check' : 'i-lucide-upload'"
                :label="uploadSuccess ? 'Hochgeladen' : 'PDF auswählen'"
                :loading="uploading"
                :color="uploadSuccess ? 'success' : 'primary'"
                variant="outline"
                type="button"
                @click="($refs.pdfInput as HTMLInputElement).click()"
              />
              <input
                ref="pdfInput"
                type="file"
                accept=".pdf"
                class="hidden"
                @change="uploadPdf"
              >
            </div>
            <p class="text-xs text-dimmed mt-1">
              Wird gespeichert unter: {{ driveFolder(form.bookingDate) }}
            </p>
          </div>

          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="outline"
              label="Abbrechen"
              type="button"
              @click="open = false"
            />
            <UButton
              type="submit"
              icon="i-lucide-save"
              label="Speichern"
              :loading="saving"
            />
          </div>
        </form>

        <template #footer />
      </UCard>
    </template>
  </UModal>
</template>
