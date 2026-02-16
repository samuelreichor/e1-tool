<script setup lang="ts">
import { sendInvoiceEmailSchema } from '~~/server/utils/validators'
import { emailTemplates, getEmailBody } from '~~/server/utils/email-template'
import type { EmailTemplateKey } from '~~/server/utils/email-template'

const props = defineProps<{
  invoiceId: number
  invoiceNumber: string
  clientEmail: string | null
  companyName: string | null
  issueDate: string | null
}>()

const open = defineModel<boolean>('open', { default: false })
const toast = useToast()
const loading = ref(false)

const emit = defineEmits<{
  sent: []
}>()

const templateOptions = emailTemplates.map(t => ({
  label: t.label,
  value: t.key
}))

const selectedTemplate = ref<EmailTemplateKey>('friendly')
const recipient = ref('')
const subject = ref('')
const body = ref('')

watch(open, (isOpen) => {
  if (isOpen) {
    selectedTemplate.value = 'friendly'
    recipient.value = props.clientEmail || ''
    subject.value = `Rechnung ${props.invoiceNumber}`
    body.value = getBodyForTemplate('friendly')
  }
})

watch(selectedTemplate, (key) => {
  body.value = getBodyForTemplate(key)
})

function getBodyForTemplate(key: EmailTemplateKey) {
  return getEmailBody(key, {
    invoiceNumber: props.invoiceNumber,
    companyName: props.companyName,
    issueDate: props.issueDate
  })
}

async function onSubmit() {
  loading.value = true
  try {
    await $fetch(`/api/invoices/${props.invoiceId}/send`, {
      method: 'POST',
      body: {
        recipient: recipient.value,
        subject: subject.value,
        body: body.value,
        templateKey: selectedTemplate.value
      }
    })
    toast.add({ title: 'Rechnung erfolgreich versendet', color: 'success' })
    open.value = false
    emit('sent')
  } catch (e: unknown) {
    toast.add({ title: getErrorMessage(e, 'Fehler beim Versenden'), color: 'error' })
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
            <UIcon name="i-lucide-send" class="text-primary size-5" />
            <h3 class="font-semibold">
              Rechnung versenden
            </h3>
          </div>
        </template>

        <UForm
          :schema="sendInvoiceEmailSchema"
          :state="{ recipient, subject, body }"
          class="space-y-4"
          @submit="onSubmit"
        >
          <UFormField label="Empfänger" name="recipient">
            <UInput
              v-model="recipient"
              type="email"
              placeholder="email@beispiel.de"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Betreff" name="subject">
            <UInput
              v-model="subject"
              placeholder="Betreff"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Vorlage" name="template">
            <USelect
              v-model="selectedTemplate"
              :items="templateOptions"
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Nachricht" name="body">
            <UTextarea
              v-model="body"
              :rows="8"
              placeholder="Nachricht"
              class="w-full"
            />
          </UFormField>

          <p class="text-sm text-muted">
            Die Rechnung wird automatisch als PDF angehängt.
          </p>

          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="outline"
              label="Abbrechen"
              @click="open = false"
            />
            <UButton
              type="submit"
              icon="i-lucide-send"
              label="Senden"
              :loading="loading"
            />
          </div>
        </UForm>

        <template #footer />
      </UCard>
    </template>
  </UModal>
</template>
