<script setup lang="ts">
const toast = useToast()
const typeFilter = ref<string>('all')
const refreshing = ref(false)

const { data: sales, refresh } = useLazyFetch<PluginSale[]>('/api/plugin-sales', {
  query: computed(() => typeFilter.value !== 'all' ? { type: typeFilter.value } : {})
})

const typeOptions = [
  { label: 'Alle', value: 'all' },
  { label: 'License', value: 'license' },
  { label: 'Renewal', value: 'renewal' }
]

const columns = [
  { accessorKey: 'pluginName', header: 'Item' },
  { accessorKey: 'renewal', header: 'Type' },
  { accessorKey: 'netAmountEur', header: 'Net Amount' },
  { accessorKey: 'dateSold', header: 'Date' }
]

function formatCurrency(value: string | null) {
  const num = parseFloat(value || '0')
  return num.toLocaleString('de-AT', { style: 'currency', currency: 'EUR' })
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('de-AT')
}

async function refreshSales() {
  refreshing.value = true
  try {
    const result = await $fetch('/api/plugin-sales/refresh', { method: 'POST' })
    toast.add({ title: `${result.synced} Sales synchronisiert`, color: 'success' })
    refresh()
  } catch (e: unknown) {
    toast.add({ title: getErrorMessage(e, 'Fehler beim Synchronisieren'), color: 'error' })
  } finally {
    refreshing.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 p-4">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <USelect
        v-model="typeFilter"
        :items="typeOptions"
        value-key="value"
        placeholder="Type filtern"
        class="w-full sm:w-48"
      />
      <UButton
        icon="i-lucide-refresh-cw"
        label="Refresh"
        :loading="refreshing"
        class="w-full sm:w-auto"
        @click="refreshSales"
      />
    </div>

    <div class="overflow-x-auto">
      <UTable :data="sales || []" :columns="columns" class="w-full">
        <template #pluginName-cell="{ row }">
          <span class="font-medium">{{ row.original.pluginName }}</span>
        </template>
        <template #renewal-cell="{ row }">
          <SaleTypeBadge :renewal="row.original.renewal" />
        </template>
        <template #netAmountEur-cell="{ row }">
          <span class="tabular-nums">{{ formatCurrency(row.original.netAmountEur) }}</span>
        </template>
        <template #dateSold-cell="{ row }">
          {{ formatDate(row.original.dateSold) }}
        </template>
        <template #empty>
          <div class="flex flex-col items-center justify-center py-12 gap-2">
            <UIcon name="i-lucide-shopping-cart" class="size-10 text-dimmed" />
            <p class="text-dimmed">
              Keine Sales vorhanden
            </p>
            <UButton
              variant="outline"
              label="Sales laden"
              :loading="refreshing"
              @click="refreshSales"
            />
          </div>
        </template>
      </UTable>
    </div>
  </div>
</template>
