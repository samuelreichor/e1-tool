<script setup lang="ts">
const germanMonths = ['Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

function driveFolder(date: string) {
  const d = new Date(date)
  return `${d.getFullYear()}/01-belege/${germanMonths[d.getMonth()]}/`
}

const open = defineModel<boolean>('open', { default: false })
const toast = useToast()
const loading = ref(false)
const uploading = ref(false)
const uploadSuccess = ref(false)
const pdfFile = ref<File | null>(null)

const emit = defineEmits<{
  created: []
}>()

const form = ref({
  bookingDate: new Date().toISOString().slice(0, 10),
  partnerName: '',
  amountEur: '',
  vatRate: 0,
  category: 'Sonstige',
  paymentReference: ''
})

const vatRateOptions = [
  { label: '20% USt', value: 20 },
  { label: '10% USt', value: 10 },
  { label: '0% (netto)', value: 0 }
]

watch(open, (isOpen) => {
  if (isOpen) {
    form.value = {
      bookingDate: new Date().toISOString().slice(0, 10),
      partnerName: '',
      amountEur: '',
      vatRate: 0,
      category: 'Sonstige',
      paymentReference: ''
    }
    pdfFile.value = null
    uploadSuccess.value = false
  }
})

function onFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  pdfFile.value = input.files?.[0] || null
}

async function onSubmit() {
  loading.value = true
  try {
    const receipt = await $fetch<{ id: number }>('/api/receipts', {
      method: 'POST',
      body: {
        bookingDate: form.value.bookingDate,
        partnerName: form.value.partnerName || undefined,
        amountEur: parseFloat(form.value.amountEur),
        vatRate: form.value.vatRate,
        category: form.value.category || undefined,
        paymentReference: form.value.paymentReference || undefined
      }
    })

    if (pdfFile.value) {
      uploading.value = true
      try {
        const formData = new FormData()
        formData.append('file', pdfFile.value)
        await $fetch(`/api/receipts/${receipt.id}/upload`, {
          method: 'POST',
          body: formData
        })
        toast.add({ title: 'Beleg angelegt & PDF hochgeladen', color: 'success' })
      } catch {
        toast.add({ title: 'Beleg angelegt, aber PDF-Upload fehlgeschlagen', color: 'warning' })
      } finally {
        uploading.value = false
      }
    } else {
      toast.add({ title: 'Beleg angelegt', color: 'success' })
    }

    open.value = false
    emit('created')
  } catch (e: unknown) {
    toast.add({ title: getErrorMessage(e, 'Fehler beim Anlegen'), color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-plus" class="text-primary size-5" />
            <h3 class="font-semibold">
              Beleg anlegen
            </h3>
          </div>
        </template>

        <form class="space-y-4" @submit.prevent="onSubmit">
          <UFormField label="Datum" required>
            <UInput
              v-model="form.bookingDate"
              type="date"
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

          <div class="grid grid-cols-2 gap-3">
            <UFormField label="Betrag (EUR)" required>
              <UInput
                v-model="form.amountEur"
                type="number"
                step="0.01"
                placeholder="-49.99"
                class="w-full"
              />
            </UFormField>

            <UFormField label="USt-Satz">
              <USelect
                v-model="form.vatRate"
                :items="vatRateOptions"
                value-key="value"
                class="w-full"
              />
            </UFormField>
          </div>

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

          <div class="border-t border-default pt-4">
            <p class="text-sm font-medium mb-2">
              PDF-Beleg (optional)
            </p>
            <div class="flex items-center gap-2">
              <UButton
                :icon="pdfFile ? 'i-lucide-check' : 'i-lucide-upload'"
                :label="pdfFile ? pdfFile.name : 'PDF auswählen'"
                :color="pdfFile ? 'success' : 'primary'"
                variant="outline"
                type="button"
                @click="($refs.pdfInput as HTMLInputElement).click()"
              />
              <UButton
                v-if="pdfFile"
                icon="i-lucide-x"
                variant="ghost"
                color="neutral"
                size="xs"
                type="button"
                @click="pdfFile = null"
              />
              <input
                ref="pdfInput"
                type="file"
                accept=".pdf"
                class="hidden"
                @change="onFileSelect"
              >
            </div>
            <p v-if="form.bookingDate" class="text-xs text-dimmed mt-1">
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
              icon="i-lucide-plus"
              label="Anlegen"
              :loading="loading || uploading"
            />
          </div>
        </form>

        <template #footer />
      </UCard>
    </template>
  </UModal>
</template>
