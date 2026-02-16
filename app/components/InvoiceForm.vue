<script setup lang="ts">
const props = defineProps<{
  invoice?: InvoiceDetail
}>()

const emit = defineEmits<{
  saved: [invoice: Invoice]
}>()

const toast = useToast()
const loading = ref(false)

const { data: clientsList } = useLazyFetch('/api/clients')

const clientOptions = computed(() =>
  (clientsList.value || []).map(c => ({
    label: c.name,
    value: String(c.id)
  }))
)

const selectedClient = computed(() =>
  (clientsList.value || []).find(c => String(c.id) === clientId.value)
)

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return toDateStr(d)
}

const clientId = ref(props.invoice?.clientId ? String(props.invoice.clientId) : '')
const issueDate = ref(props.invoice?.issueDate || toDateStr(new Date()))
const dueDate = ref(props.invoice?.dueDate || addDays(issueDate.value, 14))
function firstOfMonth() {
  const d = new Date()
  return toDateStr(new Date(d.getFullYear(), d.getMonth(), 1))
}
function lastOfMonth() {
  const d = new Date()
  return toDateStr(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}

const serviceDateFrom = ref(props.invoice?.serviceDateFrom || firstOfMonth())
const serviceDateTo = ref(props.invoice?.serviceDateTo || lastOfMonth())
const reverseCharge = ref(props.invoice?.reverseCharge === 1)
const paymentTerms = ref(props.invoice?.paymentTerms || 'Bitte überweisen sie den Gesamtbetrag innerhalb von 14 Tagen.')
const notes = ref(props.invoice?.notes || '')

// Auto-update due date when issue date changes (only if not editing)
if (!props.invoice) {
  watch(issueDate, (val) => {
    if (val) {
      dueDate.value = addDays(val, 14)
    }
  })

  // Set default unit price from client's hourly rate when client changes
  watch(clientId, () => {
    const client = selectedClient.value
    if (client?.hourlyRate) {
      const rate = parseFloat(client.hourlyRate)
      items.value.forEach((item) => {
        if (item.unitPrice === 0) {
          item.unitPrice = rate
        }
      })
    }
  })
}

// Auto-set all VAT rates to 0% when reverse charge is enabled
const _prevVatRates = ref<number[]>([])
watch(reverseCharge, (enabled) => {
  if (enabled) {
    _prevVatRates.value = items.value.map(i => i.vatRate)
    items.value.forEach((i) => {
      i.vatRate = 0
    })
  } else {
    items.value.forEach((i, idx) => {
      i.vatRate = _prevVatRates.value[idx] ?? 20
    })
  }
})

const items = ref<LineItem[]>(
  props.invoice?.items?.length
    ? props.invoice.items.map(i => ({
        description: i.description,
        quantity: parseFloat(i.quantity || '1'),
        unitPrice: parseFloat(i.unitPrice || '0'),
        vatRate: parseFloat(i.vatRate || '20')
      }))
    : [{ description: '', quantity: 1, unitPrice: 0, vatRate: 20 }]
)

const netTotal = computed(() =>
  items.value.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)
)

const vatTotal = computed(() =>
  items.value.reduce((sum, i) => sum + i.quantity * i.unitPrice * (i.vatRate / 100), 0)
)

const grossTotal = computed(() => netTotal.value + vatTotal.value)

function formatCurrency(value: number) {
  return value.toLocaleString('de-AT', { style: 'currency', currency: 'EUR' })
}

async function onSubmit() {
  if (!clientId.value) {
    toast.add({ title: 'Bitte wählen Sie einen Kunden', color: 'error' })
    return
  }

  if (items.value.some(i => !i.description)) {
    toast.add({ title: 'Alle Positionen benötigen eine Beschreibung', color: 'error' })
    return
  }

  loading.value = true
  try {
    const body = {
      clientId: Number(clientId.value),
      issueDate: issueDate.value || undefined,
      dueDate: dueDate.value || undefined,
      serviceDateFrom: serviceDateFrom.value || undefined,
      serviceDateTo: serviceDateTo.value || undefined,
      reverseCharge: reverseCharge.value,
      paymentTerms: paymentTerms.value || undefined,
      notes: notes.value || undefined,
      items: items.value.map((i, idx) => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        vatRate: i.vatRate,
        sortOrder: idx
      }))
    }

    let result: Invoice
    if (props.invoice) {
      result = await $fetch(`/api/invoices/${props.invoice.id}`, {
        method: 'PUT',
        body
      })
      toast.add({ title: 'Rechnung aktualisiert', color: 'success' })
    } else {
      result = await $fetch('/api/invoices', {
        method: 'POST',
        body
      })
      toast.add({ title: 'Rechnung erstellt', color: 'success' })
    }
    emit('saved', result)
  } catch (e: unknown) {
    toast.add({ title: getErrorMessage(e, 'Fehler beim Speichern'), color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form class="flex flex-col gap-6" @submit.prevent="onSubmit">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <UFormField label="Kunde" required>
        <USelect
          v-model="clientId"
          :items="clientOptions"
          value-key="value"
          placeholder="Kunde auswählen"
          class="w-full"
        />
      </UFormField>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <UFormField label="Rechnungsdatum">
        <UInput v-model="issueDate" type="date" class="w-full" />
      </UFormField>
      <UFormField label="Fälligkeitsdatum">
        <UInput v-model="dueDate" type="date" class="w-full" />
      </UFormField>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <UFormField label="Leistungszeitraum von">
        <UInput v-model="serviceDateFrom" type="date" class="w-full" />
      </UFormField>
      <UFormField label="Leistungszeitraum bis">
        <UInput v-model="serviceDateTo" type="date" class="w-full" />
      </UFormField>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <UFormField label="Zahlungsbedingungen">
        <UInput v-model="paymentTerms" placeholder="z.B. Zahlbar innerhalb von 14 Tagen ohne Abzug." class="w-full" />
      </UFormField>
      <UFormField label="Reverse Charge">
        <UCheckbox v-model="reverseCharge" label="Steuerschuldnerschaft des Leistungsempfängers" />
      </UFormField>
    </div>

    <USeparator />

    <div>
      <h3 class="font-semibold mb-3">
        Positionen
      </h3>
      <InvoiceLineItems v-model:items="items" :default-unit-price="selectedClient?.hourlyRate ? parseFloat(selectedClient.hourlyRate) : undefined" />
    </div>

    <USeparator />

    <div class="flex justify-end">
      <div class="w-full sm:w-64 flex flex-col gap-1 text-sm">
        <div class="flex justify-between">
          <span class="text-muted">Netto</span>
          <span class="tabular-nums">{{ formatCurrency(netTotal) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">USt</span>
          <span class="tabular-nums">{{ formatCurrency(vatTotal) }}</span>
        </div>
        <USeparator />
        <div class="flex justify-between font-semibold">
          <span>Brutto</span>
          <span class="tabular-nums">{{ formatCurrency(grossTotal) }}</span>
        </div>
      </div>
    </div>

    <UFormField label="Anmerkungen">
      <UTextarea v-model="notes" placeholder="Optionale Anmerkungen..." class="w-full" />
    </UFormField>

    <div class="flex justify-end gap-2">
      <UButton
        variant="outline"
        color="neutral"
        label="Abbrechen"
        to="/invoices"
      />
      <UButton type="submit" :label="invoice ? 'Speichern' : 'Erstellen'" :loading="loading" />
    </div>
  </form>
</template>
