<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const id = route.params.id as string

const { data: client, refresh } = useLazyFetch(`/api/clients/${id}`)

const showDelete = ref(false)
const deleteLoading = ref(false)
const loading = ref(false)

const schema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  email: z.string().email('Ungültige E-Mail').optional().or(z.literal('')),
  street: z.string().optional(),
  city: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  taxId: z.string().optional(),
  hourlyRate: z.coerce.number().min(0).optional().or(z.literal(''))
})

type Schema = z.infer<typeof schema>

const state = reactive<Schema>({
  name: '',
  email: '',
  street: '',
  city: '',
  zip: '',
  country: 'AT',
  taxId: '',
  hourlyRate: ''
})

watch(() => client.value, (c) => {
  if (c) {
    state.name = c.name
    state.email = c.email || ''
    state.street = c.street || ''
    state.city = c.city || ''
    state.zip = c.zip || ''
    state.country = c.country || 'AT'
    state.taxId = c.taxId || ''
    state.hourlyRate = c.hourlyRate ? parseFloat(c.hourlyRate) : ''
  }
}, { immediate: true })

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    await $fetch(`/api/clients/${id}`, {
      method: 'PUT',
      body: event.data
    })
    toast.add({ title: 'Kunde aktualisiert', color: 'success' })
    refresh()
  } catch (e: unknown) {
    toast.add({ title: getErrorMessage(e, 'Fehler beim Speichern'), color: 'error' })
  } finally {
    loading.value = false
  }
}

async function confirmDelete() {
  deleteLoading.value = true
  try {
    await $fetch(`/api/clients/${id}`, { method: 'DELETE' })
    toast.add({ title: 'Kunde gelöscht', color: 'success' })
    router.push('/clients')
  } catch (e: unknown) {
    toast.add({ title: getErrorMessage(e, 'Fehler beim Löschen'), color: 'error' })
  } finally {
    deleteLoading.value = false
  }
}
</script>

<template>
  <div v-if="client" class="p-4">
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold">
          {{ client.name }}
        </h2>
        <UButton
          icon="i-lucide-trash-2"
          label="Löschen"
          variant="outline"
          color="error"
          size="sm"
          @click="showDelete = true"
        />
      </div>

      <UForm
        :schema="schema"
        :state="state"
        class="flex flex-col gap-6"
        @submit="onSubmit"
      >
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <UFormField label="Name" name="name" required>
            <UInput v-model="state.name" placeholder="Firmenname oder Name" class="w-full" />
          </UFormField>
          <UFormField label="E-Mail" name="email">
            <UInput
              v-model="state.email"
              type="email"
              placeholder="email@beispiel.at"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField label="Straße" name="street">
          <UInput v-model="state.street" class="w-full" />
        </UFormField>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <UFormField label="PLZ" name="zip">
            <UInput v-model="state.zip" class="w-full" />
          </UFormField>
          <UFormField label="Ort" name="city">
            <UInput v-model="state.city" class="w-full" />
          </UFormField>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <UFormField label="Land" name="country">
            <UInput v-model="state.country" class="w-full" />
          </UFormField>
          <UFormField label="UID-Nummer" name="taxId">
            <UInput v-model="state.taxId" placeholder="ATU12345678" class="w-full" />
          </UFormField>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <UFormField label="Stundensatz" name="hourlyRate">
            <UInput
              v-model="state.hourlyRate"
              type="number"
              step="0.01"
              min="0"
              placeholder="z.B. 100.00"
              class="w-full"
            >
              <template #trailing>
                <span class="text-dimmed text-xs">€/h</span>
              </template>
            </UInput>
          </UFormField>
        </div>

        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="outline"
            label="Abbrechen"
            to="/clients"
          />
          <UButton type="submit" label="Speichern" :loading="loading" />
        </div>
      </UForm>

      <DeleteConfirmModal
        v-model:open="showDelete"
        title="Kunde löschen"
        :description="`Möchten Sie den Kunden '${client.name}' wirklich löschen?`"
        :loading="deleteLoading"
        @confirm="confirmDelete"
      />
    </div>
  </div>
</template>
