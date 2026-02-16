<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const toast = useToast()
const loading = ref(false)

const schema = z.object({
  companyName: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  taxId: z.string().optional(),
  vatId: z.string().optional(),
  iban: z.string().optional(),
  bic: z.string().optional(),
  bankName: z.string().optional()
})

type Schema = z.infer<typeof schema>

const state = reactive<Schema>({
  companyName: '',
  street: '',
  city: '',
  zip: '',
  country: 'AT',
  email: '',
  phone: '',
  taxId: '',
  vatId: '',
  iban: '',
  bic: '',
  bankName: ''
})

const { data } = useLazyFetch('/api/settings/business')

watch(data, (val) => {
  if (val) {
    Object.assign(state, {
      companyName: val.companyName || '',
      street: val.street || '',
      city: val.city || '',
      zip: val.zip || '',
      country: val.country || 'AT',
      email: val.email || '',
      phone: val.phone || '',
      taxId: val.taxId || '',
      vatId: val.vatId || '',
      iban: val.iban || '',
      bic: val.bic || '',
      bankName: val.bankName || ''
    })
  }
}, { immediate: true })

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    await $fetch('/api/settings/business', {
      method: 'PUT',
      body: event.data
    })
    toast.add({ title: 'Firmendaten gespeichert', color: 'success' })
  } catch (e: unknown) {
    toast.add({ title: getErrorMessage(e, 'Fehler beim Speichern'), color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <h2 class="text-lg font-semibold mb-1">
      Firmendaten
    </h2>
    <p class="text-sm text-muted mb-6">
      Diese Daten werden auf Rechnungen und im PDF-Export verwendet.
    </p>

    <UForm
      :schema="schema"
      :state="state"
      class="flex flex-col gap-4"
      @submit="onSubmit"
    >
      <UFormField label="Firmenname" name="companyName">
        <UInput v-model="state.companyName" class="w-full" />
      </UFormField>

      <UFormField label="Straße" name="street">
        <UInput v-model="state.street" class="w-full" />
      </UFormField>

      <div class="grid grid-cols-2 gap-4">
        <UFormField label="PLZ" name="zip">
          <UInput v-model="state.zip" class="w-full" />
        </UFormField>
        <UFormField label="Ort" name="city">
          <UInput v-model="state.city" class="w-full" />
        </UFormField>
      </div>

      <UFormField label="Land" name="country">
        <UInput v-model="state.country" class="w-full" />
      </UFormField>

      <USeparator />

      <div class="grid grid-cols-2 gap-4">
        <UFormField label="E-Mail" name="email">
          <UInput v-model="state.email" type="email" class="w-full" />
        </UFormField>
        <UFormField label="Telefon" name="phone">
          <UInput v-model="state.phone" class="w-full" />
        </UFormField>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <UFormField label="Steuernummer" name="taxId">
          <UInput v-model="state.taxId" class="w-full" />
        </UFormField>
        <UFormField label="UID-Nummer" name="vatId">
          <UInput v-model="state.vatId" placeholder="ATU12345678" class="w-full" />
        </UFormField>
      </div>

      <USeparator />

      <UFormField label="Bankname" name="bankName">
        <UInput v-model="state.bankName" class="w-full" />
      </UFormField>

      <div class="grid grid-cols-2 gap-4">
        <UFormField label="IBAN" name="iban">
          <UInput v-model="state.iban" class="w-full" />
        </UFormField>
        <UFormField label="BIC" name="bic">
          <UInput v-model="state.bic" class="w-full" />
        </UFormField>
      </div>

      <div class="flex justify-end pt-2">
        <UButton type="submit" label="Speichern" :loading="loading" />
      </div>
    </UForm>
  </div>
</template>
