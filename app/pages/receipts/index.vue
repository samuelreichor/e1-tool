<script setup lang="ts">
const toast = useToast()
const currentYear = new Date().getFullYear()
const year = ref(currentYear)
const uploading = ref(false)
const exporting = ref(false)
const showDelete = ref(false)
const deleteLoading = ref(false)
const deleteReceipt = ref<Receipt | null>(null)
const showCreate = ref(false)
const showDetail = ref(false)
const detailReceipt = ref<Receipt | null>(null)

// Category popover state
const categoryPopoverOpen = ref<number | null>(null)
const categoryInput = ref('')
const categoryExcluded = ref(false)
const categoryLoading = ref(false)

const month = ref(0)
const categoryFilter = ref('all')

const yearOptions = Array.from({ length: 5 }, (_, i) => {
  const y = currentYear - i
  return { label: String(y), value: y }
})

const monthOptions = [
  { label: 'Alle Monate', value: 0 },
  { label: 'Jänner', value: 1 },
  { label: 'Februar', value: 2 },
  { label: 'März', value: 3 },
  { label: 'April', value: 4 },
  { label: 'Mai', value: 5 },
  { label: 'Juni', value: 6 },
  { label: 'Juli', value: 7 },
  { label: 'August', value: 8 },
  { label: 'September', value: 9 },
  { label: 'Oktober', value: 10 },
  { label: 'November', value: 11 },
  { label: 'Dezember', value: 12 }
]

const { data: receiptsRaw, refresh } = useLazyFetch<Receipt[]>('/api/receipts', {
  query: computed(() => ({ year: year.value }))
})

const receipts = computed(() => {
  if (!receiptsRaw.value) return []
  return receiptsRaw.value.filter((r) => {
    if (month.value > 0) {
      const m = new Date(r.bookingDate).getMonth() + 1
      if (m !== month.value) return false
    }
    if (categoryFilter.value !== 'all' && r.category !== categoryFilter.value) return false
    return true
  })
})

const activeCategoryOptions = computed(() => {
  if (!receiptsRaw.value) return []
  const cats = new Set(receiptsRaw.value.map(r => r.category))
  return [
    { label: 'Alle Kategorien', value: 'all' },
    ...Array.from(cats).sort().map(c => ({ label: c, value: c }))
  ]
})

const { data: categories, refresh: refreshCategories } = useLazyFetch<IbanCategory[]>('/api/iban-categories')

const categoryByIban = computed(() => {
  const map = new Map<string, IbanCategory>()
  if (categories.value) {
    for (const c of categories.value) {
      if (c.matchType !== 'partner_name') map.set(c.iban, c)
    }
  }
  return map
})

const categoryByName = computed(() => {
  const map = new Map<string, IbanCategory>()
  if (categories.value) {
    for (const c of categories.value) {
      if (c.matchType === 'partner_name') map.set(c.iban, c)
    }
  }
  return map
})

function findCategory(receipt: Receipt) {
  if (receipt.partnerIban) {
    const c = categoryByIban.value.get(receipt.partnerIban)
    if (c) return c
  }
  if (receipt.partnerName) {
    return categoryByName.value.get(receipt.partnerName)
  }
  return undefined
}

const columns = [
  { accessorKey: 'bookingDate', header: 'Datum' },
  { accessorKey: 'partnerName', header: 'Partner' },
  { accessorKey: 'category', header: 'Kategorie' },
  { accessorKey: 'paymentReference', header: 'Referenz' },
  { accessorKey: 'amountEur', header: 'Betrag' },
  { accessorKey: 'actions', header: '' }
]

const summary = computed(() => {
  let einnahmen = 0
  let ausgaben = 0
  for (const r of receipts.value) {
    if (r.excluded) continue
    const amount = parseFloat(r.amountEur)
    if (amount > 0) einnahmen += amount
    else ausgaben += amount
  }
  return { einnahmen, ausgaben, saldo: einnahmen + ausgaben }
})

function formatCurrency(value: number | string) {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return num.toLocaleString('de-AT', { style: 'currency', currency: 'EUR' })
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('de-AT')
}

async function uploadCsv(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    const result = await $fetch<{ imported: number, skipped: number, total: number }>('/api/receipts/import', {
      method: 'POST',
      body: formData
    })
    toast.add({
      title: `${result.imported} von ${result.total} Belegen importiert`,
      description: result.skipped > 0 ? `${result.skipped} Duplikate übersprungen` : undefined,
      color: 'success'
    })
    refresh()
  } catch (e: unknown) {
    toast.add({ title: getErrorMessage(e, 'Fehler beim Import'), color: 'error' })
  } finally {
    uploading.value = false
    input.value = ''
  }
}

