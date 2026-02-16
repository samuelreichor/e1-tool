<script setup lang="ts">
const props = defineProps<{
  defaultUnitPrice?: number
}>()

const items = defineModel<LineItem[]>('items', { required: true })

function addItem() {
  items.value.push({
    description: '',
    quantity: 1,
    unitPrice: props.defaultUnitPrice || 0,
    vatRate: 20
  })
}

function removeItem(index: number) {
  items.value.splice(index, 1)
}

function lineTotal(item: LineItem) {
  return (item.quantity * item.unitPrice).toFixed(2)
}

function getVatRate(item: LineItem) {
  return String(item.vatRate)
}

function setVatRate(item: LineItem, val: string) {
  item.vatRate = Number(val)
}

const vatRateOptions = [
  { label: '20%', value: '20' },
  { label: '10%', value: '10' },
  { label: '0%', value: '0' }
]
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Desktop grid -->
    <div class="hidden lg:grid grid-cols-[1fr_80px_100px_80px_100px_40px] gap-2 text-sm font-medium text-muted">
      <span>Beschreibung</span>
      <span class="text-right">Menge</span>
      <span class="text-right">Einzelpreis</span>
      <span class="text-right">USt %</span>
      <span class="text-right">Gesamt</span>
      <span />
    </div>

    <div
      v-for="(item, index) in items"
      :key="'desktop-' + index"
      class="hidden lg:grid grid-cols-[1fr_80px_100px_80px_100px_40px] gap-2 items-start"
    >
      <UInput v-model="item.description" placeholder="Beschreibung" size="sm" />
      <UInput
        v-model.number="item.quantity"
        type="number"
        step="0.01"
        min="0"
        size="sm"
        class="text-right"
      />
      <UInput
        v-model.number="item.unitPrice"
        type="number"
        step="0.01"
        min="0"
        size="sm"
        class="text-right"
      />
      <USelect
        :model-value="getVatRate(item)"
        :items="vatRateOptions"
        value-key="value"
        size="sm"
        @update:model-value="setVatRate(item, $event)"
      />
      <div class="flex items-center justify-end h-8 text-sm tabular-nums">
        {{ lineTotal(item) }} €
      </div>
      <UButton
        icon="i-lucide-x"
        variant="ghost"
        color="error"
        size="xs"
        :disabled="items.length <= 1"
        @click="removeItem(index)"
      />
    </div>

    <!-- Mobile card layout -->
    <div
      v-for="(item, index) in items"
      :key="'mobile-' + index"
      class="lg:hidden flex flex-col gap-2 p-3 rounded border border-default"
    >
      <UInput v-model="item.description" placeholder="Beschreibung" size="sm" />
      <div class="grid grid-cols-3 gap-2">
        <UFormField label="Menge" class="text-xs">
          <UInput
            v-model.number="item.quantity"
            type="number"
            step="0.01"
            min="0"
            size="sm"
          />
        </UFormField>
        <UFormField label="Einzelpreis" class="text-xs">
          <UInput
            v-model.number="item.unitPrice"
            type="number"
            step="0.01"
            min="0"
            size="sm"
          />
        </UFormField>
        <UFormField label="USt %" class="text-xs">
          <USelect
            :model-value="getVatRate(item)"
            :items="vatRateOptions"
            value-key="value"
            size="sm"
            @update:model-value="setVatRate(item, $event)"
          />
        </UFormField>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium tabular-nums">{{ lineTotal(item) }} €</span>
        <UButton
          icon="i-lucide-x"
          variant="ghost"
          color="error"
          size="xs"
          :disabled="items.length <= 1"
          @click="removeItem(index)"
        />
      </div>
    </div>

    <UButton
      icon="i-lucide-plus"
      variant="outline"
      label="Position hinzufügen"
      size="sm"
      class="self-start"
      @click="addItem"
    />
  </div>
</template>
