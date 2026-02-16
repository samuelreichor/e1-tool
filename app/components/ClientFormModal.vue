<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  client?: Client
}>()

const emit = defineEmits<{
  saved: []
}>()

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

const loading = ref(false)
const toast = useToast()

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

const isEditing = computed(() => !!props.client)

watch(() => props.client, (c) => {
  if (c) {
    state.name = c.name
    state.email = c.email || ''
    state.street = c.street || ''
    state.city = c.city || ''
    state.zip = c.zip || ''
    state.country = c.country || 'AT'
    state.taxId = c.taxId || ''
    state.hourlyRate = c.hourlyRate ? parseFloat(c.hourlyRate) : ''
  } else {
    state.name = ''
    state.email = ''
    state.street = ''
    state.city = ''
    state.zip = ''
    state.country = 'AT'
    state.taxId = ''
    state.hourlyRate = ''
  }
}, { immediate: true })

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    if (isEditing.value) {
      await $fetch(`/api/clients/${props.client!.id}`, {
        method: 'PUT',
        body: event.data
      })
      toast.add({ title: 'Kunde aktualisiert', color: 'success' })
    } else {
      await $fetch('/api/clients', {
        method: 'POST',
        body: event.data
      })
      toast.add({ title: 'Kunde erstellt', color: 'success' })
    }
    open.value = false
    emit('saved')
  } catch (e: unknown) {
    toast.add({ title: getErrorMessage(e, 'Fehler beim Speichern'), color: 'error' })
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
          <h3 class="font-semibold">
            {{ isEditing ? 'Kunde bearbeiten' : 'Neuer Kunde' }}
          </h3>
        </template>

        <UForm
          :schema="schema"
          :state="state"
          class="flex flex-col gap-4"
          @submit="onSubmit"
        >
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

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Land" name="country">
              <UInput v-model="state.country" class="w-full" />
            </UFormField>
            <UFormField label="UID-Nummer" name="taxId">
              <UInput v-model="state.taxId" placeholder="ATU12345678" class="w-full" />
            </UFormField>
          </div>

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

          <div class="flex justify-end gap-2 pt-2">
            <UButton
              color="neutral"
              variant="outline"
              label="Abbrechen"
              @click="open = false"
            />
            <UButton type="submit" :label="isEditing ? 'Speichern' : 'Erstellen'" :loading="loading" />
          </div>
        </UForm>
      </UCard>
    </template>
  </UModal>
</template>