async function exportExcel() {
  exporting.value = true
  try {
    const blob = await $fetch<Blob>(`/api/receipts/export`, {
      query: { year: year.value },
      responseType: 'blob'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `EA-Rechnung-${year.value}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e: unknown) {
    toast.add({ title: getErrorMessage(e, 'Fehler beim Export'), color: 'error' })
  } finally {
    exporting.value = false
  }
}

function openCategoryPopover(receipt: Receipt) {
  if (!receipt.partnerIban && !receipt.partnerName) return
  categoryPopoverOpen.value = receipt.id
  const existing = findCategory(receipt)
  categoryInput.value = existing?.name || receipt.category
  categoryExcluded.value = existing?.excluded === 1
}

async function saveCategory(receipt: Receipt) {
  const matchKey = receipt.partnerIban || receipt.partnerName
  if (!matchKey || !categoryInput.value.trim()) return
  const matchType = receipt.partnerIban ? 'iban' : 'partner_name'
  categoryLoading.value = true
  try {
    await $fetch('/api/iban-categories', {
      method: 'POST',
      body: { iban: matchKey, name: categoryInput.value.trim(), excluded: categoryExcluded.value, matchType }
    })
    toast.add({ title: 'Kategorie gespeichert', color: 'success' })
    categoryPopoverOpen.value = null
    refresh()
    refreshCategories()
  } catch (e: unknown) {
    toast.add({ title: getErrorMessage(e, 'Fehler beim Speichern'), color: 'error' })
  } finally {
    categoryLoading.value = false
  }
}

function openDelete(receipt: Receipt) {
  deleteReceipt.value = receipt
  showDelete.value = true
}

async function confirmDelete() {
  if (!deleteReceipt.value) return
  deleteLoading.value = true
  try {
    await $fetch(`/api/receipts/${deleteReceipt.value.id}`, { method: 'DELETE' })
    toast.add({ title: 'Beleg gelöscht', color: 'success' })
    showDelete.value = false
    refresh()
  } catch (e: unknown) {
    toast.add({ title: getErrorMessage(e, 'Fehler beim Löschen'), color: 'error' })
  } finally {
    deleteLoading.value = false
  }
}

function openDetail(receipt: Receipt) {
  detailReceipt.value = receipt
  showDetail.value = true
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Actions -->
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <UButton
          icon="i-lucide-plus"
          class="sm:hidden"
          @click="showCreate = true"
        />
        <UButton
          icon="i-lucide-plus"
          label="Beleg anlegen"
          class="hidden sm:flex"
          @click="showCreate = true"
        />
        <UButton
          icon="i-lucide-upload"
          variant="outline"
          :loading="uploading"
          class="sm:hidden"
          @click="($refs.fileInput as HTMLInputElement).click()"
        />
        <UButton
          icon="i-lucide-upload"
          label="CSV Import"
          variant="outline"
          :loading="uploading"
          class="hidden sm:flex"
          @click="($refs.fileInput as HTMLInputElement).click()"
        />
        <input
          ref="fileInput"
          type="file"
          accept=".csv"
          class="hidden"
          @change="uploadCsv"
        >
        <UButton
          icon="i-lucide-download"
          variant="outline"
          :loading="exporting"
          class="sm:hidden"
          @click="exportExcel"
        />
        <UButton
          icon="i-lucide-download"
          label="Excel Export"
          variant="outline"
          :loading="exporting"
          class="hidden sm:flex"
          @click="exportExcel"
        />
      </div>
      <USelect
        v-model="year"
        :items="yearOptions"
        value-key="value"
        class="w-28"
      />
    </div>

    <!-- Filter -->
    <div class="grid grid-cols-2 sm:flex sm:items-center gap-2">
      <USelect
        v-model="month"
        :items="monthOptions"
        value-key="value"
        class="sm:w-36"
      />
      <USelect
        v-model="categoryFilter"
        :items="activeCategoryOptions"
        value-key="value"
        class="sm:w-44"
      />
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
      <div class="rounded-lg border border-default p-4">
        <p class="text-sm text-dimmed">
          Einnahmen
        </p>
        <p class="text-base sm:text-2xl font-semibold tabular-nums text-green-500">
          {{ formatCurrency(summary.einnahmen) }}
        </p>
      </div>
      <div class="rounded-lg border border-default p-4">
        <p class="text-sm text-dimmed">
          Ausgaben
        </p>
        <p class="text-base sm:text-2xl font-semibold tabular-nums text-red-500">
          {{ formatCurrency(summary.ausgaben) }}
        </p>
      </div>
      <div class="rounded-lg border border-default p-4">
        <p class="text-sm text-dimmed">
          Saldo
        </p>
        <p class="text-base sm:text-2xl font-semibold tabular-nums" :class="summary.saldo >= 0 ? 'text-green-500' : 'text-red-500'">
          {{ formatCurrency(summary.saldo) }}
        </p>
      </div>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
      <UTable :data="receipts || []" :columns="columns" class="w-full">
        <template #bookingDate-cell="{ row }">
          <span class="cursor-pointer" :class="{ 'opacity-40': row.original.excluded }" @click="openDetail(row.original)">{{ formatDate(row.original.bookingDate) }}</span>
        </template>
        <template #partnerName-cell="{ row }">
          <span class="font-medium cursor-pointer" :class="{ 'opacity-40': row.original.excluded }" @click="openDetail(row.original)">{{ row.original.partnerName || '-' }}</span>
        </template>
        <template #category-cell="{ row }">
          <UPopover v-if="row.original.partnerIban || row.original.partnerName" :open="categoryPopoverOpen === row.original.id" @update:open="(val: boolean) => { if (!val) categoryPopoverOpen = null }">
            <UBadge
              :color="row.original.excluded ? 'warning' : row.original.category === 'Sonstige' ? 'neutral' : 'primary'"
              variant="subtle"
              :label="row.original.excluded ? `${row.original.category} (Privat)` : row.original.category"
              class="cursor-pointer"
              @click="openCategoryPopover(row.original)"
            />
            <template #content>
              <div class="p-3 flex flex-col gap-2 w-64">
                <p class="text-xs text-dimmed truncate">
                  {{ row.original.partnerIban || row.original.partnerName }}
                </p>
                <USelect
                  v-model="categoryInput"
                  :items="receiptCategories"
                  value-key="value"
                  size="sm"
                  class="w-full"
                />
                <label class="flex items-center gap-2 text-sm cursor-pointer">
                  <input v-model="categoryExcluded" type="checkbox" class="rounded">
                  <span>Privat (ausschließen)</span>
                </label>
                <div class="flex justify-end gap-1">
                  <UButton
                    size="xs"
                    variant="outline"
                    color="neutral"
                    label="Abbrechen"
                    @click="categoryPopoverOpen = null"
                  />
                  <UButton
                    size="xs"
                    label="Speichern"
                    :loading="categoryLoading"
                    @click="saveCategory(row.original)"
                  />
                </div>
              </div>
            </template>
          </UPopover>
          <UBadge
            v-else
            color="neutral"
            variant="subtle"
            :label="row.original.category"
          />
        </template>
        <template #paymentReference-cell="{ row }">
          <span class="text-sm text-dimmed max-w-xs truncate block cursor-pointer" :class="{ 'opacity-40': row.original.excluded }" @click="openDetail(row.original)">{{ row.original.paymentReference || '-' }}</span>
        </template>
        <template #amountEur-cell="{ row }">
          <span
            class="tabular-nums font-medium cursor-pointer"
            :class="[parseFloat(row.original.amountEur) >= 0 ? 'text-green-500' : 'text-red-500', { 'opacity-40': row.original.excluded }]"
            @click="openDetail(row.original)"
          >
            {{ formatCurrency(row.original.amountEur) }}
          </span>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex justify-end">
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
            <UIcon name="i-lucide-receipt" class="size-10 text-dimmed" />
            <p class="text-dimmed">
              Keine Belege vorhanden
            </p>
            <UButton
              variant="outline"
              label="CSV importieren"
              @click="($refs.fileInput as HTMLInputElement).click()"
            />
          </div>
        </template>
      </UTable>
    </div>

    <DeleteConfirmModal
      v-model:open="showDelete"
      title="Beleg löschen"
      :description="`Möchten Sie den Beleg von '${deleteReceipt?.partnerName || 'Unbekannt'}' über ${deleteReceipt ? formatCurrency(deleteReceipt.amountEur) : ''} wirklich löschen?`"
      :loading="deleteLoading"
      @confirm="confirmDelete"
    />

    <CreateReceiptModal
      v-model:open="showCreate"
      @created="refresh"
    />

    <ReceiptDetailModal
      v-model:open="showDetail"
      :receipt="detailReceipt"
      @updated="refresh"
    />
  </div>
</template>
